const express = require("express");
const { param } = require("express-validator");
const validate = require("../middleware/validate.middleware");
const { publicLimiter } = require("../middleware/rateLimit.middleware");
const { verifyProduct } = require("../controllers/verify.controller");

const router = express.Router();

// Public — no auth. This is the endpoint the customer scanner/verify page hits.
router.get("/:productId", publicLimiter, [param("productId").notEmpty()], validate, verifyProduct);

module.exports = router;
