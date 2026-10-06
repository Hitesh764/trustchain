const request = require("supertest");

jest.mock("../services/blockchain.service"); // see auth.test.js for why

const app = require("../app");

describe("Counterfeit reports", () => {
  it("accepts a report for a productId that doesn't exist on-chain", async () => {
    const res = await request(app)
      .post("/api/reports")
      .field("productId", "totally-made-up-id")
      .field("description", "Barcode looked smudged and off-center");

    expect(res.status).toBe(201);
    expect(res.body.data.report.status).toBe("pending");
    expect(res.body.data.report.productId).toBe("totally-made-up-id");
  });

  it("rejects a missing description", async () => {
    const res = await request(app).post("/api/reports").field("productId", "some-id");
    expect(res.status).toBe(400);
  });

  it("rejects a missing productId", async () => {
    const res = await request(app).post("/api/reports").field("description", "Something looked off");
    expect(res.status).toBe(400);
  });

  it("accepts an optional contactEmail and location", async () => {
    const res = await request(app)
      .post("/api/reports")
      .field("productId", "id-2")
      .field("description", "Fake packaging")
      .field("userLocation", "Mumbai, India")
      .field("contactEmail", "reporter@test.local");

    expect(res.status).toBe(201);
    expect(res.body.data.report.contactEmail).toBe("reporter@test.local");
    expect(res.body.data.report.userLocation).toBe("Mumbai, India");
  });
});
