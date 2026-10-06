/**
 * Local-dev only: re-registers every product stored in MongoDB onto the
 * currently running Hardhat chain.
 *
 * `npx hardhat node` keeps chain state in memory, so closing it erases every
 * on-chain product while MongoDB still remembers them -- and since the chain
 * is the source of truth, a previously genuine QR then verifies as
 * "Counterfeit". Run this right after `npm run deploy:localhost` to replay
 * registrations, ownership transfers, and recalls from MongoDB onto the fresh
 * contract. Products already on-chain are skipped, so it's safe to re-run.
 *
 * Not for Sepolia/mainnet: there the chain persists, and this would only ever
 * be needed after deliberately switching to a new contract deployment.
 *
 * Usage (from repo root): npm run resync:localhost
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { ethers } = require("ethers");
const connectDB = require("../config/db");
const mongoose = require("mongoose");
require("../models/Manufacturer"); // registers the schema so populate("manufacturer") works
const Product = require("../models/Product");
const Ownership = require("../models/Ownership");
const blockchain = require("../services/blockchain.service");

async function assertContractDeployed() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  try {
    const code = await provider.getCode(process.env.CONTRACT_ADDRESS);
    if (code === "0x") {
      throw new Error(
        `No contract found at CONTRACT_ADDRESS (${process.env.CONTRACT_ADDRESS}). ` +
          "Run `npm run deploy:localhost` first."
      );
    }
  } finally {
    provider.destroy();
  }
}

async function main() {
  await assertContractDeployed();
  await connectDB();

  const products = await Product.find().sort({ createdAt: 1 }).populate("manufacturer", "walletAddress");
  console.log(`Found ${products.length} product(s) in MongoDB.\n`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const label = `${product.name} (${product.productId})`;

    try {
      const { isGenuine } = await blockchain.verifyProductOnChain(product.productId);
      if (isGenuine) {
        skipped++;
        console.log(`  skip     ${label} -- already on-chain`);
        continue;
      }

      if (!product.manufacturer?.walletAddress) {
        failed++;
        console.warn(`  FAILED   ${label} -- its manufacturer no longer exists in MongoDB`);
        continue;
      }

      const { transactionHash, contractAddress } = await blockchain.registerProductOnChain({
        productId: product.productId,
        name: product.name,
        brand: product.brand,
        category: product.category,
        batchNo: product.batchNo,
        manufacturingDate: product.manufacturingDate,
        expiryDate: product.expiryDate,
        factory: product.factory,
        manufacturerWallet: product.manufacturer.walletAddress,
      });

      product.transactionHash = transactionHash;
      product.blockchainHash = contractAddress;
      await product.save();

      // Transfers must be replayed before a recall -- the contract rejects
      // transfers of a recalled product.
      const transfers = await Ownership.find({ productId: product.productId }).sort({ date: 1 });
      for (const transfer of transfers) {
        const { transactionHash: transferHash } = await blockchain.transferOwnershipOnChain(
          product.productId,
          transfer.to
        );
        transfer.transactionHash = transferHash;
        await transfer.save();
      }

      if (product.status === "recalled") {
        await blockchain.recallProductOnChain(product.productId);
      }

      restored++;
      const extras = [
        transfers.length ? `${transfers.length} transfer(s)` : null,
        product.status === "recalled" ? "recalled" : null,
      ].filter(Boolean);
      console.log(`  restored ${label}${extras.length ? ` [${extras.join(", ")}]` : ""}`);
    } catch (err) {
      failed++;
      console.warn(`  FAILED   ${label} -- ${err.message}`);
    }
  }

  console.log(`\nDone: ${restored} restored, ${skipped} already on-chain, ${failed} failed.`);
  return failed === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
