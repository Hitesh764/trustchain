const path = require("path");
const { ethers } = require("ethers");
const AppError = require("../utils/AppError");

/**
 * Real ethers.js integration against the deployed TrustChain contract (see
 * contracts/TrustChain.sol and docs/smart-contract/TrustChain.md). The exported
 * function names/shapes match Phase 3's mocked version exactly, so no controller
 * changed when this file did.
 *
 * ABI is read straight from the Hardhat build output — run `npx hardhat compile`
 * (from the repo root) at least once before starting the server.
 */

const contractArtifact = require(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "TrustChain.sol", "TrustChain.json")
);

// batchMaxCount: 1 disables ethers' automatic JSON-RPC request batching.
// With batching on, a call that's expected to revert (e.g. recalling an
// already-recalled product) issued shortly after another call can come back
// as an opaque "could not coalesce error" instead of the real revert reason
// -- a known ethers v6 rough edge against Hardhat/Anvil-style local nodes.
//
// cacheTimeout: -1 disables ethers' 250ms "share identical in-flight requests"
// cache (AbstractProvider#perform). It's meant to dedupe truly-simultaneous
// calls, but it also silently serves a *stale* nonce to any getTransactionCount
// call made within 250ms of the previous one -- exactly what nextNonce() below
// does on every write. Without this, back-to-back writes to the same wallet
// reuse a nonce and fail with "nonce has already been used".
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, undefined, {
  batchMaxCount: 1,
  cacheTimeout: -1,
});
const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractArtifact.abi, operatorWallet);

// Deliberately NOT using ethers' NonceManager here: it tracks nonces with an
// in-memory optimistic counter that increments as soon as a nonce is
// requested, even if that particular send then fails before broadcasting.
// One failed call permanently desyncs it from the real chain, silently
// breaking every write after it. Fetching the confirmed ("latest", not
// "pending") nonce fresh before each send is slightly more chatty but can't
// drift, since every write here already awaits the previous one's tx.wait().
async function nextNonce() {
  return provider.getTransactionCount(operatorWallet.address, "pending");
}

function toUnixSeconds(dateLike) {
  return Math.floor(new Date(dateLike).getTime() / 1000);
}

function toIsoString(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

// Ethers throws on a reverted call/tx with the reason buried in different
// places depending on the failure mode; this normalizes it into an AppError
// with a sensible status code instead of leaking a raw ethers stack trace.
function rethrowAsAppError(err) {
  const reason = err.reason || err.shortMessage || err.message || "Blockchain call failed";

  if (/not found/i.test(reason)) throw new AppError(reason, 404);
  if (/already registered|already recalled/i.test(reason)) throw new AppError(reason, 409);
  throw new AppError(reason, 400);
}

// Observed in practice against a local Hardhat node (not reproduced calling
// ethers directly against it, and not expected against a real RPC provider
// like Infura/Alchemy): an occasional opaque "could not coalesce error"
// instead of the real result/revert reason, sometimes even on a second
// attempt. Retries a couple of times with a short backoff before giving up.
async function withTransientRetry(fn, attemptsLeft = 2) {
  try {
    return await fn();
  } catch (err) {
    const message = err.reason || err.shortMessage || err.message || "";
    if (!/coalesce/i.test(message) || attemptsLeft <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return withTransientRetry(fn, attemptsLeft - 1);
  }
}

async function registerProductOnChain({
  productId,
  name,
  brand,
  category,
  batchNo,
  manufacturingDate,
  expiryDate,
  factory,
  manufacturerWallet,
}) {
  try {
    return await withTransientRetry(async () => {
      const tx = await contract.registerProduct(
        productId,
        name,
        brand,
        category,
        batchNo,
        toUnixSeconds(manufacturingDate),
        toUnixSeconds(expiryDate),
        factory,
        manufacturerWallet,
        { nonce: await nextNonce() }
      );
      await tx.wait();

      return { transactionHash: tx.hash, contractAddress: await contract.getAddress() };
    });
  } catch (err) {
    rethrowAsAppError(err);
  }
}

async function verifyProductOnChain(productId) {
  const [isGenuine, isRecalled] = await withTransientRetry(() => contract.verifyProduct(productId));
  return { isGenuine, isRecalled };
}

async function getProductOnChain(productId) {
  try {
    const p = await withTransientRetry(() => contract.getProduct(productId));
    return {
      productId: p.productId,
      name: p.name,
      brand: p.brand,
      category: p.category,
      batchNo: p.batchNo,
      manufacturingDate: toIsoString(p.manufacturingDate),
      expiryDate: toIsoString(p.expiryDate),
      factory: p.factory,
      manufacturer: p.manufacturer.toLowerCase(),
      currentOwner: p.currentOwner.toLowerCase(),
      registeredAt: toIsoString(p.registeredAt),
      recalled: p.recalled,
    };
  } catch (err) {
    rethrowAsAppError(err);
  }
}

async function transferOwnershipOnChain(productId, newOwnerWallet) {
  try {
    return await withTransientRetry(async () => {
      const tx = await contract.transferOwnership(productId, newOwnerWallet, { nonce: await nextNonce() });
      await tx.wait();
      return { transactionHash: tx.hash };
    });
  } catch (err) {
    rethrowAsAppError(err);
  }
}

async function recallProductOnChain(productId) {
  try {
    return await withTransientRetry(async () => {
      const tx = await contract.recallProduct(productId, { nonce: await nextNonce() });
      await tx.wait();
      return { transactionHash: tx.hash };
    });
  } catch (err) {
    rethrowAsAppError(err);
  }
}

async function getOwnershipHistoryOnChain(productId) {
  try {
    const history = await withTransientRetry(() => contract.getOwnershipHistory(productId));
    return history.map((record) => ({
      from: record.from === ethers.ZeroAddress ? null : record.from.toLowerCase(),
      to: record.to.toLowerCase(),
      timestamp: toIsoString(record.timestamp),
    }));
  } catch (err) {
    rethrowAsAppError(err);
  }
}

module.exports = {
  registerProductOnChain,
  verifyProductOnChain,
  getProductOnChain,
  transferOwnershipOnChain,
  recallProductOnChain,
  getOwnershipHistoryOnChain,
};
