const CounterfeitReport = require("../models/CounterfeitReport");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/reports — public. Deliberately accepts a productId that doesn't
// exist on-chain: that's the entire point of a counterfeit report.
const submitReport = asyncHandler(async (req, res) => {
  const { productId, userLocation, description, contactEmail } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : undefined;

  const report = await CounterfeitReport.create({
    productId,
    userLocation,
    description,
    contactEmail,
    image,
  });

  res.status(201).json({ success: true, data: { report } });
});

module.exports = { submitReport };
