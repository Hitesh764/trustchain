# TrustChain — Automated Testing (Phase 10)

Two independent suites: Solidity contract tests (Hardhat + Chai) and backend
API tests (Jest + Supertest). Both are real automated regression tests, not
the manual `curl`/Playwright verification used throughout earlier phases —
though that manual work is exactly what these suites now encode permanently.

## Smart contract — `npx hardhat test` (repo root)

`test/TrustChain.test.js`, 22 tests covering every function in
`contracts/TrustChain.sol`:

- `registerProduct`: success + event, sets initial owner, seeds genesis
  ownership entry, reverts on duplicate ID / zero address / non-owner caller
- `verifyProduct`: never reverts, correct `(isGenuine, isRecalled)` for
  unknown / active / recalled products
- `getProduct`: reverts on unknown ID, returns the full struct correctly
- `transferOwnership`: updates owner + appends history + event, reverts on
  unknown ID / recalled product / zero address / non-owner caller
- `recallProduct`: sets `recalled` + event, reverts on unknown ID / double
  recall / non-owner caller
- `getOwnershipHistory`: reverts on unknown ID, reflects every transfer in order

Runs against Hardhat's ephemeral in-process chain (not the persistent
`localhost` node from Phase 5) — a fresh contract per test, no external
process needed.

## Backend — `npm test` (in `server/`)

Jest + Supertest against the real Express `app` and a real (but disposable)
`mongodb-memory-server` instance — not a mock of MongoDB, an actual MongoDB
binary running in-memory. 35 tests across 6 files:

| File | Covers |
|---|---|
| `auth.test.js` | wallet-nonce → sign → register (real `ethers.Wallet` signatures, not fakes), rejecting a mismatched/garbage/replayed signature, duplicate registration, login gating on approval status, admin login |
| `product.test.js` | create/list/get/transfer/recall, cross-manufacturer permission checks, QR download in all 3 formats, `/stats` and `/recent-scans` aggregates |
| `verify.test.js` | unknown ID never 500s, genuine product returns full data + increments `scanCount`, recalled status reflected |
| `admin.test.js` | role guard on admin routes, manufacturer approval unblocking login, report triage |
| `report.test.js` | public submission (including for a non-existent productId, by design), required-field validation |
| `rateLimit.test.js` | the limiter itself, in isolation (see below) |

### What's mocked, and why

- **`blockchain.service`** — Jest manual mock (`services/__mocks__/blockchain.service.js`)
  reproducing the same in-memory behavior as the Phase 3 mock, throwing real
  `AppError`s with the same status codes the production `rethrowAsAppError()`
  produces. The real `ethers.js` integration this stands in for was verified
  manually in Phase 5 against an actual local chain (40+ stress-test cycles,
  0 failures) — that's a different concern from "does the controller handle
  a 409 correctly," which is what these tests check.
- **`qr.service`** — also mocked. The real `qrcode`/`pdfkit` generation was
  independently verified in Phase 6 (decoded the output with a separate
  library to confirm exact contents). Leaving it real in this suite added no
  extra coverage, only real disk writes on every test run and ~4s of
  wall-clock time per product-creation test — this repo lives under OneDrive,
  which intercepts new file writes to sync them, adding real latency that has
  nothing to do with the code. Mocking it dropped the full suite from ~82s to
  ~32s.
- **Rate limiting** — `middleware/rateLimit.middleware.js` skips enforcement
  when `NODE_ENV === "test"` (which Jest sets automatically). Without this,
  ~30 sequential requests to `/api/auth/*` across unrelated test cases would
  trip the real 20-req/15-min limit and fail tests that have nothing to do
  with rate limiting. The limiter itself is still tested — `rateLimit.test.js`
  builds an isolated `express-rate-limit` instance with the same shape and
  confirms it returns 429 after its limit, independent of the shared app.

### What's real, deliberately

MongoDB (in-memory, but a real MongoDB), password hashing (`bcrypt`, real
cost factor), JWT signing/verification, wallet signature verification
(`ethers.verifyMessage` against a genuine `ethers.Wallet` signature — same
trust boundary as the Phase 8 MetaMask-simulation testing), all Express
routing/validation/permission-check middleware, and all Mongoose
schema/query logic.

## Running both

```bash
# Smart contract
npx hardhat test

# Backend
cd server && npm test
```

## Not covered here

- Frontend component tests — the frontend was instead verified through real
  browser automation (Playwright) in Phases 4, 6, 7, 8, and 9, driving actual
  user flows end-to-end rather than isolated component snapshots. Adding a
  parallel component-test layer on top wasn't judged to add proportionate
  value for this project's scope.
- Load/performance testing — out of scope for a college project.
