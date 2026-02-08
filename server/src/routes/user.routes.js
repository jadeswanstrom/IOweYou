import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const user = await User.findById(req.user.id).select("firstName lastName name email paypalMe currency");
  res.json({ user });
});

router.patch("/me", async (req, res) => {
  const { paypalMe, currency } = req.body;

  const update = {};
  if (paypalMe !== undefined) update.paypalMe = String(paypalMe).trim();
  if (currency !== undefined) update.currency = String(currency).trim().toUpperCase();

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
    .select("firstName lastName name email paypalMe currency");

  res.json({ user });
});

export default router;
