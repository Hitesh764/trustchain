const multer = require("multer");
const AppError = require("../utils/AppError");

// Mongoose duplicate-key / cast errors don't carry a statusCode by default,
// so they're translated here into the same AppError shape as everything else.
function normalizeError(err) {
  if (err instanceof AppError) return err;

  // e.g. LIMIT_FILE_SIZE from upload.middleware's 5MB limit -- otherwise
  // falls through to a generic "Internal server error" that hides the
  // actual, user-actionable reason (file too large, too many files, etc).
  if (err instanceof multer.MulterError) {
    return new AppError(err.message, 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return new AppError(`${field} already in use`, 409);
  }

  if (err.name === "ValidationError") {
    return new AppError(Object.values(err.errors).map((e) => e.message).join(", "), 400);
  }

  if (err.name === "CastError") {
    return new AppError(`Invalid ${err.path}`, 400);
  }

  return err;
}

function errorHandler(err, req, res, next) {
  const error = normalizeError(err);
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
  });
}

module.exports = errorHandler;
