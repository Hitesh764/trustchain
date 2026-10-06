# TrustChain — Frontend (Phase 4)

React 18 + Vite + Tailwind CSS, one SPA with role-based routing (see
[ARCHITECTURE.md §3](ARCHITECTURE.md#3-why-a-single-react-app-not-three-separate-frontends)
for why it's one app instead of three).

## Structure

```
client/src/
├── components/
│   ├── common/     Button, Card, Input, Select, Badge, Modal, StatCard,
│   │                LoadingSkeleton, EmptyState, QrDownloadModal
│   └── layout/      Navbar, Footer, PublicLayout, DashboardShell,
│                     ProtectedRoute, ThemeToggle
├── context/         AuthContext, ThemeContext, ToastContext
├── hooks/           useAuth, useTheme, useToast
├── services/        api.js (axios instance) + one file per resource
├── pages/
│   ├── customer/     Landing, About, Scanner, VerifyResult, NotFound
│   ├── manufacturer/ Login, Register, Dashboard, AddProduct, ProductList, Analytics
│   └── admin/        AdminLogin, AdminDashboard, ManufacturerList, AllProducts, CounterfeitReports
├── utils/format.js  formatDate, truncateAddress, truncateHash
└── App.jsx          route table
```

## Design system

Tailwind theme (`tailwind.config.js`) defines `brand` (blue), `success` (green), and
`danger` (red) scales — matching the brief's blue/white/green palette. Glassmorphism
is a handful of reusable `@layer components` classes in `index.css`
(`.glass-card`, `.btn-*`, `.field-*`, `.badge-*`, `.skeleton`), not repeated inline
utility soup. Dark mode is `class`-based, toggled by `ThemeContext` and persisted to
`localStorage`, independent of the OS preference on first load only.

## Auth

`AuthContext` holds `{ token, role, user }` in `localStorage` under
`trustchain-auth`. `services/api.js`'s request interceptor reads it and attaches
`Authorization: Bearer <token>` to every call — no per-call plumbing needed.
`ProtectedRoute` redirects to the right login page (`/login` vs `/admin/login`)
based on which `allowedRole` a route requires, and bounces a logged-in user with
the wrong role back to `/`.

## What's deliberately stubbed here, and where it's finished

- **QR codes** are real (Phase 6): generated server-side at registration
  (`qrcode` + `pdfkit`), rendered in `QrDownloadModal` and the Add Product
  success screen, downloadable as PNG/SVG/PDF via `services/product.api.js`'s
  `downloadQr()` (blob fetch + programmatic `<a download>`, since the endpoint
  needs the JWT header a plain `<a href>` can't send).
- **Camera scanning** is real (Phase 7): `Scanner` uses `html5-qrcode`'s
  imperative `Html5Qrcode` API behind a "Start Camera" button (camera access is
  opt-in, not requested on page load), decodes a QR, and routes straight to
  `/verify/:productId`. The manual Product ID field remains as a fallback for
  when camera access isn't available or granted.
- **MetaMask wallet connect** is real (Phase 8), on Register only — Login
  intentionally stays password-only (see `docs/ARCHITECTURE.md` §8). Clicking
  "Connect Wallet" calls `eth_requestAccounts`, fetches a one-time nonce from
  `GET /auth/wallet-nonce`, has MetaMask `personal_sign` it, and only then
  shows the wallet as "Verified" — the submit button stays disabled until
  that happens, so a wallet address can no longer just be typed into a form.
  `utils/wallet.js` wraps `window.ethereum` and surfaces a clear message if
  MetaMask isn't installed.
- **Charts** (Analytics page) are real, working, self-drawn bar/status charts (no
  charting library dependency) built from live `/products` data — not a stub.

## Verified end-to-end (Phase 4)

Both the Express API and Vite dev server were run against a real local MongoDB
instance and driven with a headless-Chromium (Playwright) script:
register manufacturer → admin login → approve manufacturer → manufacturer login →
register a product → verify it by ID (genuine case) → verify an unknown ID
(counterfeit case) → browse the manufacturer dashboard, product list, and analytics
→ browse the admin dashboard and manufacturer list → 404 page → dark mode toggle.
No console errors were thrown on any page. Screenshots were inspected, not just
captured. Test data was removed from MongoDB afterward.

**Phase 6 addition:** the generated QR was independently decoded (a separate
`jsqr`/`pngjs` script, not the code that generated it) to confirm it contains
*exactly* the `productId` string and nothing else, then downloaded through a
real browser click (Playwright's `download` event) in all three formats.

**Phase 7 addition:** headless Chromium has no real webcam, so `--use-fake-
device-for-media-stream` + `--use-file-for-fake-video-capture=<file>.y4m` was
used to feed Chromium's fake camera a synthesized video frame containing an
actual QR image (composited and YUV420-encoded from scratch, no ffmpeg
available in this environment). This exercises the *real* code path — camera
permission grant, `Html5Qrcode.start()`, frame-by-frame decode, the `onScanSuccess`
callback, and the router navigation — not a mocked stand-in for it. It caught
a real bug: the reader `<div>` was `display:none` while `cameraState` was
`"starting"`, so `html5-qrcode` sized its internal canvas against a hidden
(zero-dimension) container and silently never decoded anything. Fixed by
keeping the container in normal flow at all times and layering the idle/error
placeholder on top instead. After the fix: scanning a made-up ID correctly
lands on the Counterfeit Product screen, and scanning a real, on-chain
registered product's actual QR correctly lands on Genuine Product.

**Phase 8 addition:** rather than fake MetaMask entirely, Playwright's
`page.exposeFunction` bridged `window.ethereum.request` calls back to a real
`ethers.Wallet` in the Node test process — the private key never entered
browser JS, and `personal_sign` produced a genuine ECDSA signature over the
real nonce challenge fetched from the backend, matching the actual trust
boundary a real MetaMask extension has. Confirmed: a valid signature registers
successfully and shows "Verified" in the UI; a signature from one wallet
can't be replayed to claim a different wallet address (400); a garbage
signature is rejected (400); registering the same wallet twice is blocked
(409, since verified wallets are unique).

**Phase 9 addition:** re-read the original spec's analytics list against what
Phase 4 had actually built and found two gaps — `Counterfeit Reports` and
`Ownership Transfers` were never surfaced on the manufacturer dashboard, and
`Recent Scans` only existed as a running counter (`Product.scanCount`), not a
browsable list the wireframe had promised. Added a `ScanEvent` log (one row
per genuine verification, deliberately with no location field — real
geolocation would need the *customer's* browser permission, not the
manufacturer's, and faking it wasn't an option) and a `GET /products/stats`
aggregate endpoint, then rebuilt `Dashboard.jsx`'s table around real scan
events instead of "recently registered products" and added the two missing
numbers to both Dashboard and Analytics. Verified against seeded data through
both the raw API (`stats` and `recent-scans` responses checked against hand
counts) and the real browser (dashboard/analytics screenshots), with the
displayed numbers matching exactly: 2 products, 3 scans, 1 report, 1 transfer.
