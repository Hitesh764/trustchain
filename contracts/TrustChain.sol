// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrustChain
/// @notice Stores an immutable authenticity record per product. Only the contract
/// owner (the backend's operator wallet) may write; anyone may read/verify.
contract TrustChain {
    struct Product {
        string productId;
        string name;
        string brand;
        string category;
        string batchNo;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string factory;
        address manufacturer;
        address currentOwner;
        uint256 registeredAt;
        bool recalled;
        bool exists;
    }

    struct OwnershipRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    address public owner;

    mapping(string => Product) private products;
    mapping(string => OwnershipRecord[]) private ownershipHistory;

    event ProductRegistered(string productId, address indexed manufacturer, uint256 timestamp);
    event OwnershipTransferred(string productId, address indexed from, address indexed to, uint256 timestamp);
    event ProductRecalled(string productId, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "TrustChain: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Registers a new product on-chain. Called by the backend operator
    /// wallet after a manufacturer submits the Add Product form.
    function registerProduct(
        string calldata productId,
        string calldata name,
        string calldata brand,
        string calldata category,
        string calldata batchNo,
        uint256 manufacturingDate,
        uint256 expiryDate,
        string calldata factory,
        address manufacturerWallet
    ) external onlyOwner {
        require(!products[productId].exists, "TrustChain: product already registered");
        require(manufacturerWallet != address(0), "TrustChain: invalid manufacturer wallet");

        products[productId] = Product({
            productId: productId,
            name: name,
            brand: brand,
            category: category,
            batchNo: batchNo,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            factory: factory,
            manufacturer: manufacturerWallet,
            currentOwner: manufacturerWallet,
            registeredAt: block.timestamp,
            recalled: false,
            exists: true
        });

        ownershipHistory[productId].push(
            OwnershipRecord({from: address(0), to: manufacturerWallet, timestamp: block.timestamp})
        );

        emit ProductRegistered(productId, manufacturerWallet, block.timestamp);
    }

    /// @notice Lightweight, non-reverting existence check used by the public
    /// customer verification flow so an unknown/fake productId doesn't throw.
    function verifyProduct(string calldata productId) external view returns (bool isGenuine, bool isRecalled) {
        Product storage p = products[productId];
        return (p.exists, p.recalled);
    }

    /// @notice Full product record. Reverts if the productId is unknown — callers
    /// should call verifyProduct() first to distinguish "not found" from an error.
    function getProduct(string calldata productId) external view returns (Product memory) {
        require(products[productId].exists, "TrustChain: product not found");
        return products[productId];
    }

    /// @notice Reassigns the current owner wallet, e.g. distributor/retailer handoff.
    function transferOwnership(string calldata productId, address newOwner) external onlyOwner {
        Product storage p = products[productId];
        require(p.exists, "TrustChain: product not found");
        require(!p.recalled, "TrustChain: product is recalled");
        require(newOwner != address(0), "TrustChain: invalid new owner");

        address previousOwner = p.currentOwner;
        p.currentOwner = newOwner;

        ownershipHistory[productId].push(
            OwnershipRecord({from: previousOwner, to: newOwner, timestamp: block.timestamp})
        );

        emit OwnershipTransferred(productId, previousOwner, newOwner, block.timestamp);
    }

    /// @notice Marks a product as recalled. Recalled products can no longer be
    /// transferred, but remain queryable so the recall itself is auditable.
    function recallProduct(string calldata productId) external onlyOwner {
        Product storage p = products[productId];
        require(p.exists, "TrustChain: product not found");
        require(!p.recalled, "TrustChain: product already recalled");

        p.recalled = true;

        emit ProductRecalled(productId, block.timestamp);
    }

    /// @notice Full chain-of-custody for a product, from initial registration
    /// (from == address(0)) through every subsequent transfer.
    function getOwnershipHistory(string calldata productId) external view returns (OwnershipRecord[] memory) {
        require(products[productId].exists, "TrustChain: product not found");
        return ownershipHistory[productId];
    }
}
