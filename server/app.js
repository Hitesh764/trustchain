const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const verifyRoutes = require("./routes/verify.routes");
const adminRoutes = require("./routes/admin.routes");
const reportRoutes = require("./routes/report.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// crossOriginResourcePolicy relaxed so the uploaded QR images (served below,
// on this same origin) can still be <img>-loaded cross-origin from the
// frontend's separate domain in production -- helmet's default would block that.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => res.status(200).json({ success: true, message: "OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `No route for ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

module.exports = app;
