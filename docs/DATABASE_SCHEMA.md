# TrustChain — Database Schema (MongoDB / Mongoose)

MongoDB stores everything that is either mutable, high-volume, or not worth the gas
cost of putting on-chain (scan analytics, descriptions, report images). The blockchain
remains the source of truth for the immutable facts (brand, batch, dates, ownership
chain, recalled status). Each model below notes which fields are **mirrors of on-chain
data** vs **off-chain only**.

---

## 1. Manufacturer

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | auto |
| `name` | String, required | contact person's name |
| `companyName` | String, required | |
| `gstNumber` | String, required, unique | basic format-validated |
| `email` | String, required, unique, lowercase | login identifier |
| `password` | String, required | bcrypt hash, `select: false` |
| `walletAddress` | String, required, unique | checksummed Ethereum address; recorded as `currentOwner` on products this manufacturer registers |
| `walletVerifiedAt` | Date, required | set once, at registration, after a signed-nonce challenge proves this manufacturer controls `walletAddress` (Phase 8) |
| `status` | String, enum: `pending`, `approved`, `rejected`, `deactivated`, default `pending` | admin must approve before login is allowed |
| `phone` | String, optional | |
| `logoUrl` | String, optional | shown on manufacturer's public profile / product page |
| `createdAt` / `updatedAt` | Date | timestamps |

Indexes: `email` (unique), `walletAddress` (unique), `gstNumber` (unique).

---

## 2. Admin

Not explicitly listed in the original spec but required for "Admin Login" — kept
minimal and separate from `Manufacturer` since admins are seeded/invited, not
self-registered.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | auto |
| `name` | String, required | |
| `email` | String, required, unique | |
| `password` | String, required | bcrypt hash, `select: false` |
| `role` | String, enum: `superadmin`, `admin`, default `admin` | reserved for future permission tiers |
| `createdAt` | Date | |

---

## 3. Product

| Field | Type | Source | Notes |
|---|---|---|---|
| `_id` | ObjectId | off-chain | |
| `productId` | String, required, unique (UUID) | off-chain, generated at registration | the **only** value encoded in the QR code |
| `name` | String, required | on-chain | |
| `brand` | String, required | on-chain | |
| `category` | String, required | on-chain | food / medicine / cosmetics / fashion / FMCG / other |
| `batchNo` | String, required | on-chain | |
| `manufacturingDate` | Date, required | on-chain | |
| `expiryDate` | Date, required | on-chain | |
| `factory` | String, required | on-chain | |
| `description` | String, optional | off-chain only | free text, not worth storing on-chain |
| `blockchainHash` | String, required | on-chain | deployed contract address the record lives in |
| `transactionHash` | String, required | on-chain | tx hash from `registerProduct` |
| `currentOwner` | String, required | mirrors on-chain | wallet address; updated on `transferOwnership` |
| `qrCode` | String, required | off-chain | URL/path to generated QR image encoding `{ productId }` |
| `status` | String, enum: `active`, `recalled`, default `active` | mirrors on-chain | set via `recallProduct` |
| `manufacturer` | ObjectId, ref `Manufacturer`, required | off-chain | who registered it |
| `scanCount` | Number, default 0 | off-chain only | incremented on each `/verify/:productId` hit, feeds analytics |
| `createdAt` / `updatedAt` | Date | off-chain | |

Indexes: `productId` (unique), `manufacturer`, `status`.

---

## 4. Ownership

Append-only log mirroring the contract's `OwnershipTransferred` event — kept in Mongo
too so the dashboard can query/paginate history without hitting the RPC node every time.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | auto |
| `productId` | String, required, indexed | references `Product.productId` |
| `from` | String, required | wallet address (or `"GENESIS"` for the initial registration) |
| `to` | String, required | wallet address |
| `transactionHash` | String, required | on-chain proof of this specific transfer |
| `date` | Date, default now | |

---

## 5. CounterfeitReport

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | auto |
| `productId` | String, required, indexed | references `Product.productId`; may reference a productId that doesn't even exist on-chain (that's the point — customer is flagging a suspected fake) |
| `userLocation` | String, optional | free text or `"lat,lng"`, customer-supplied, best-effort |
| `image` | String, optional | uploaded photo URL (multer/local or IPFS) |
| `description` | String, required | what looked wrong |
| `contactEmail` | String, optional | so the manufacturer/admin can follow up |
| `status` | String, enum: `pending`, `reviewed`, `dismissed`, default `pending` | admin triage state |
| `createdAt` | Date | |

Indexes: `productId`, `status`.

---

## 6. ScanEvent

Added in Phase 9 to back the manufacturer dashboard's "Recent Scans" list (the
spec's analytics section asks for it, and `Product.scanCount` alone gives a
total but not a browsable recent history). One row per successful genuine-
product verification.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | auto |
| `productId` | String, required, indexed | references `Product.productId` |
| `scannedAt` | Date, default now | |

No location/IP field: real geolocation would need the *customer's* browser
permission (not the manufacturer's, who's the one viewing this data) or a
paid IP-geo lookup — not worth adding just to populate a wireframe column, so
it's honestly left out rather than faked.

Indexes: `productId`.

---

## Relationships at a glance

```
Manufacturer 1 ──── * Product 1 ──── * Ownership
                          │
                          └──────── * CounterfeitReport
```

## Why this split (on-chain vs off-chain) matters

If a manufacturer's MongoDB row were deleted entirely, the product would *still* verify
as genuine — because `getProduct()` and `getOwnershipHistory()` read from the contract,
not the database. MongoDB is a fast cache + analytics layer over that truth, which is
the entire point of building this on blockchain instead of a plain database.
