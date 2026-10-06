const express = require("express");
const request = require("supertest");
const rateLimit = require("express-rate-limit");

// The app-wide limiters skip enforcement under NODE_ENV=test (see
// rateLimit.middleware.js) so the rest of the suite isn't flaky. This test
// builds an isolated limiter with the same shape to prove the mechanism
// itself -- not app.js's wiring of it -- actually blocks after the limit.
describe("Rate limiting", () => {
  it("returns 429 after exceeding the configured limit", async () => {
    const app = express();
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many attempts. Please try again later." },
      })
    );
    app.get("/", (req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get("/");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too many attempts/i);
  });
});
