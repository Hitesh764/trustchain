# TrustChain — Deploying to Sepolia (Phase 5)

This project's blockchain integration was built and verified against a **local
Hardhat node** (see "How this was verified" below) because deploying to real
Sepolia needs credentials only you can provide: an RPC URL and a wallet with real
(free, but real) Sepolia test ETH. Nobody else can generate those on your behalf,
and a private key should never be pasted into a chat or committed to git.

## 1. Get a Sepolia RPC URL

Sign up for a free account with an RPC provider and create a Sepolia endpoint:
- [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) are the
  two most common choices. Either gives you a URL like
  `https://eth-sepolia.g.alchemy.com/v2/<your-key>`.

## 2. Create a dedicated operator wallet

**Do not reuse a wallet that holds real funds.** Create a brand-new MetaMask
wallet (or `ethers.Wallet.createRandom()` in a throwaway script) used *only* as
this project's backend operator. Its address becomes the `owner` of the deployed
contract and the only account allowed to call `registerProduct` /
`transferOwnership` / `recallProduct`.

## 3. Fund it with Sepolia test ETH

Use a public faucet (e.g. the one built into Alchemy's dashboard, or
[sepoliafaucet.com](https://sepoliafaucet.com)) to send a small amount of test
ETH to the operator wallet's address. It only needs enough to pay gas — a few
tenths of an ETH goes a very long way.

## 4. Configure the root `.env` (for Hardhat/deployment)

Create `.env` in the repo root (already gitignored):
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
OPERATOR_PRIVATE_KEY=<operator wallet's private key, no quotes>
```

## 5. Deploy

```bash
npx hardhat compile
npm run deploy:sepolia
```

This prints the deployed contract address. Copy it.

## 6. Configure `server/.env`

Set the same three values there (see `server/.env.example`):
```
SEPOLIA_RPC_URL=<same URL as above>
OPERATOR_PRIVATE_KEY=<same key as above>
CONTRACT_ADDRESS=<address printed by the deploy script>
```

Restart the backend. `server/services/blockchain.service.js` now talks to the
real Sepolia contract instead of anything mocked.

## How this was verified (without real Sepolia credentials)

1. `npx hardhat node` — starts a real, local, Ethereum-compatible chain with 20
   funded test accounts (their private keys are printed on startup and are
   **publicly known dev keys**, safe to use locally, worthless anywhere real).
2. `npm run deploy:localhost` — deploys `TrustChain.sol` to it.
3. `server/.env` pointed at `http://127.0.0.1:8545` with one of those test keys.
4. Full flow driven both via raw HTTP requests and a real browser (Playwright):
   register → admin-approve → login → register a product (real tx, real gas,
   real mined block) → verify it → transfer ownership → recall it → verify a
   fake ID → confirm a second recall is correctly rejected on-chain.

This proves the `ethers.js` integration logic is correct. Swapping
`SEPOLIA_RPC_URL`/`OPERATOR_PRIVATE_KEY`/`CONTRACT_ADDRESS` to real Sepolia
values per the steps above is the only remaining step, and it's one only you
can complete.

### Gotchas found and fixed while verifying this way

These were real bugs, caught by actually stress-testing rapid-fire requests
against a local chain — not theoretical:

- **Nonce collisions.** ethers' `NonceManager` tracks the next nonce with an
  in-memory counter that increments as soon as it's asked, even if that
  particular send fails before broadcasting — one bad call permanently
  desyncs it from the real chain. Fixed by fetching the nonce explicitly
  (`provider.getTransactionCount(address, "pending")`) before every send
  instead of using `NonceManager`.
- **Stale nonce from response caching.** ethers' provider caches identical
  RPC calls (by method + params) for 250ms by default, to dedupe genuinely
  simultaneous requests. That same cache was serving a stale nonce count to
  back-to-back sequential writes. Fixed with `cacheTimeout: -1` on the
  provider.
- **Opaque revert errors under load.** A call expected to revert (e.g.
  recalling an already-recalled product), issued soon after another write,
  could surface as an opaque `"could not coalesce error"` instead of the real
  revert reason — a known ethers v6 rough edge against Hardhat/Anvil-style
  local nodes. Mitigated with `batchMaxCount: 1` (disables request batching)
  plus a narrowly-scoped retry that only fires for that exact error string.

All three are documented inline in `blockchain.service.js` next to the fix.
None of them are expected to matter much against a real, professionally-run
RPC provider like Alchemy or Infura, which don't share Hardhat's instant
auto-mining behavior — but the fixes are safe (and cheap) to keep either way.
