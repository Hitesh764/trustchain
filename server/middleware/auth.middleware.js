const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Verifies the JWT and attaches { id, role } to req.user. Doesn't hit the
// database — routes that need fresh manufacturer/admin data load it themselves.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Not authenticated", 401);
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError("Invalid or expired token", 401);
  }

  req.user = { id: decoded.id, role: decoded.role };
  next();
});

module.exports = protect;
