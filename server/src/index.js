import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js"; 
import uploadRoutes from "./routes/upload.routes.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5050;

app.use("/auth", authRoutes);
app.use("/invoices", invoiceRoutes); 
app.use("/uploads", uploadRoutes);



async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(" Mongo connected");
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error(" Server failed:", err);
  process.exit(1);
});
