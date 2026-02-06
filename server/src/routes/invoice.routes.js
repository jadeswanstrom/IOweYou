import express from "express";
import Invoice from "../models/Invoice.js";
import { requireAuth } from "../middleware/requireAuth.js";
import mongoose from "mongoose";
import { sendInvoiceEmail } from "../lib/mailer.js";



const router = express.Router();

// everything here requires a valid JWT
router.use(requireAuth);

/**
 * GET /invoices
 * Optional: /invoices?status=Unpaid
 */
router.get("/", async (req, res) => {
  const { status } = req.query;

  const filter = { user: req.user.id };
  if (status && status !== "All") filter.status = status;

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
  res.json({ invoices });
});

/**
 * GET /invoices/:id  (protected)
 * returns a single invoice that belongs to the logged-in user
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid invoice id" });
  }

  const invoice = await Invoice.findOne({ _id: id, user: req.user.id });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.json({ invoice });
});

/**
 * PATCH /invoices/:id
 * body: { status }
 */
router.patch("/:id", async (req, res) => {
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
    { _id: id, user: req.user.id },    // only updates the users own invoice
    { status },
    { new: true }
  );

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.json({ invoice });
});



/**
 * POST /invoices
 * body: { name, client, total, date?, status?, receipt?, recipientEmails?, notes? }
 */
router.post("/", async (req, res) => {
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
});

router.post("/:id/send", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid invoice id" });
  }

  const invoice = await Invoice.findOne({ _id: id, user: req.user.id });
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  // parse recipientEmails (comma separated)
  const raw = (invoice.recipientEmails || "").trim();
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

  // PayPal link with auto-filled amount (PayPal.Me style)
  let paypalLink = "";
  const base = process.env.PAYPAL_ME_BASE;
  if (base) {
    paypalLink = `${base.replace(/\/$/, "")}/${Number(invoice.total).toFixed(2)}`;
  }

  await sendInvoiceEmail({
    to: recipients.join(","),
    invoice,
    paypalLink,
  });

  res.json({ ok: true, sentTo: recipients });
});


export default router;
