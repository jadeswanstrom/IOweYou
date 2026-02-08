import express from "express";
import Invoice from "../models/Invoice.js";

const router = express.Router();

// Public read by token (no auth)
router.get("/invoices/:token", async (req, res) => {
  const { token } = req.params;

  const invoice = await Invoice.findOne({
    shareToken: token,
    shareEnabled: true,
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found or not shared" });
  }

  // Build PayPal link with amount + currency
  // Format: https://paypal.me/username/10USD  :contentReference[oaicite:1]{index=1}
  let paypalLink = "";
  if (invoice.payeePaypalMe) {
    const amount = Number(invoice.total || 0).toFixed(2);
    const currency = (invoice.currency || "USD").toUpperCase();
    paypalLink = `${invoice.payeePaypalMe.replace(/\/$/, "")}/${amount}${currency}`;
  }

  // Only return safe fields (no user id, no recipient emails)
  res.json({
    invoice: {
      name: invoice.name,
      client: invoice.client,
      notes: invoice.notes,
      total: invoice.total,
      currency: invoice.currency,
      date: invoice.date,
      status: invoice.status,
      receiptUrl: invoice.receipt?.url || "",
      paypalLink,
    },
  });
});

export default router;
