const express = require("express");
const { body } = require("express-validator");
const protect = require("../middleware/auth.middleware");
const restrictTo = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  listManufacturers,
  updateManufacturerStatus,
  listCounterfeitReports,
  updateReportStatus,
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/manufacturers", listManufacturers);
router.put(
  "/manufacturers/:id/status",
  [body("status").isIn(["pending", "approved", "rejected", "deactivated"])],
  validate,
  updateManufacturerStatus
);

router.get("/reports", listCounterfeitReports);
router.put(
  "/reports/:id/status",
  [body("status").isIn(["pending", "reviewed", "dismissed"])],
  validate,
  updateReportStatus
);

module.exports = router;
