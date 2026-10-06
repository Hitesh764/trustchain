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

describe("Products", () => {
  let adminToken, manufacturerToken, manufacturer;

  beforeEach(async () => {
    const admin = await createAdminAndLogin(app);
    adminToken = admin.token;
    const mfg = await registerApproveAndLoginManufacturer(app, adminToken);
    manufacturerToken = mfg.token;
    manufacturer = mfg.manufacturer;
  });

  it("creates a product and generates a QR", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);

    expect(res.status).toBe(201);
    expect(res.body.data.product.qrCode).toMatch(/^\/uploads\/qrcodes\/.+\.png$/);
    expect(res.body.data.product.currentOwner).toBe(manufacturer.walletAddress.toLowerCase());
    expect(res.body.data.product.status).toBe("active");
  });

  it("rejects product creation without auth", async () => {
    const res = await request(app).post("/api/products").send(sampleProduct);
    expect(res.status).toBe(401);
  });

  it("rejects an invalid category", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send({ ...sampleProduct, category: "not-a-real-category" });
    expect(res.status).toBe(400);
  });

  it("lists only the manufacturer's own products", async () => {
    await request(app).post("/api/products").set("Authorization", `Bearer ${manufacturerToken}`).send(sampleProduct);

    const other = await registerApproveAndLoginManufacturer(app, adminToken);
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ ...sampleProduct, batchNo: "OTHER1" });

    const res = await request(app).get("/api/products").set("Authorization", `Bearer ${manufacturerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.products[0].batchNo).toBe("A1");
  });

  it("admin sees all products across manufacturers", async () => {
    await request(app).post("/api/products").set("Authorization", `Bearer ${manufacturerToken}`).send(sampleProduct);
    const res = await request(app).get("/api/products").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
  });

  it("blocks another manufacturer from viewing, transferring, or recalling this product", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    const other = await registerApproveAndLoginManufacturer(app, adminToken);

    const getRes = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(getRes.status).toBe(403);

    const recallRes = await request(app)
      .put("/api/products/recall")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ productId });
    expect(recallRes.status).toBe(403);

    const transferRes = await request(app)
      .put("/api/products/ownership")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ productId, newOwnerWallet: "0x9999999999999999999999999999999999999999" });
    expect(transferRes.status).toBe(403);
  });

  it("transfers ownership and updates currentOwner", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;
    const newOwner = "0x9999999999999999999999999999999999999999";

    const res = await request(app)
      .put("/api/products/ownership")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send({ productId, newOwnerWallet: newOwner });

    expect(res.status).toBe(200);
    expect(res.body.data.product.currentOwner).toBe(newOwner.toLowerCase());
  });

  it("recalls a product and rejects a second recall with 409", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    const recall1 = await request(app)
      .put("/api/products/recall")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send({ productId });
    expect(recall1.status).toBe(200);
    expect(recall1.body.data.product.status).toBe("recalled");

    const recall2 = await request(app)
      .put("/api/products/recall")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send({ productId });
    expect(recall2.status).toBe(409);
  });

  it("downloads the QR in png, svg, and pdf formats", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    const png = await request(app)
      .get(`/api/products/${productId}/qr?format=png`)
      .set("Authorization", `Bearer ${manufacturerToken}`);
    expect(png.status).toBe(200);
    expect(png.headers["content-type"]).toBe("image/png");

    const svg = await request(app)
      .get(`/api/products/${productId}/qr?format=svg`)
      .set("Authorization", `Bearer ${manufacturerToken}`);
    expect(svg.status).toBe(200);
    expect(svg.headers["content-type"]).toMatch(/svg/);

    const pdf = await request(app)
      .get(`/api/products/${productId}/qr?format=pdf`)
      .set("Authorization", `Bearer ${manufacturerToken}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
  });

  it("computes /products/stats correctly", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    await request(app).get(`/api/verify/${productId}`);
    await request(app).get(`/api/verify/${productId}`);

    const stats = await request(app).get("/api/products/stats").set("Authorization", `Bearer ${manufacturerToken}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.productsRegistered).toBe(1);
    expect(stats.body.data.active).toBe(1);
    expect(stats.body.data.totalScans).toBe(2);
    expect(stats.body.data.counterfeitReports).toBe(0);
    expect(stats.body.data.ownershipTransfers).toBe(0);
  });

  it("lists recent scans newest first", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${manufacturerToken}`)
      .send(sampleProduct);
    const productId = created.body.data.product.productId;

    await request(app).get(`/api/verify/${productId}`);

    const scans = await request(app)
      .get("/api/products/recent-scans")
      .set("Authorization", `Bearer ${manufacturerToken}`);
    expect(scans.status).toBe(200);
    expect(scans.body.data.scans).toHaveLength(1);
    expect(scans.body.data.scans[0].productId).toBe(productId);
  });
});
