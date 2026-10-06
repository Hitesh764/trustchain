const express = require("express");
const { body, param } = require("express-validator");
const protect = require("../middleware/auth.middleware");
const restrictTo = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createProduct,
  getProductById,
  listProducts,
  transferOwnership,
  recallProduct,
  downloadQr,
  getManufacturerStats,
  getRecentScans,
} = require("../controllers/product.controller");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  restrictTo("manufacturer"),
  [
    body("name").trim().notEmpty(),
    body("brand").trim().notEmpty(),
    body("category").isIn(["food", "medicine", "cosmetics", "fashion", "fmcg", "other"]),
    body("batchNo").trim().notEmpty(),
    body("manufacturingDate").isISO8601(),
    body("expiryDate").isISO8601(),
    body("factory").trim().notEmpty(),
  ],
  validate,
  createProduct
);

router.get("/", restrictTo("manufacturer", "admin"), listProducts);

// Must come before "/:productId" -- otherwise Express reads these as a
// literal productId value instead of matching the static routes below.
router.get("/stats", restrictTo("manufacturer"), getManufacturerStats);
router.get("/recent-scans", restrictTo("manufacturer"), getRecentScans);

router.get(
  "/:productId",
  restrictTo("manufacturer", "admin"),
  [param("productId").notEmpty()],
  validate,
  getProductById
);

router.get(
  "/:productId/qr",
  restrictTo("manufacturer", "admin"),
  [param("productId").notEmpty()],
  validate,
  downloadQr
);

router.put(
  "/ownership",
  restrictTo("manufacturer"),
  [
    body("productId").notEmpty(),
    body("newOwnerWallet").matches(/^0x[a-fA-F0-9]{40}$/),
  ],
  validate,
  transferOwnership
);

router.put(
  "/recall",
  restrictTo("manufacturer"),
  [body("productId").notEmpty()],
  validate,
  recallProduct
);

module.exports = router;
