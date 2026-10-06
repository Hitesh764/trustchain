const Product = require("../models/Product");
const ScanEvent = require("../models/ScanEvent");
const blockchainService = require("../services/blockchain.service");
const asyncHandler = require("../utils/asyncHandler");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Expiry dates are stored as a calendar date (midnight UTC), and a product
// stamped "expires 21 Sep" is still fine to use on the 21st -- so it only
// counts as expired once that whole day has passed.
function isExpired(expiryDateIso) {
  return Date.now() >= new Date(expiryDateIso).getTime() + ONE_DAY_MS;
}

// GET /api/verify/:productId — public, no auth. The on-chain record is the
// source of truth for "is this genuine"; MongoDB only adds display metadata
// (description, scan count) on top of it.
const verifyProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const { isGenuine, isRecalled } = await blockchainService.verifyProductOnChain(productId);

  if (!isGenuine) {
    return res.status(200).json({ success: true, data: { verified: false } });
  }

  const [onChainProduct, ownershipHistory] = await Promise.all([
    blockchainService.getProductOnChain(productId),
    blockchainService.getOwnershipHistoryOnChain(productId),
  ]);

  const [productDoc] = await Promise.all([
    Product.findOneAndUpdate({ productId }, { $inc: { scanCount: 1 } }, { new: true }),
    ScanEvent.create({ productId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      verified: true,
      recalled: isRecalled,
      expired: isExpired(onChainProduct.expiryDate),
      product: {
        ...onChainProduct,
        description: productDoc?.description ?? null,
        qrCode: productDoc?.qrCode ?? null,
        transactionHash: productDoc?.transactionHash ?? null,
      },
      ownershipHistory,
    },
  });
});

module.exports = { verifyProduct };
