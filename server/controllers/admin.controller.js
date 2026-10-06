const Manufacturer = require("../models/Manufacturer");
const CounterfeitReport = require("../models/CounterfeitReport");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// GET /api/admin/manufacturers?status=pending
const listManufacturers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const manufacturers = await Manufacturer.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { manufacturers, count: manufacturers.length } });
});

// PUT /api/admin/manufacturers/:id/status  body: { status }
const updateManufacturerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "approved", "rejected", "deactivated"];
  if (!allowed.includes(status)) {
    throw new AppError(`status must be one of: ${allowed.join(", ")}`, 400);
  }

  const manufacturer = await Manufacturer.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!manufacturer) throw new AppError("Manufacturer not found", 404);

  res.status(200).json({ success: true, data: { manufacturer } });
});

// GET /api/admin/reports?status=pending
const listCounterfeitReports = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const reports = await CounterfeitReport.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { reports, count: reports.length } });
});

// PUT /api/admin/reports/:id/status  body: { status }
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "reviewed", "dismissed"];
  if (!allowed.includes(status)) {
    throw new AppError(`status must be one of: ${allowed.join(", ")}`, 400);
  }

  const report = await CounterfeitReport.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!report) throw new AppError("Report not found", 404);

  res.status(200).json({ success: true, data: { report } });
});

module.exports = {
  listManufacturers,
  updateManufacturerStatus,
  listCounterfeitReports,
  updateReportStatus,
};
