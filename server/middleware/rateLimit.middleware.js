const rateLimit = require("express-rate-limit");

// The functional test suite (Phase 10) makes many sequential requests to
// these same routes across dozens of unrelated test cases -- enforcing the
// limit there would produce flaky 429s that have nothing to do with what
// each test is actually checking. Rate limiting itself is covered by a
// dedicated test that builds its own limiter instance instead.
const skipInTests = () => process.env.NODE_ENV === "test";

// Tighter limit for credential/signature-guessing surfaces (login, register,
// wallet-nonce). Keyed by IP, which is enough for a college-project threat
// model without adding session/device tracking.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

// Looser limit for the public verify/report endpoints -- legitimate customers
// scanning products repeatedly shouldn't get blocked, but a scraping bot
// hammering every possible productId should.
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: "Too many requests. Please try again later." },
});

module.exports = { authLimiter, publicLimiter };
