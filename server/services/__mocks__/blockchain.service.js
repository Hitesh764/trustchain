const crypto = require("crypto");
const AppError = require("../../utils/AppError");

/**
 * Jest manual mock (Jest's `__mocks__` convention -- auto-used by any test
 * file that calls `jest.mock("../services/blockchain.service")`).
 *
 * Mirrors the Phase 3 in-memory mock's behavior/shape exactly, so backend
 * tests exercise the real controller logic (validation, permission checks,
 * Mongo writes, status codes) without needing a live chain. The real
 * ethers.js integration itself is what Phase 5 verified manually against an
 * actual local Hardhat node -- that's a different, already-covered concern.
 *
 * Throws real AppError instances with the same status codes the real
 * service's rethrowAsAppError() produces -- controllers don't do their own
 * error-code translation, they trust the service already did it.
 */

const chain = new Map();
const ownershipLog = new Map();

function fakeTxHash() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

async function registerProductOnChain({ productId, manufacturerWallet, ...rest }) {
  if (chain.has(productId)) {
    throw new AppError("TrustChain: product already registered", 409);
  }

  chain.set(productId, { ...rest, currentOwner: manufacturerWallet, recalled: false });
  ownershipLog.set(productId, [{ from: null, to: manufacturerWallet, timestamp: new Date() }]);

  return { transactionHash: fakeTxHash(), contractAddress: "0x0000000000000000000000000000000000000TEST" };
}

async function verifyProductOnChain(productId) {
  const record = chain.get(productId);
  return { isGenuine: Boolean(record), isRecalled: Boolean(record?.recalled) };
}

async function getProductOnChain(productId) {
  const record = chain.get(productId);
  if (!record) throw new AppError("TrustChain: product not found", 404);
  return { productId, ...record };
}

async function transferOwnershipOnChain(productId, newOwnerWallet) {
  const record = chain.get(productId);
  if (!record) throw new AppError("TrustChain: product not found", 404);

  const previousOwner = record.currentOwner;
  record.currentOwner = newOwnerWallet;
  ownershipLog.get(productId).push({ from: previousOwner, to: newOwnerWallet, timestamp: new Date() });
  return { transactionHash: fakeTxHash() };
}

async function recallProductOnChain(productId) {
  const record = chain.get(productId);
  if (!record) throw new AppError("TrustChain: product not found", 404);
  if (record.recalled) throw new AppError("TrustChain: product already recalled", 409);

  record.recalled = true;
  return { transactionHash: fakeTxHash() };
}

async function getOwnershipHistoryOnChain(productId) {
  return ownershipLog.get(productId) || [];
}

module.exports = {
  registerProductOnChain,
  verifyProductOnChain,
  getProductOnChain,
  transferOwnershipOnChain,
  recallProductOnChain,
  getOwnershipHistoryOnChain,
};
