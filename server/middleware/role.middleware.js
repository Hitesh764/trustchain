const AppError = require("../utils/AppError");

// Usage: restrictTo("admin") or restrictTo("manufacturer", "admin"). Must run after `protect`.
function restrictTo(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }
    next();
  };
}

module.exports = restrictTo;
