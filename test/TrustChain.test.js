const { expect } = require("chai");
const hre = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("TrustChain", function () {
  let contract, owner, manufacturer, newOwner, stranger;

  const SAMPLE = {
    productId: "product-1",
    name: "Amul Butter 500g",
    brand: "Amul",
    category: "food",
    batchNo: "A102",
    manufacturingDate: 1735689600, // 2025-01-01
    expiryDate: 1767225600, // 2026-01-01
    factory: "Anand, Gujarat",
  };

  beforeEach(async function () {
    [owner, manufacturer, newOwner, stranger] = await hre.ethers.getSigners();
    const TrustChain = await hre.ethers.getContractFactory("TrustChain");
    contract = await TrustChain.deploy();
    await contract.waitForDeployment();
  });

  async function registerSample() {
    return contract.registerProduct(
      SAMPLE.productId,
      SAMPLE.name,
      SAMPLE.brand,
      SAMPLE.category,
      SAMPLE.batchNo,
      SAMPLE.manufacturingDate,
      SAMPLE.expiryDate,
      SAMPLE.factory,
      manufacturer.address
    );
  }

  describe("registerProduct", function () {
    it("registers a product and emits ProductRegistered", async function () {
      await expect(registerSample())
        .to.emit(contract, "ProductRegistered")
        .withArgs(SAMPLE.productId, manufacturer.address, anyValue);
    });

    it("sets the manufacturer as the initial currentOwner", async function () {
      await registerSample();
      const product = await contract.getProduct(SAMPLE.productId);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.recalled).to.equal(false);
    });

    it("seeds ownership history with a genesis entry (from = address(0))", async function () {
      await registerSample();
      const history = await contract.getOwnershipHistory(SAMPLE.productId);
      expect(history.length).to.equal(1);
      expect(history[0].from).to.equal(hre.ethers.ZeroAddress);
      expect(history[0].to).to.equal(manufacturer.address);
    });

    it("reverts on duplicate productId", async function () {
      await registerSample();
      await expect(registerSample()).to.be.revertedWith("TrustChain: product already registered");
    });

    it("reverts when manufacturerWallet is the zero address", async function () {
      await expect(
        contract.registerProduct(
          "product-2",
          SAMPLE.name,
          SAMPLE.brand,
          SAMPLE.category,
          SAMPLE.batchNo,
          SAMPLE.manufacturingDate,
          SAMPLE.expiryDate,
          SAMPLE.factory,
          hre.ethers.ZeroAddress
        )
      ).to.be.revertedWith("TrustChain: invalid manufacturer wallet");
    });

    it("reverts when called by anyone other than the contract owner", async function () {
      await expect(
        contract
          .connect(stranger)
          .registerProduct(
            "product-3",
            SAMPLE.name,
            SAMPLE.brand,
            SAMPLE.category,
            SAMPLE.batchNo,
            SAMPLE.manufacturingDate,
            SAMPLE.expiryDate,
            SAMPLE.factory,
            manufacturer.address
          )
      ).to.be.revertedWith("TrustChain: caller is not the owner");
    });
  });

  describe("verifyProduct", function () {
    it("returns (false, false) for an unknown productId, never reverting", async function () {
      const [isGenuine, isRecalled] = await contract.verifyProduct("does-not-exist");
      expect(isGenuine).to.equal(false);
      expect(isRecalled).to.equal(false);
    });

    it("returns (true, false) for a registered, non-recalled product", async function () {
      await registerSample();
      const [isGenuine, isRecalled] = await contract.verifyProduct(SAMPLE.productId);
      expect(isGenuine).to.equal(true);
      expect(isRecalled).to.equal(false);
    });

    it("returns (true, true) after the product is recalled", async function () {
      await registerSample();
      await contract.recallProduct(SAMPLE.productId);
      const [isGenuine, isRecalled] = await contract.verifyProduct(SAMPLE.productId);
      expect(isGenuine).to.equal(true);
      expect(isRecalled).to.equal(true);
    });
  });

  describe("getProduct", function () {
    it("reverts for an unknown productId", async function () {
      await expect(contract.getProduct("does-not-exist")).to.be.revertedWith("TrustChain: product not found");
    });

    it("returns the full struct for a known product", async function () {
      await registerSample();
      const product = await contract.getProduct(SAMPLE.productId);
      expect(product.name).to.equal(SAMPLE.name);
      expect(product.brand).to.equal(SAMPLE.brand);
      expect(product.batchNo).to.equal(SAMPLE.batchNo);
      expect(product.manufacturingDate).to.equal(BigInt(SAMPLE.manufacturingDate));
      expect(product.expiryDate).to.equal(BigInt(SAMPLE.expiryDate));
    });
  });

  describe("transferOwnership", function () {
    it("updates currentOwner and appends to ownership history", async function () {
      await registerSample();
      await expect(contract.transferOwnership(SAMPLE.productId, newOwner.address))
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(SAMPLE.productId, manufacturer.address, newOwner.address, anyValue);

      const product = await contract.getProduct(SAMPLE.productId);
      expect(product.currentOwner).to.equal(newOwner.address);

      const history = await contract.getOwnershipHistory(SAMPLE.productId);
      expect(history.length).to.equal(2);
      expect(history[1].from).to.equal(manufacturer.address);
      expect(history[1].to).to.equal(newOwner.address);
    });

    it("reverts for an unknown productId", async function () {
      await expect(contract.transferOwnership("does-not-exist", newOwner.address)).to.be.revertedWith(
        "TrustChain: product not found"
      );
    });

    it("reverts when the product is recalled", async function () {
      await registerSample();
      await contract.recallProduct(SAMPLE.productId);
      await expect(contract.transferOwnership(SAMPLE.productId, newOwner.address)).to.be.revertedWith(
        "TrustChain: product is recalled"
      );
    });

    it("reverts when newOwner is the zero address", async function () {
      await registerSample();
      await expect(contract.transferOwnership(SAMPLE.productId, hre.ethers.ZeroAddress)).to.be.revertedWith(
        "TrustChain: invalid new owner"
      );
    });

    it("reverts when called by anyone other than the contract owner", async function () {
      await registerSample();
      await expect(
        contract.connect(stranger).transferOwnership(SAMPLE.productId, newOwner.address)
      ).to.be.revertedWith("TrustChain: caller is not the owner");
    });
  });

  describe("recallProduct", function () {
    it("marks the product recalled and emits ProductRecalled", async function () {
      await registerSample();
      await expect(contract.recallProduct(SAMPLE.productId))
        .to.emit(contract, "ProductRecalled")
        .withArgs(SAMPLE.productId, anyValue);

      const product = await contract.getProduct(SAMPLE.productId);
      expect(product.recalled).to.equal(true);
    });

    it("reverts for an unknown productId", async function () {
      await expect(contract.recallProduct("does-not-exist")).to.be.revertedWith("TrustChain: product not found");
    });

    it("reverts on a double recall", async function () {
      await registerSample();
      await contract.recallProduct(SAMPLE.productId);
      await expect(contract.recallProduct(SAMPLE.productId)).to.be.revertedWith(
        "TrustChain: product already recalled"
      );
    });

    it("reverts when called by anyone other than the contract owner", async function () {
      await registerSample();
      await expect(contract.connect(stranger).recallProduct(SAMPLE.productId)).to.be.revertedWith(
        "TrustChain: caller is not the owner"
      );
    });
  });

  describe("getOwnershipHistory", function () {
    it("reverts for an unknown productId", async function () {
      await expect(contract.getOwnershipHistory("does-not-exist")).to.be.revertedWith(
        "TrustChain: product not found"
      );
    });

    it("reflects every transfer in order", async function () {
      await registerSample();
      await contract.transferOwnership(SAMPLE.productId, newOwner.address);
      await contract.transferOwnership(SAMPLE.productId, stranger.address);

      const history = await contract.getOwnershipHistory(SAMPLE.productId);
      expect(history.length).to.equal(3);
      expect(history.map((h) => h.to)).to.deep.equal([
        manufacturer.address,
        newOwner.address,
        stranger.address,
      ]);
    });
  });
});
