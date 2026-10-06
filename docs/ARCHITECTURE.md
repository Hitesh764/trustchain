# TrustChain — System Architecture

## 1. What the system is

TrustChain gives every physical product a digital identity that is written once to an
Ethereum testnet and never modified after. A customer scans a QR code on the packaging
and the app reads the product's record straight from the blockchain (via the backend)
to prove it hasn't been silently altered — that's the property a database alone can't
give you.

## 2. High-level component diagram

```
                         ┌─────────────────────────┐
                         │        MetaMask          │
                         │ (manufacturer/admin login│
                         │  signature, wallet id)   │
                         └────────────┬─────────────┘
                                      │ eth_sign / connect
                                      ▼
┌───────────────┐   HTTPS/REST   ┌─────────────────────┐   ethers.js   ┌───────────────────────┐
│   client/      │◄──────────────►│      server/         │◄─────────────►│  contracts/            │
│  React + Vite  │    JSON/JWT    │  Node.js + Express   │   JSON-RPC    │  TrustChain.sol        │
│                │                │  (MVC: routes/       │               │  (Sepolia testnet)     │
│  - Landing     │                │   controllers/       │               └───────────────────────┘
│  - Manufacturer│                │   services/models)   │
│    Dashboard   │                │                      │        ┌───────────────────────┐
│  - Admin Panel │                │  - Auth (JWT/bcrypt) │◄──────►│      MongoDB           │
│  - Customer    │                │  - Blockchain service│        │  (Manufacturer,        │
│    Scanner     │                │  - QR service        │        │   Product, Ownership,  │
└───────────────┘                │  - IPFS service (opt.)│        │   CounterfeitReport)   │
                                  └──────────┬───────────┘        └───────────────────────┘
                                             │
                                             ▼
                                  ┌───────────────────────┐
                                  │   IPFS (optional)      │
                                  │  product images/docs   │
                                  └───────────────────────┘
```

## 3. Why a single React app, not three separate frontends

The spec lists Admin Panel, Manufacturer Dashboard, and Customer Verification Website as
three modules. They are built as **one React app with role-based routing**, not three
deployables:

- The customer-facing verification page must be public and fast (no auth) — it's just
  routes under `/verify` and `/scan`.
- Manufacturer and Admin routes sit behind a `<ProtectedRoute>` wrapper that checks the
  JWT + role stored in context.
- One app means one design system, one build, and one deployment target — appropriate
  for a college project's scope. If this were a real product, the customer-facing PWA
  would likely be split out for performance/caching reasons, but that's out of scope here.

## 4. Key architecture decision: who signs the blockchain transaction?

This is the most important design decision in the whole system, so it's called out
explicitly before any contract or backend code is written.

**Decision: the backend holds an operator wallet (via a private key in `.env`) and
submits all `registerProduct` / `transferOwnership` / `recallProduct` transactions
itself, using `ethers.js`.** The manufacturer's own MetaMask wallet is used only to:

- Prove wallet ownership once, at registration (connect wallet + sign a nonce —
  "Sign-In with Ethereum" style; see Phase 8 / `docs/api/API_REFERENCE.md`), and
- Be recorded as `currentOwner` / `manufacturerWallet` inside the product record.

**Why not have the manufacturer sign every transaction with MetaMask directly?**
Because the flow diagram in the spec is `Manufacturer → Backend → Smart Contract →
Blockchain`, i.e. the backend is the one calling the contract. Doing it this way also:

- Avoids paying/managing Sepolia test ETH gas across every manufacturer's wallet —
  only the operator wallet needs funding.
- Keeps the manufacturer dashboard's "Register Product" button a simple form submit
  with a loading state, instead of a MetaMask popup + confirmation UX, which is more
  robust for a demo.
- Still preserves the core blockchain guarantee (immutability, public verifiability) —
  the operator wallet is just the *transaction relayer*, not the source of truth.

Trade-off, noted honestly: this means trust is placed in the backend's operator key
custody, similar to how most real-world blockchain apps use a relayer/gas-station
pattern. This is disclosed in the final report as a deliberate, documented simplification
appropriate for a college project (see the project's own "Important Note" that QR
copying etc. are known, accepted limitations).

## 5. Registration flow (detailed)

```
Manufacturer fills Add Product form (client)
   → POST /api/products (JWT-authenticated)
   → server/controllers/product.controller.js
       1. Validate input (express-validator)
       2. Generate productId (uuid)
       3. server/services/blockchain.service.js
            → contract.registerProduct(productId, brand, batchNo, mfgDate, expDate, factory, manufacturerWallet)
            → operator wallet signs + sends tx to Sepolia
            → await receipt → transactionHash, blockNumber
       4. server/services/qr.service.js
            → generate QR encoding ONLY { productId }
       5. Save Product doc in MongoDB:
            { productId, ...formFields, blockchainHash: contractAddress,
              transactionHash, currentOwner: manufacturerWallet, qrCode, status: "active" }
   ← 201 { product, qrCodeUrl }
Manufacturer downloads QR (PNG/SVG/PDF)
```

## 6. Verification flow (detailed)

```
Customer scans QR (html5-qrcode, client-side, no login)
   → decodes { productId }
   → GET /api/verify/:productId
   → server/controllers/verify.controller.js
       1. server/services/blockchain.service.js → contract.getProduct(productId)
       2. If found on-chain:
            → also fetch MongoDB doc (for QR scan analytics, description, etc.)
            → merge on-chain truth (immutable fields, status) with off-chain metadata
            → return 200 { verified: true, product, ownershipHistory, txHash }
       3. If NOT found on-chain (bad/fake productId):
            → return 200 { verified: false }
   ← client renders "✅ Genuine Product" or "❌ Counterfeit Product"
```

Important: **the on-chain record is the source of truth for authenticity.** MongoDB is
used for speed, analytics, search, and storing things that don't belong on-chain
(description text, scan counts, report images) — never as a substitute for the chain
when answering "is this genuine?".

## 7. Backend layering (MVC + services)

```
routes/        → thin, only wire HTTP verb + path to a controller
controllers/   → parse req, call services, shape res — no business logic here
services/      → business logic: blockchain.service.js, qr.service.js, ipfs.service.js
models/        → Mongoose schemas (data shape + validation only)
middleware/    → auth.middleware.js (JWT verify), role.middleware.js, upload.middleware.js, error.middleware.js
```

This separation means the blockchain call (`services/blockchain.service.js`) is
isolated behind one module — Phase 3 (backend) can build against a stub/mock of this
service before Phase 5 (real blockchain integration) wires it to Sepolia.

## 8. Auth architecture

- **Manufacturer/Admin**: email + password (bcrypt hash) → JWT on login, stored in
  `localStorage` on the client, role embedded in JWT claims (`manufacturer` | `admin`).
  Login itself stays password-only — the wallet is never a login credential.
  A manufacturer's wallet address is instead cryptographically proven exactly
  once, at registration: the client requests a one-time nonce
  (`GET /auth/wallet-nonce`), MetaMask signs the returned message
  (`personal_sign`), and the backend recovers the signer via
  `ethers.verifyMessage` and rejects registration if it doesn't match the
  claimed address (`walletAuth.service.js`). This stops someone from typing in
  a wallet address they don't control.
- **Customer**: no auth. Verification and counterfeit reporting are public endpoints,
  rate-limited to discourage abuse.

## 9. Environments & config

`.env` (server): `MONGO_URI`, `JWT_SECRET`, `SEPOLIA_RPC_URL`, `OPERATOR_PRIVATE_KEY`,
`CONTRACT_ADDRESS`, `IPFS_PROJECT_ID`/`IPFS_SECRET` (optional), `PORT`.
`.env` (client): `VITE_API_BASE_URL`, `VITE_CHAIN_ID`, `VITE_BLOCK_EXPLORER_URL`.

## 10. Phase dependency map

Phase 2 (contract) → Phase 3 (backend, using a mocked blockchain service) can start in
parallel with Phase 4 (frontend, using a mocked API) → Phase 5 wires backend to the
real deployed contract → Phase 6/7 add QR generate/scan → Phase 8 hardens auth →
Phase 9 polishes dashboards → Phase 10 testing → Phase 11 deployment → Phase 12 docs.
