const request = require("supertest");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");
const Admin = require("../models/Admin");

async function createAdminAndLogin(app, overrides = {}) {
  const password = overrides.password || "adminpass123";
  const hashed = await bcrypt.hash(password, 10);
  const admin = await Admin.create({
    name: overrides.name || "Test Admin",
    email: overrides.email || `admin${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.local`,
    password: hashed,
    role: "admin",
  });
  const res = await request(app).post("/api/auth/admin/login").send({ email: admin.email, password });
  return { admin, token: res.body.data.token };
}

// Drives the real wallet-nonce -> sign -> register flow with a genuine
// ethers.Wallet, exactly like the manual Phase 8 verification did.
async function registerManufacturer(app, overrides = {}) {
  const wallet = ethers.Wallet.createRandom();
  const nonceRes = await request(app).get("/api/auth/wallet-nonce").query({ walletAddress: wallet.address });
  const message = nonceRes.body.data.message;
  const signature = await wallet.signMessage(message);

  const payload = {
    name: "Jane Doe",
    companyName: "Acme Foods",
    gstNumber: `GST${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    email: `manufacturer${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.local`,
    password: "password123",
    walletAddress: wallet.address,
    signature,
    ...overrides,
  };

  const res = await request(app).post("/api/auth/register").send(payload);
  return { res, wallet, payload };
}

async function registerApproveAndLoginManufacturer(app, adminToken, overrides = {}) {
  const { res, payload } = await registerManufacturer(app, overrides);
  const manufacturerId = res.body.data.id;

  await request(app)
    .put(`/api/admin/manufacturers/${manufacturerId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: payload.email, password: payload.password });

  return { token: loginRes.body.data.token, manufacturer: loginRes.body.data.manufacturer, payload };
}

module.exports = { createAdminAndLogin, registerManufacturer, registerApproveAndLoginManufacturer };
