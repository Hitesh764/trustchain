const express = require("express");
const { body, query } = require("express-validator");
const validate = require("../middleware/validate.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");
const {
  getWalletNonce,
  registerManufacturer,
  loginManufacturer,
  loginAdmin,
} = require("../controllers/auth.controller");

const router = express.Router();

router.use(authLimiter);

router.get(
  "/wallet-nonce",
  [query("walletAddress").matches(/^0x[a-fA-F0-9]{40}$/).withMessage("A valid wallet address is required")],
  validate,
  getWalletNonce
);

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("companyName").trim().notEmpty().withMessage("Company name is required"),
    body("gstNumber").trim().notEmpty().withMessage("GST number is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("walletAddress").matches(/^0x[a-fA-F0-9]{40}$/).withMessage("A valid wallet address is required"),
    body("signature").notEmpty().withMessage("Wallet signature is required — connect your wallet first"),
  ],
  validate,
  registerManufacturer
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  loginManufacturer
);

router.post(
  "/admin/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  loginAdmin
);

module.exports = router;
