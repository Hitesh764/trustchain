# TrustChain.sol — Smart Contract Reference

File: [`contracts/TrustChain.sol`](../../contracts/TrustChain.sol)
Solidity: `^0.8.24`, compiled with the optimizer (200 runs) and `viaIR: true`.

> `viaIR` is required, not optional: `registerProduct` takes 9 parameters and builds
> a 13-field struct in one statement, which trips Solidity's "stack too deep" limit
> under the legacy code generator. Compiling via IR removes that ceiling. This is
> configured in [`hardhat.config.js`](../../hardhat.config.js).

## Why this contract exists

MongoDB can store the same fields as this contract. What it can't do is prove to a
stranger that the record hasn't been quietly edited after the fact. Once
`registerProduct` is mined, the only way any of that data changes is through
`transferOwnership` or `recallProduct` — both restricted to the contract owner and
both emitting a public, permanent event. There is no `updateProduct` on purpose.

## Access control

```solidity
address public owner;          // set once, in the constructor, to msg.sender
modifier onlyOwner() { require(msg.sender == owner, ...); _; }
```

`owner` is the backend's operator wallet (see
[Architecture §4](../ARCHITECTURE.md#4-key-architecture-decision-who-signs-the-blockchain-transaction)
for why manufacturers don't sign their own transactions). All three write functions
carry `onlyOwner`; all four read functions are unrestricted `view` functions — anyone,
including a customer's browser calling through the backend, can read.

## Data structures

### `struct Product`

| Field | Type | Set by | Mutable after registration? |
|---|---|---|---|
| `productId` | `string` | caller | no |
| `name`, `brand`, `category`, `batchNo` | `string` | caller | no |
| `manufacturingDate`, `expiryDate` | `uint256` (unix time) | caller | no |
| `factory` | `string` | caller | no |
| `manufacturer` | `address` | caller (`manufacturerWallet`) | no |
| `currentOwner` | `address` | caller, then `transferOwnership` | **yes** |
| `registeredAt` | `uint256` | `block.timestamp` at registration | no |
| `recalled` | `bool` | `recallProduct` | **yes (one-way: false→true)** |
| `exists` | `bool` | `true` on registration | no |

### `struct OwnershipRecord`

`{ from, to, timestamp }` — one entry is pushed on registration (`from = address(0)`)
and one more on every `transferOwnership` call. This is the array
`getOwnershipHistory` returns.

## Functions

### `registerProduct(productId, name, brand, category, batchNo, manufacturingDate, expiryDate, factory, manufacturerWallet)`
- **Access:** `onlyOwner`
- **Reverts if:** `productId` already registered, or `manufacturerWallet == address(0)`
- **Effect:** writes the `Product` struct, seeds ownership history, emits `ProductRegistered`
- Called once per product, right after the manufacturer submits the Add Product form (Phase 5 wires this up).

### `verifyProduct(productId) → (bool isGenuine, bool isRecalled)`
- **Access:** public view
- **Never reverts** — an unknown `productId` simply returns `(false, false)`
- This is the function the customer verification endpoint calls *first*. Because
  Solidity `view` calls that revert surface as thrown errors in ethers.js, and a fake
  QR code is an expected, common input (not an exceptional one), the "not found" case
  is modeled as a return value, not a revert.

### `getProduct(productId) → Product`
- **Access:** public view
- **Reverts** with `"TrustChain: product not found"` if unknown
- Called only after `verifyProduct` has confirmed the product exists, to fetch full
  details for display.

### `transferOwnership(productId, newOwner)`
- **Access:** `onlyOwner`
- **Reverts if:** product doesn't exist, is already recalled, or `newOwner == address(0)`
- **Effect:** updates `currentOwner`, appends an `OwnershipRecord`, emits `OwnershipTransferred`
- A recalled product can never be transferred again — its ownership record is frozen
  at whoever held it at recall time, which is deliberate: a recalled product shouldn't
  keep circulating as if it were still a normal, tradeable item.

### `recallProduct(productId)`
- **Access:** `onlyOwner`
- **Reverts if:** product doesn't exist, or is already recalled (no double-recall)
- **Effect:** sets `recalled = true`, emits `ProductRecalled`
- One-directional by design — there is no `un-recall`. A real recall doesn't get quietly reversed.

### `getOwnershipHistory(productId) → OwnershipRecord[]`
- **Access:** public view
- **Reverts** if unknown, same convention as `getProduct`

## Events

| Event | Indexed fields | Why `productId` is NOT indexed |
|---|---|---|
| `ProductRegistered(string productId, address indexed manufacturer, uint256 timestamp)` | `manufacturer` | |
| `OwnershipTransferred(string productId, address indexed from, address indexed to, uint256 timestamp)` | `from`, `to` | |
| `ProductRecalled(string productId, uint256 timestamp)` | — | |

Indexing a `string` stores only its `keccak256` hash in the log topic — Etherscan and
ethers.js would show an opaque hash instead of the readable product ID. Since the
project's whole pitch is "anyone can independently inspect this on a public
explorer," `productId` is kept as plain event data everywhere, and `address` fields
(fixed-size, decode cleanly when indexed) are indexed instead so the events remain
filterable by wallet.

## Where the rest of this got built

This document originally tracked what Phase 2 deliberately left out. Since
then: `scripts/deploy.js` (Phase 5) deploys to a local Hardhat node or real
Sepolia; `hardhat.config.js` gained `localhost`/`sepolia` network entries
(Phase 5); and `test/TrustChain.test.js` (Phase 10) covers all 22
function/revert paths above with Hardhat + Chai. See
[../DEPLOYMENT.md](../DEPLOYMENT.md) and [../TESTING.md](../TESTING.md).

## Verified

`npx hardhat compile` succeeds with no warnings beyond the `viaIR` requirement
noted above. `npx hardhat test` — 22/22 passing.
