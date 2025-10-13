// src/routes/users.js
import express from "express";
import User from "../models/User.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

// Helper: default temp password
const DEFAULT_TEMP_PW = process.env.DEFAULT_TEMP_PASSWORD || "PSSPL@1234";

/** List users (ADMIN only) */
router.get("/", requireRole("ADMIN"), async (_req, res) => {
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
  res.json({ items: users });
});

/** Create user (ADMIN only)
 * If password not provided, a default temp password is set and returned once.
 * Always sets forcePwChange=true so the user must change it after first login.
 */
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name = "", email, role = "CLIENT", password = "" } = req.body || {};
    const u = new User({ name, email: String(email).toLowerCase().trim(), role });

    const temp = password || DEFAULT_TEMP_PW;
    await u.setPassword(temp);
    u.forcePwChange = true;                   // ⬅ require change on first login
    u.createdBy = req.user?.uid || null;
    await u.save();

    const safe = u.toObject();
    delete safe.passwordHash;

    res.status(201).json({
      user: safe,
      tempPassword: password ? null : temp,   // only reveal if we auto-set it
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Update role / status / name (ADMIN) */
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { role, status, name } = req.body || {};
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });

    if (role) u.role = role;
    if (status) u.status = status;
    if (name != null) u.name = name;

    await u.save();

    const safe = u.toObject();
    delete safe.passwordHash;
    res.json({ user: safe });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Reset password (ADMIN) → returns new temp password once
 * Also sets forcePwChange=true so they must set a new one.
 */
router.post("/:id/reset-password", requireRole("ADMIN"), async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });

    const temp = DEFAULT_TEMP_PW;             // or generate a random one
    await u.setPassword(temp);
    u.forcePwChange = true;                   // ⬅ force change after reset
    await u.save();

    res.json({ ok: true, tempPassword: temp });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
