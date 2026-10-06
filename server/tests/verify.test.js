const request = require("supertest");
const app = require("../app");
const { createAdminAndLogin, registerApproveAndLoginManufacturer } = require("./helpers");

jest.mock("../services/blockchain.service");
jest.mock("../services/qr.service");

const sampleProduct = {
  name: "Amul Butter",
  brand: "Amul",
  category: "food",
  batchNo: "A1",
  manufacturingDate: "2026-01-01",
  expiryDate: "2027-01-01",
  factory: "Anand",
};

describe("Verification", () => {
  it("returns verified:false for an unknown productId, never a 500", async () => {
    const res = await request(app).get("/api/verify/this-id-does-not-exist");
    expect(res.status).toBe(200);
    expect(res.body.data.verified).toBe(false);
  });

  it("returns verified:true with product + ownership history for a real product, and increments scanCount", async () => {
    const admin = await createAdminAndLogin(app);
    const mfg = await registerApproveAndLoginManufacturer(app, admin.token);

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${mfg.token}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    const first = await request(app).get(`/api/verify/${productId}`);
    expect(first.status).toBe(200);
    expect(first.body.data.verified).toBe(true);
    expect(first.body.data.recalled).toBe(false);
    expect(first.body.data.expired).toBe(false);
    expect(first.body.data.product.name).toBe(sampleProduct.name);
    expect(first.body.data.ownershipHistory).toHaveLength(1);

    const second = await request(app).get(`/api/verify/${productId}`);
    expect(second.status).toBe(200);

    const stats = await request(app).get("/api/products/stats").set("Authorization", `Bearer ${mfg.token}`);
    expect(stats.body.data.totalScans).toBe(2);
  });

  it("reflects recalled status after a recall", async () => {
    const admin = await createAdminAndLogin(app);
    const mfg = await registerApproveAndLoginManufacturer(app, admin.token);

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${mfg.token}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    await request(app).put("/api/products/recall").set("Authorization", `Bearer ${mfg.token}`).send({ productId });

    const res = await request(app).get(`/api/verify/${productId}`);
    expect(res.body.data.recalled).toBe(true);
  });
  it("flags a product as expired once its expiry date has passed", async () => {
    const admin = await createAdminAndLogin(app);
    const mfg = await registerApproveAndLoginManufacturer(app, admin.token);

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${mfg.token}`)
      .send({ ...sampleProduct, manufacturingDate: "2020-01-01", expiryDate: "2020-06-01" });
    const productId = created.body.data.product.productId;

    const res = await request(app).get(`/api/verify/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.verified).toBe(true);
    expect(res.body.data.expired).toBe(true);
  });

  it("does not flag a product as expired on its expiry day itself", async () => {
    const admin = await createAdminAndLogin(app);
    const mfg = await registerApproveAndLoginManufacturer(app, admin.token);

    const today = new Date().toISOString().slice(0, 10);
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${mfg.token}`)
      .send({ ...sampleProduct, manufacturingDate: "2020-01-01", expiryDate: today });
    const productId = created.body.data.product.productId;

    const res = await request(app).get(`/api/verify/${productId}`);
    expect(res.body.data.expired).toBe(false);
  });
});
