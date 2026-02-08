import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import userRoutes from "./routes/user.routes.js";
import publicRoutes from "./routes/public.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));


app.use("/auth", authRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/uploads", uploadRoutes);
app.use("/users", userRoutes);
app.use("/public", publicRoutes);

const PORT = process.env.PORT || 5050;

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Mongo connected");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed:", err);
  process.exit(1);
});
