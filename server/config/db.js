const mongoose = require("mongoose");

async function connectDB() {
  mongoose.connection.on("connected", () => {
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  await mongoose.connect(process.env.MONGO_URI);
}

module.exports = connectDB;
