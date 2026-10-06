const express = require("express");
const { body } = require("express-validator");
const upload = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const { publicLimiter } = require("../middleware/rateLimit.middleware");
const { submitReport } = require("../controllers/report.controller");

const router = express.Router();

// Public — a customer reporting a suspected fake never needs to log in.
router.post(
  "/",
  publicLimiter,
  upload.single("image"),
  [
    body("productId").trim().notEmpty().withMessage("Product ID is required"),
    body("description").trim().notEmpty().withMessage("Please describe what looked wrong"),
    body("contactEmail").optional({ values: "falsy" }).isEmail(),
  ],
  validate,
  submitReport
);

module.exports = router;
