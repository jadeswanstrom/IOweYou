import express from "express";
import mongoose from "mongoose";
import { randomBytes } from "crypto";

import Invoice from "../models/Invoice.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { sendInvoiceEmail } from "../lib/mailer.js";

const router = express.Router();

// everything here requires a valid JWT
router.use(requireAuth);

// ---------- helpers ----------
async function generateUniqueToken() {
  for (let i = 0; i < 5; i++) {
    const t = randomBytes(24).toString("base64url");
    const exists = await Invoice.exists({ shareToken: t });
    if (!exists) return t;
  }
  throw new Error("Could not generate unique share token");
}

// ---------- routes ----------

/**
 * GET /invoices
 * Optional: /invoices?status=Unpaid
 */
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { user: req.user.id };
    if (status && status !== "All") filter.status = status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (err) {
    console.error("GET INVOICES ERROR:", err);
    res.status(500).json({ error: "Failed to load invoices" });
  }
});

/**
 * GET /invoices/:id  (protected)
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json({ invoice });
  } catch (err) {
    console.error("GET INVOICE ERROR:", err);
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

/**
 * PATCH /invoices/:id
 * body: { status }
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["Unpaid", "Pending", "Paid", "Archived"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { status },
      { new: true }
    );

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json({ invoice });
  } catch (err) {
    console.error("PATCH INVOICE ERROR:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

/**
 * POST /invoices
 */
router.post("/", async (req, res) => {
  try {
    const { name, client, total, date, status, receipt, recipientEmails, notes } = req.body;

    if (!name || !client || total === undefined) {
      return res.status(400).json({ error: "name, client, total required" });
    }

    const invoice = await Invoice.create({
      user: req.user.id,
      name: String(name).trim(),
      client: String(client).trim(),
      recipientEmails: recipientEmails ? String(recipientEmails).trim() : "",
      notes: notes ? String(notes).trim() : "",
      total: Number(total),
      date: date ? new Date(date) : new Date(),
      status: status || "Unpaid",
      receipt: receipt || undefined,
    });

    res.status(201).json({ invoice });
  } catch (err) {
    console.error("CREATE INVOICE ERROR:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/**
 * POST /invoices/:id/publish
 * Creates/ensures shareToken + snapshots payout info
 */
router.post("/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const user = await User.findById(req.user.id);
    const paypalMeRaw = (user?.paypalMe || "").trim();
    const currency = (user?.currency || "USD").trim().toUpperCase();

    if (!paypalMeRaw) {
      return res.status(400).json({
        error: "Set your PayPal.Me in Settings before sharing (users/me/payout).",
      });
    }

    const paypalMeBase = paypalMeRaw.startsWith("http")
      ? paypalMeRaw.replace(/\/$/, "")
      : `https://paypal.me/${paypalMeRaw.replace(/^\/+/, "")}`;

    if (!invoice.shareToken) {
      invoice.shareToken = await generateUniqueToken();
    }

    invoice.shareEnabled = true;
    invoice.payeePaypalMe = paypalMeBase;
    invoice.currency = currency;

    await invoice.save();

    res.json({
      ok: true,
      invoice,
      shareToken: invoice.shareToken,
      sharePath: `/pay/${invoice.shareToken}`,
    });
  } catch (err) {
    console.error("PUBLISH INVOICE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to publish invoice" });
  }
});

/**
 * POST /invoices/:id/send
 * Ensures invoice is published + emails recipients + returns shareUrl to client
 */
router.post("/:id/send", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // parse recipientEmails (comma/newline separated)
    const raw = String(invoice.recipientEmails || "").trim();
    const recipients = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipientEmails provided for this invoice" });
    }

    // basic safety limits
    if (recipients.length > 5) {
      return res.status(400).json({ error: "Too many recipients (max 5)" });
    }

    // Ensure invoice is share-enabled & has token + payout snapshot
    if (!invoice.shareEnabled || !invoice.shareToken || !invoice.payeePaypalMe) {
      const user = await User.findById(req.user.id);
      const paypalMeRaw = (user?.paypalMe || "").trim();
      const currency = (user?.currency || "USD").trim().toUpperCase();

      if (!paypalMeRaw) {
      return res.status(400).json({
      error: "Set your PayPal.Me in Settings before sending (users/me).",
      });

      }

      const paypalMeBase = paypalMeRaw.startsWith("http")
        ? paypalMeRaw.replace(/\/$/, "")
        : `https://paypal.me/${paypalMeRaw.replace(/^\/+/, "")}`;

      if (!invoice.shareToken) invoice.shareToken = await generateUniqueToken();
      invoice.shareEnabled = true;
      invoice.payeePaypalMe = paypalMeBase;
      invoice.currency = currency;

      await invoice.save();
    }

    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    const shareUrl = `${frontend}/pay/${invoice.shareToken}`;

    const base = invoice.payeePaypalMe.replace(/\/$/, "");
    const amount = Number(invoice.total).toFixed(2);
    const currency = (invoice.currency || "USD").trim().toUpperCase();

  // PayPal.Me supports amount+currency like 10CAD / 10USD
   const paypalLink = `${base}/${amount}${currency}`;


    await sendInvoiceEmail({
      to: recipients.join(","),
      invoice,
      paypalLink,
      shareUrl, // extra field is safe to include
    });

    res.json({ ok: true, sentTo: recipients, shareUrl });
  } catch (err) {
    console.error("SEND INVOICE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to send invoice" });
  }
});

export default router;
