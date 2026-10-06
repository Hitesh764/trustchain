const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["food", "medicine", "cosmetics", "fashion", "fmcg", "other"],
    },
    batchNo: { type: String, required: true, trim: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    factory: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    blockchainHash: { type: String, required: true }, // deployed contract address
    transactionHash: { type: String, required: true }, // registerProduct tx hash
    currentOwner: { type: String, required: true, lowercase: true }, // wallet address
    qrCode: { type: String, default: null }, // populated in Phase 6
    status: { type: String, enum: ["active", "recalled"], default: "active" },
    manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: "Manufacturer", required: true },
    scanCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ manufacturer: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model("Product", productSchema);
