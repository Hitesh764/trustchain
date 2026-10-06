const request = require("supertest");
const { ethers } = require("ethers");

// Required transitively by app.js -> product.routes -> product.controller,
// even though these tests never touch a product. The real module eagerly
// constructs an ethers.Wallet at import time and would throw without a
// configured OPERATOR_PRIVATE_KEY.
jest.mock("../services/blockchain.service");

const app = require("../app");
const { createAdminAndLogin, registerManufacturer, registerApproveAndLoginManufacturer } = require("./helpers");

describe("Auth", () => {
  describe("wallet-nonce + registration", () => {
    it("registers with a valid wallet signature", async () => {
      const { res } = await registerManufacturer(app);
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("pending");
    });

    it("rejects registration without a signature", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Jane",
          companyName: "Acme",
          gstNumber: "GST1",
          email: "no-sig@test.local",
          password: "password123",
          walletAddress: "0x1111111111111111111111111111111111111111",
        });
      expect(res.status).toBe(400);
    });

    it("rejects a signature that doesn't match the claimed wallet", async () => {
      const walletA = ethers.Wallet.createRandom();
      const walletB = ethers.Wallet.createRandom();

      const nonceRes = await request(app).get("/api/auth/wallet-nonce").query({ walletAddress: walletA.address });
      const signatureFromA = await walletA.signMessage(nonceRes.body.data.message);

      // claim to be wallet B but present a signature produced by wallet A
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Jane",
          companyName: "Acme",
          gstNumber: "GST2",
          email: "mismatch@test.local",
          password: "password123",
          walletAddress: walletB.address,
          signature: signatureFromA,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no wallet verification was requested/i);
    });

    it("rejects a garbage signature", async () => {
      const wallet = ethers.Wallet.createRandom();
      await request(app).get("/api/auth/wallet-nonce").query({ walletAddress: wallet.address });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Jane",
          companyName: "Acme",
          gstNumber: "GST3",
          email: "garbage@test.local",
          password: "password123",
          walletAddress: wallet.address,
          signature: "0xdeadbeef",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid wallet signature/i);
    });

    it("rejects a duplicate wallet/email/GST", async () => {
      const { payload } = await registerManufacturer(app);
      const dup = await registerManufacturer(app, { email: payload.email });
      expect(dup.res.status).toBe(409);
    });
  });

  describe("manufacturer login", () => {
    it("blocks login before admin approval", async () => {
      const { payload } = await registerManufacturer(app);
      const res = await request(app).post("/api/auth/login").send({ email: payload.email, password: payload.password });
      expect(res.status).toBe(403);
    });

    it("rejects the wrong password", async () => {
      const admin = await createAdminAndLogin(app);
      const mfg = await registerApproveAndLoginManufacturer(app, admin.token);
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: mfg.payload.email, password: "wrong-password" });
      expect(res.status).toBe(401);
    });

    it("logs in successfully once approved and returns a token", async () => {
      const admin = await createAdminAndLogin(app);
      const mfg = await registerApproveAndLoginManufacturer(app, admin.token);
      expect(mfg.token).toBeTruthy();
      expect(mfg.manufacturer.companyName).toBe("Acme Foods");
    });
  });

  describe("admin login", () => {
    it("logs in with correct credentials", async () => {
      const admin = await createAdminAndLogin(app);
      expect(admin.token).toBeTruthy();
    });

    it("rejects an unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({ email: "nobody@test.local", password: "whatever123" });
      expect(res.status).toBe(401);
    });
  });
});
