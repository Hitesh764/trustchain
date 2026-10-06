const mongoose = require("mongoose");

// One row per successful /verify/:productId hit on a genuine product. Powers
// the manufacturer dashboard's "Recent Scans" list. No location/IP capture --
// meaningful geolocation would need a client-side permission prompt (the
// customer's, not the manufacturer's) or a paid IP-geo lookup, neither of
// which is worth adding just to fill in a wireframe column.
const scanEventSchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  scannedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScanEvent", scanEventSchema);
