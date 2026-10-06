# TrustChain — REST API Reference

Base URL (dev): `http://localhost:5000/api`
All responses share the envelope `{ success: boolean, data?, message?, errors? }`.
Protected routes require `Authorization: Bearer <token>` (JWT from login).

> Blockchain calls go through `server/services/blockchain.service.js`, which now
> makes real `ethers.js` calls against the deployed `TrustChain` contract (Phase 5)
> instead of the in-memory mock used in Phases 3/4. See
> [../DEPLOYMENT.md](../DEPLOYMENT.md) for pointing it at real Sepolia vs. a local
> Hardhat node.

## Auth

All auth routes are rate-limited (20 requests / 15 min / IP, Phase 8).

### `GET /auth/wallet-nonce?walletAddress=0x...`
Public. Returns a one-time message to sign with the wallet
(`{ message }`), valid for 5 minutes. Call this before `POST /auth/register`.

### `POST /auth/register`
Manufacturer self-registration. Account starts `pending` — cannot log in until an
admin approves it. Requires proof the registrant controls `walletAddress`: get a
challenge from `wallet-nonce`, have the wallet sign it (`personal_sign` in
MetaMask), and submit the resulting `signature`. The backend recovers the signer
via `ethers.verifyMessage` and rejects the request if it doesn't match
`walletAddress` (Phase 8 — see `server/services/walletAuth.service.js`).

Body: `{ name, companyName, gstNumber, email, password, walletAddress, signature, phone? }`
201 → `{ id, companyName, email, status: "pending" }`
400 if the signature is missing, invalid, expired (>5 min old), or for a
different wallet than the one that requested the nonce.

### `POST /auth/login`
Body: `{ email, password }`
200 → `{ token, manufacturer: { id, name, companyName, email, walletAddress } }`
403 if status isn't `approved` yet.

### `POST /auth/admin/login`
Body: `{ email, password }` → 200 → `{ token, admin: { id, name, email, role } }`
No self-registration for admins — seeded directly in the database.

## Products (all require auth)

### `POST /products` — manufacturer only
Body: `{ name, brand, category, batchNo, manufacturingDate, expiryDate, factory, description? }`
- Generates `productId` (UUID) server-side.
- Calls `blockchain.service.registerProductOnChain(...)`.
- Generates a QR (PNG, saved under `server/uploads/qrcodes/<productId>.png`) encoding
  **only** `productId` — see `docs/ARCHITECTURE.md`'s QR data rule.
- Saves the Mongo `Product` doc with the returned `transactionHash`/`blockchainHash`
  and the QR's public path.
- 201 → `{ product }`, with `product.qrCode` set to `/uploads/qrcodes/<productId>.png`.

### `GET /products` — manufacturer (own only) or admin (all)
Query: `?search=&status=active|recalled&category=`
200 → `{ products: [...], count }`

### `GET /products/stats` — manufacturer only (Phase 9)
Aggregate dashboard/analytics numbers for the logged-in manufacturer's own products.
200 → `{ productsRegistered, active, recalled, totalScans, counterfeitReports, ownershipTransfers, byCategory }`
`counterfeitReports`/`ownershipTransfers` count `CounterfeitReport`/`Ownership` docs
whose `productId` belongs to this manufacturer — not scoped to any one product.

> Registered before `/:productId` in the router — otherwise Express would read
> `stats` as a literal productId value instead of matching this route.

### `GET /products/recent-scans` — manufacturer only (Phase 9)
Last 10 genuine-product verifications across this manufacturer's products, newest
first, backed by the `ScanEvent` collection.
200 → `{ scans: [{ productId, name, batchNo, scannedAt }, ...] }`

### `GET /products/:productId/qr?format=png|svg|pdf` — manufacturer (own) or admin
Streams the QR as an attachment (`Content-Disposition: attachment`). `png` serves the
file generated at registration; `svg`/`pdf` are generated on demand from the same
`productId`. Defaults to `png` if `format` is omitted.

### `GET /products/:productId` — manufacturer (own only) or admin
200 → `{ product }` · 403 if a manufacturer requests another manufacturer's product · 404 if unknown

### `PUT /products/ownership` — manufacturer, must currently own the product
Body: `{ productId, newOwnerWallet }`
- Calls `transferOwnershipOnChain`, updates `currentOwner`, appends an `Ownership` doc.
- 200 → `{ product }`

### `PUT /products/recall` — manufacturer, must currently own the product
Body: `{ productId }` → sets `status: "recalled"` → 200 → `{ product }`

## Verification (public, no auth)

Rate-limited (100 requests / 15 min / IP, Phase 8) — loose enough for a customer
scanning several products, tight enough to blunt a scraper enumerating IDs.

### `GET /verify/:productId`
- Calls `verifyProductOnChain` first — **never throws** on an unknown ID.
- Not found → 200 `{ verified: false }`
- Found → 200 `{ verified: true, recalled, product, ownershipHistory }` and increments
  that product's `scanCount` in MongoDB.

This is the endpoint the QR scanner (Phase 7) and the `/verify/:productId` page
(Phase 4) both call.

## Admin (all require admin auth)

### `GET /admin/manufacturers?status=pending`
200 → `{ manufacturers, count }`

### `PUT /admin/manufacturers/:id/status`
Body: `{ status: "pending"|"approved"|"rejected"|"deactivated" }` → 200 → `{ manufacturer }`

### `GET /admin/reports?status=pending`
200 → `{ reports, count }`

### `PUT /admin/reports/:id/status`
Body: `{ status: "pending"|"reviewed"|"dismissed" }` → 200 → `{ report }`

## Reports (public, no auth)

### `POST /reports`
`multipart/form-data`: `productId`, `description`, `userLocation?`, `contactEmail?`, `image?` (file)
201 → `{ report }`
Accepts a `productId` that doesn't exist on-chain — flagging a suspected fake is
exactly what this endpoint is for.

## Error shape

```json
{ "success": false, "message": "..." }
```
or, for validation failures:
```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "..." }] }
```

## Verified working

Phase 3 (no live MongoDB required): health check, 401 on missing auth, 400 on
invalid registration body, 404 on unknown routes.

Phase 5 (full stack — real MongoDB + a real local Ethereum node + a real browser):
register → admin-approve → login → register a product (real transaction, real
gas, real mined block) → verify it → transfer ownership → recall it → verify a
fake ID → confirm a second recall is correctly rejected on-chain with a 409.
Stress-tested at 20+ back-to-back cycles with zero failures after fixing the
nonce-handling bugs documented in [../DEPLOYMENT.md](../DEPLOYMENT.md).

Phase 10 turned this manual verification into 35 automated Jest/Supertest
tests covering every endpoint above — see [../TESTING.md](../TESTING.md).
