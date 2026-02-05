import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },

    recipientEmails: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },

    date: { type: Date, default: Date.now },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Unpaid", "Pending", "Paid", "Archived"],
      default: "Unpaid",
    },

    receipt: {
      url: String,
      publicId: String,
      originalName: String,
      resourceType: String, // "image" or "raw" (pdf)
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", InvoiceSchema);
