require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const { SEPOLIA_RPC_URL, OPERATOR_PRIVATE_KEY } = process.env;

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    scripts: "./scripts",
    artifacts: "./artifacts",
  },
  networks: {
    // `npx hardhat node` + `--network localhost` — a real local chain with
    // funded test accounts, used to verify the ethers.js integration without
    // needing real Sepolia ETH.
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Only registered once real credentials exist in .env, so `hardhat compile`
    // and local-network work without them.
    ...(SEPOLIA_RPC_URL && OPERATOR_PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [OPERATOR_PRIVATE_KEY],
          },
        }
      : {}),
  },
};
