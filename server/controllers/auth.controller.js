const bcrypt = require("bcryptjs");
const Manufacturer = require("../models/Manufacturer");
const Admin = require("../models/Admin");
const walletAuthService = require("../services/walletAuth.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");

const SALT_ROUNDS = 10;

// GET /api/auth/wallet-nonce?walletAddress=0x... — public. Returns the exact
// message the frontend must have MetaMask sign via personal_sign.
const getWalletNonce = asyncHandler(async (req, res) => {
  const { walletAddress } = req.query;
  const message = walletAuthService.createWalletChallenge(walletAddress);
  res.status(200).json({ success: true, data: { message } });
});

// POST /api/auth/register — manufacturer self-registration, starts as "pending"
// until an admin approves them (see admin.controller.updateManufacturerStatus).
// Requires a signature over the wallet-nonce challenge, proving the registrant
// controls the wallet's private key rather than just typing an address in.
const registerManufacturer = asyncHandler(async (req, res) => {
  const { name, companyName, gstNumber, email, password, walletAddress, signature, phone } = req.body;

  const existing = await Manufacturer.findOne({
    $or: [{ email }, { gstNumber }, { walletAddress: walletAddress.toLowerCase() }],
  });
  if (existing) {
    throw new AppError("A manufacturer with this email, GST number, or wallet already exists", 409);
  }

  const walletCheck = walletAuthService.verifyWalletSignature(walletAddress, signature);
  if (!walletCheck.ok) {
    throw new AppError(walletCheck.reason, 400);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const manufacturer = await Manufacturer.create({
    name,
    companyName,
    gstNumber,
    email,
    password: hashed,
    walletAddress: walletAddress.toLowerCase(),
    walletVerifiedAt: new Date(),
    phone,
  });

  res.status(201).json({
    success: true,
    message: "Registration submitted. Your account is pending admin approval.",
    data: {
      id: manufacturer._id,
      companyName: manufacturer.companyName,
      email: manufacturer.email,
      status: manufacturer.status,
    },
  });
});

// POST /api/auth/login — manufacturer login, blocked unless status === "approved".
const loginManufacturer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const manufacturer = await Manufacturer.findOne({ email }).select("+password");
  if (!manufacturer || !(await bcrypt.compare(password, manufacturer.password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (manufacturer.status !== "approved") {
    throw new AppError(`Your account is ${manufacturer.status}. Contact the admin for access.`, 403);
  }

  const token = generateToken({ id: manufacturer._id, role: "manufacturer" });

  res.status(200).json({
    success: true,
    data: {
      token,
      manufacturer: {
        id: manufacturer._id,
        name: manufacturer.name,
        companyName: manufacturer.companyName,
        email: manufacturer.email,
        walletAddress: manufacturer.walletAddress,
      },
    },
  });
});

// POST /api/auth/admin/login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({ id: admin._id, role: "admin" });

  res.status(200).json({
    success: true,
    data: {
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    },
  });
});

module.exports = { getWalletNonce, registerManufacturer, loginManufacturer, loginAdmin };
