const mongoose = require("mongoose");

const ownershipSchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  from: { type: String, required: true, lowercase: true },
  to: { type: String, required: true, lowercase: true },
  transactionHash: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ownership", ownershipSchema);
