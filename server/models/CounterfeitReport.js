const mongoose = require("mongoose");

const counterfeitReportSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    userLocation: { type: String, trim: true },
    image: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ["pending", "reviewed", "dismissed"], default: "pending", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("CounterfeitReport", counterfeitReportSchema);
