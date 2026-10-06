require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Safety net for anything outside Express's request cycle (asyncHandler
// only catches rejections inside a request handler) -- without these, a
// stray unhandled rejection either vanishes silently or crashes the
// process with no useful log pointing at the cause.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception, shutting down:", err);
  process.exit(1);
});

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`TrustChain API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
