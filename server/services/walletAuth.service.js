const crypto = require("crypto");
const { ethers } = require("ethers");

/**
 * Lightweight Sign-In-with-Ethereum-style wallet ownership check, used once at
 * manufacturer registration (see docs/ARCHITECTURE.md §8) -- NOT on every
 * login. Proves the registrant controls the private key for the wallet
 * address they're claiming, instead of just typing an address into a form.
 *
 * In-memory Map, same reasoning as blockchain.service.js's mock chain state:
 * nothing here needs to survive a restart, a nonce is meant to be single-use
 * and short-lived.
 */

const NONCE_TTL_MS = 5 * 60 * 1000;
const pendingChallenges = new Map(); // walletAddress (lowercase) -> { message, expiresAt }

function buildMessage(walletAddress, nonce) {
  return [
    "TrustChain wants you to verify ownership of this wallet.",
    "",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date().toISOString()}`,
  ].join("\n");
}

function createWalletChallenge(walletAddress) {
  const address = walletAddress.toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = buildMessage(address, nonce);

  pendingChallenges.set(address, { message, expiresAt: Date.now() + NONCE_TTL_MS });

  return message;
}

function verifyWalletSignature(walletAddress, signature) {
  const address = walletAddress.toLowerCase();
  const challenge = pendingChallenges.get(address);

  if (!challenge) return { ok: false, reason: "No wallet verification was requested for this address" };
  if (Date.now() > challenge.expiresAt) {
    pendingChallenges.delete(address);
    return { ok: false, reason: "Wallet verification expired -- please reconnect your wallet" };
  }

  pendingChallenges.delete(address); // one-time use regardless of outcome

  let recovered;
  try {
    recovered = ethers.verifyMessage(challenge.message, signature).toLowerCase();
  } catch {
    return { ok: false, reason: "Invalid wallet signature" };
  }

  if (recovered !== address) {
    return { ok: false, reason: "Signature does not match the claimed wallet address" };
  }

  return { ok: true };
}

module.exports = { createWalletChallenge, verifyWalletSignature };
