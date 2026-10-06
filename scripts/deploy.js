const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const hre = require("hardhat");

// Only the local dev chain resets its state (and therefore the deployed
// address) on every restart, so only there is it safe to overwrite
// server/.env unattended -- doing this on sepolia/mainnet could silently
// point the server at the wrong contract.
function updateServerEnv(address) {
  const envPath = path.join(__dirname, "..", "server", ".env");
  if (!fs.existsSync(envPath)) {
    console.log(`\nserver/.env not found -- set CONTRACT_ADDRESS=${address} manually.`);
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  const line = `CONTRACT_ADDRESS=${address}`;
  const updated = /^CONTRACT_ADDRESS=.*$/m.test(contents)
    ? contents.replace(/^CONTRACT_ADDRESS=.*$/m, line)
    : `${contents.trimEnd()}\n${line}\n`;

  fs.writeFileSync(envPath, updated);
  console.log(`\nserver/.env updated: ${line}`);
  console.log("Restart the backend server for it to pick up the new address.");
}

// The local chain forgets everything when the node stops, but MongoDB doesn't
// -- so right after a fresh deploy, replay every stored product onto the new
// contract. Otherwise a QR that was genuine yesterday verifies as
// "Counterfeit" today. Runs as a separate process so it reads the .env that
// updateServerEnv just rewrote.
function restoreProducts() {
  console.log("\nRestoring products from MongoDB onto the fresh chain...\n");
  const script = path.join(__dirname, "..", "server", "scripts", "resyncChain.js");
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (result.status !== 0) {
    console.warn("\nProduct restore did not finish (is MongoDB running?). Re-run `npm run resync:localhost` once it is.");
  }
}

async function main() {
  const TrustChain = await hre.ethers.getContractFactory("TrustChain");
  const contract = await TrustChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const [deployer] = await hre.ethers.getSigners();

  console.log(`TrustChain deployed to: ${address}`);
  console.log(`Owner (operator wallet): ${deployer.address}`);

  if (hre.network.name === "localhost") {
    updateServerEnv(address);
    restoreProducts();
  } else {
    console.log(`\nCopy the address into server/.env as CONTRACT_ADDRESS.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
