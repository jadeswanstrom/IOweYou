import express from "express";
import multer from "multer";
import streamifier from "streamifier";
import { requireAuth } from "../middleware/requireAuth.js";
import cloudinary from "../lib/cloudinary.js";

const router = express.Router();
router.use(requireAuth);

// store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post("/receipt", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // basic type allowlist
    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
    if (!okTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Only JPG, PNG, WEBP, or PDF allowed" });
    }

    const folder = `invoice-app/receipts/${req.user.id}`;

    // For PDFs, Cloudinary uses resource_type: "raw"
    const resourceType = req.file.mimetype === "application/pdf" ? "raw" : "image";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return res.status(500).json({ error: "Upload failed" });

        return res.json({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          originalName: req.file.originalname,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
