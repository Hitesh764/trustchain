const mongoose = require("mongoose");

const manufacturerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    gstNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    walletAddress: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Set once, at registration, after verifyWalletSignature() confirms the
    // registrant actually controls this wallet's private key (Phase 8).
    walletVerifiedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "deactivated"],
      default: "pending",
    },
    phone: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Manufacturer", manufacturerSchema);
