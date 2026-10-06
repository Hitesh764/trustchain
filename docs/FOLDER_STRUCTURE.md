# TrustChain — Folder Structure

Reflects the actual, final repo layout after all 12 phases.

```
blockchain/
├── client/                          # React + Vite frontend (single app, role-based routing)
│   ├── public/                      # static assets served as-is; _redirects (Netlify SPA fallback)
│   ├── vercel.json                  # SPA rewrite for Vercel hosting
│   └── src/
│       ├── assets/                  # (currently empty — no custom images/logos were needed)
│       ├── components/
│       │   ├── common/              # Button, Card, Input, Select, Badge, Modal, StatCard,
│       │   │                        #   LoadingSkeleton, EmptyState, QrDownloadModal
│       │   └── layout/              # Navbar, Footer, PublicLayout, DashboardShell,
│       │                            #   ProtectedRoute, ThemeToggle
│       ├── pages/
│       │   ├── admin/               # AdminLogin, AdminDashboard, ManufacturerList,
│       │   │                        #   AllProducts, CounterfeitReports
│       │   ├── manufacturer/        # Login, Register, Dashboard, AddProduct, ProductList, Analytics
│       │   └── customer/            # Landing, About, Scanner, VerifyResult, NotFound
│       ├── context/                 # AuthContext, ThemeContext, ToastContext
│       ├── hooks/                   # useAuth, useTheme, useToast
│       ├── services/                # api.js (axios instance) + auth/product/verify/admin/report .api.js
│       ├── utils/                   # format.js (dates/addresses), wallet.js (MetaMask wrapper)
│       ├── App.jsx                  # route table (React.lazy per page for code splitting)
│       ├── main.jsx                 # provider tree + ReactDOM root
│       └── index.css                # Tailwind + the glassmorphism design-system layer
│
├── server/                           # Node.js + Express REST API (MVC)
│   ├── config/db.js                 # Mongo connect
│   ├── controllers/                 # auth, product, verify, admin, report
│   ├── models/                      # Manufacturer, Admin, Product, Ownership, CounterfeitReport, ScanEvent
│   ├── routes/                      # one file per resource, mirrors controllers/
│   ├── middleware/                  # auth, role, validate, error, upload (multer), rateLimit
│   ├── services/
│   │   ├── blockchain.service.js    # real ethers.js integration (Phase 5)
│   │   ├── qr.service.js            # QR PNG/SVG/PDF generation (Phase 6)
│   │   ├── walletAuth.service.js    # nonce challenge + signature verification (Phase 8)
│   │   └── __mocks__/               # Jest manual mocks of the two services above (Phase 10)
│   ├── utils/                       # AppError, asyncHandler, generateToken
│   ├── tests/                       # Jest + Supertest suite (35 tests) + shared setup/helpers
│   ├── uploads/qrcodes/             # generated QR PNGs (gitignored, regenerated on demand)
│   ├── app.js                       # Express app (exported, no listen()) — what tests import
│   └── server.js                    # loads .env, connects Mongo, starts listening
│
├── contracts/
│   ├── TrustChain.sol                # the smart contract
│   └── interfaces/                   # (currently empty — no separate interface was needed)
│
├── test/
│   └── TrustChain.test.js            # Hardhat + Chai contract test suite (22 tests)
│
├── scripts/
│   └── deploy.js                     # Hardhat deploy script (localhost + sepolia)
│
├── artifacts/                        # Hardhat build output (ABI + bytecode) — generated, gitignored
│
├── docs/
│   ├── PROJECT_REPORT.md             # the full academic-style report
│   ├── ARCHITECTURE.md
│   ├── FOLDER_STRUCTURE.md           # this file
│   ├── DATABASE_SCHEMA.md
│   ├── FRONTEND.md
│   ├── DEPLOYMENT.md                 # Sepolia smart-contract deployment
│   ├── HOSTING.md                    # application hosting (Vercel/Render/Atlas)
│   ├── TESTING.md
│   ├── api/API_REFERENCE.md
│   ├── smart-contract/TrustChain.md
│   ├── screenshots/                  # real screenshots from the running app, used in the report
│   └── wireframes/                   # (empty — the actual wireframes are a separately-hosted artifact)
│
├── render.yaml                       # Render Blueprint for backend hosting
├── hardhat.config.js
├── package.json                      # root: Hardhat/contract tooling
├── .gitignore
└── README.md
```

## Naming conventions

- React components: `PascalCase.jsx` (e.g. `ProductCard.jsx`).
- Hooks: `camelCase` prefixed with `use` (e.g. `useAuth.js`).
- Backend files: `<name>.<layer>.js` (e.g. `product.controller.js`, `product.routes.js`)
  so the layer is obvious from the filename alone, without opening it.
- Mongoose models: singular `PascalCase` export, filename matches (`Product.js`).
- Jest manual mocks live in `__mocks__/` next to the module they replace —
  Jest's own convention, picked up automatically by `jest.mock("../services/x")`.
