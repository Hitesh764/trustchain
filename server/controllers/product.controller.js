const { randomUUID } = require("crypto");
const Product = require("../models/Product");
const Ownership = require("../models/Ownership");
const Manufacturer = require("../models/Manufacturer");
const CounterfeitReport = require("../models/CounterfeitReport");
const ScanEvent = require("../models/ScanEvent");
const blockchainService = require("../services/blockchain.service");
const qrService = require("../services/qr.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// POST /api/products — manufacturer only.
const createProduct = asyncHandler(async (req, res) => {
  const manufacturer = await Manufacturer.findById(req.user.id);
  if (!manufacturer) throw new AppError("Manufacturer not found", 404);

  const { name, brand, category, batchNo, manufacturingDate, expiryDate, factory, description } = req.body;

  const productId = randomUUID();

  const { transactionHash, contractAddress } = await blockchainService.registerProductOnChain({
    productId,
    name,
    brand,
    category,
    batchNo,
    manufacturingDate,
    expiryDate,
    factory,
    manufacturerWallet: manufacturer.walletAddress,
  });

  const qrCode = await qrService.generateAndStoreQr(productId);

  const product = await Product.create({
    productId,
    name,
    brand,
    category,
    batchNo,
    manufacturingDate,
    expiryDate,
    factory,
    description,
    blockchainHash: contractAddress,
    transactionHash,
    currentOwner: manufacturer.walletAddress,
    manufacturer: manufacturer._id,
    qrCode,
  });

  res.status(201).json({ success: true, data: { product } });
});

// GET /api/products/:productId — manufacturer sees only their own; admin sees any.
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.productId });
  if (!product) throw new AppError("Product not found", 404);

  if (req.user.role === "manufacturer" && String(product.manufacturer) !== req.user.id) {
    throw new AppError("You do not have permission to view this product", 403);
  }

  res.status(200).json({ success: true, data: { product } });
});

// GET /api/products — manufacturer's own products (admin: all), with optional
// search/status/category filters matching the Product List wireframe.
const listProducts = asyncHandler(async (req, res) => {
  const { search, status, category } = req.query;
  const filter = {};

  if (req.user.role === "manufacturer") {
    filter.manufacturer = req.user.id;
  }
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { batchNo: { $regex: search, $options: "i" } },
    ];
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { products, count: products.length } });
});

// PUT /api/products/ownership — manufacturer transfers a product they currently own.
const transferOwnership = asyncHandler(async (req, res) => {
  const { productId, newOwnerWallet } = req.body;

  const product = await Product.findOne({ productId });
  if (!product) throw new AppError("Product not found", 404);
  if (String(product.manufacturer) !== req.user.id) {
    throw new AppError("You do not have permission to transfer this product", 403);
  }

  const previousOwner = product.currentOwner;
  const { transactionHash } = await blockchainService.transferOwnershipOnChain(
    productId,
    newOwnerWallet.toLowerCase()
  );

  product.currentOwner = newOwnerWallet.toLowerCase();
  await product.save();

  await Ownership.create({
    productId,
    from: previousOwner,
    to: newOwnerWallet.toLowerCase(),
    transactionHash,
  });

  res.status(200).json({ success: true, data: { product } });
});

// PUT /api/products/recall
const recallProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findOne({ productId });
  if (!product) throw new AppError("Product not found", 404);
  if (String(product.manufacturer) !== req.user.id) {
    throw new AppError("You do not have permission to recall this product", 403);
  }

  await blockchainService.recallProductOnChain(productId);

  product.status = "recalled";
  await product.save();

  res.status(200).json({ success: true, data: { product } });
});

// GET /api/products/:productId/qr?format=png|svg|pdf — manufacturer (own) or admin.
const downloadQr = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.productId });
  if (!product) throw new AppError("Product not found", 404);
  if (req.user.role === "manufacturer" && String(product.manufacturer) !== req.user.id) {
    throw new AppError("You do not have permission to download this QR", 403);
  }

  const format = (req.query.format || "png").toLowerCase();
  const filenameBase = `${product.name}-${product.batchNo}`.replace(/[^a-z0-9-_]+/gi, "_");

  if (format === "svg") {
    const svg = await qrService.getQrSvgString(product.productId);
    res.set("Content-Type", "image/svg+xml");
    res.set("Content-Disposition", `attachment; filename="${filenameBase}.svg"`);
    return res.send(svg);
  }

  if (format === "pdf") {
    const pdf = await qrService.getQrPdfBuffer(product.productId, { name: product.name, batchNo: product.batchNo });
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);
    return res.send(pdf);
  }

  if (format !== "png") throw new AppError("format must be one of: png, svg, pdf", 400);

  const png = await qrService.getQrPngBuffer(product.productId);
  res.set("Content-Type", "image/png");
  res.set("Content-Disposition", `attachment; filename="${filenameBase}.png"`);
  res.send(png);
});

// GET /api/products/stats — manufacturer only. Backs the dashboard/analytics
// numbers the spec asks for: Products Registered, Products Verified
// (totalScans), Counterfeit Reports, Ownership Transfers.
const getManufacturerStats = asyncHandler(async (req, res) => {
  const products = await Product.find({ manufacturer: req.user.id }).select("productId status scanCount category");
  const productIds = products.map((p) => p.productId);

  const [counterfeitReports, ownershipTransfers] = await Promise.all([
    CounterfeitReport.countDocuments({ productId: { $in: productIds } }),
    Ownership.countDocuments({ productId: { $in: productIds } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      productsRegistered: products.length,
      active: products.filter((p) => p.status === "active").length,
      recalled: products.filter((p) => p.status === "recalled").length,
      totalScans: products.reduce((sum, p) => sum + p.scanCount, 0),
      counterfeitReports,
      ownershipTransfers,
      byCategory: products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {}),
    },
  });
});

// GET /api/products/recent-scans — manufacturer only. Last 10 genuine-product
// verifications across all of this manufacturer's products.
const getRecentScans = asyncHandler(async (req, res) => {
  const productIds = await Product.find({ manufacturer: req.user.id }).distinct("productId");

  const scans = await ScanEvent.find({ productId: { $in: productIds } })
    .sort({ scannedAt: -1 })
    .limit(10);

  const products = await Product.find({ productId: { $in: scans.map((s) => s.productId) } }).select(
    "productId name batchNo"
  );
  const productByProductId = new Map(products.map((p) => [p.productId, p]));

  res.status(200).json({
    success: true,
    data: {
      scans: scans.map((s) => ({
        productId: s.productId,
        name: productByProductId.get(s.productId)?.name ?? "Unknown product",
        batchNo: productByProductId.get(s.productId)?.batchNo ?? "",
        scannedAt: s.scannedAt,
      })),
    },
  });
});

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  transferOwnership,
  recallProduct,
  downloadQr,
  getManufacturerStats,
  getRecentScans,
};
