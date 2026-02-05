import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// POST /auth/register  (auto-login: returns token)
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "firstName, lastName, email, password required" });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name,
    email,
    passwordHash,
  });

  // Create JWT token right after signup 
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Return token + user
  res.status(201).json({
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
    },
  });
});


// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// GET /auth/me  (protected)
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("_id email firstName lastName name");
  res.json({ user });
});


export default router;
