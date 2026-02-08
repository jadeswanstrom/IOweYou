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

    // public share feature
   
      shareToken: { type: String, trim: true },  
      shareEnabled: { type: Boolean, default: false },

    // snapshot of payee info at “publish/share” time
    payeePaypalMe: { type: String, default: "", trim: true },
    currency: { type: String, default: "USD" },
  },
  { timestamps: true }
);

// Optional but recommended so tokens are quick to look up (and unique if present)
InvoiceSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

export default mongoose.model("Invoice", InvoiceSchema);
