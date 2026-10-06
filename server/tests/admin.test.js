const request = require("supertest");

jest.mock("../services/blockchain.service"); // see auth.test.js for why

const app = require("../app");
const { createAdminAndLogin, registerManufacturer, registerApproveAndLoginManufacturer } = require("./helpers");

describe("Admin", () => {
  it("rejects unauthenticated access to admin routes", async () => {
    const res = await request(app).get("/api/admin/manufacturers");
    expect(res.status).toBe(401);
  });

  it("rejects a manufacturer (wrong role) from hitting an admin-only route", async () => {
    const admin = await createAdminAndLogin(app);
    const mfg = await registerApproveAndLoginManufacturer(app, admin.token);

    const res = await request(app)
      .get("/api/admin/manufacturers")
      .set("Authorization", `Bearer ${mfg.token}`);
    expect(res.status).toBe(403);
  });

  it("lists manufacturers filtered by status", async () => {
    const admin = await createAdminAndLogin(app);
    await registerManufacturer(app);
    await registerManufacturer(app);

    const pending = await request(app)
      .get("/api/admin/manufacturers?status=pending")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.count).toBe(2);

    const approved = await request(app)
      .get("/api/admin/manufacturers?status=approved")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(approved.body.data.count).toBe(0);
  });

  it("approves a manufacturer, unblocking their login", async () => {
    const admin = await createAdminAndLogin(app);
    const { res, payload } = await registerManufacturer(app);

    const approve = await request(app)
      .put(`/api/admin/manufacturers/${res.body.data.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.manufacturer.status).toBe("approved");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(200);
  });

  it("rejects an invalid status value", async () => {
    const admin = await createAdminAndLogin(app);
    const { res } = await registerManufacturer(app);

    const update = await request(app)
      .put(`/api/admin/manufacturers/${res.body.data.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "not-a-real-status" });
    expect(update.status).toBe(400);
  });

  it("triages counterfeit reports", async () => {
    const admin = await createAdminAndLogin(app);

    const fd = { productId: "some-product-id", description: "Looked fake" };
    const reportRes = await request(app).post("/api/reports").field(fd);
    expect(reportRes.status).toBe(201);

    const list = await request(app)
      .get("/api/admin/reports?status=pending")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.data.count).toBe(1);

    const update = await request(app)
      .put(`/api/admin/reports/${list.body.data.reports[0]._id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "reviewed" });
    expect(update.status).toBe(200);
    expect(update.body.data.report.status).toBe("reviewed");
  });
});
