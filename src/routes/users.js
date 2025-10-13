import express from "express";
import User from "../models/User.js";
import { requireMaster } from "../middleware/auth.js";

const router = express.Router();
const DEFAULT_TEMP_PASSWORD = process.env.DEFAULT_TEMP_PASSWORD || "PSSPL@1234";

/** List users (MASTER only) */
router.get("/", requireMaster, async (_req, res) => {
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
  res.json({ items: users });
});

/** Create user (MASTER only) */
router.post("/", requireMaster, async (req, res) => {
  try {
    const { name = "", email, role = "CLIENT", password = "" } = req.body || {};
    const u = new User({ name, email: String(email).toLowerCase(), role });

    const temp = password || DEFAULT_TEMP_PASSWORD;
    await u.setPassword(temp);
    // If admin didn’t explicitly set a custom password, force change
    u.forcePwChange = !password || password === DEFAULT_TEMP_PASSWORD;
    u.createdBy = req.user?.uid || null;

    await u.save();
    const safe = u.toObject();
    delete safe.passwordHash;
    res.status(201).json({ user: safe, tempPassword: !password ? temp : null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Update role / status / name (MASTER only) */
router.patch("/:id", requireMaster, async (req, res) => {
  try {
    const { role, status, name } = req.body || {};
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });
    if (role) u.role = role;
    if (status) u.status = status;
    if (name != null) u.name = name;
    await u.save();
    const safe = u.toObject(); delete safe.passwordHash;
    res.json({ user: safe });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Reset password (MASTER only) → set default temp + require change */
router.post("/:id/reset-password", requireMaster, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });
    const temp = DEFAULT_TEMP_PASSWORD;
    await u.setPassword(temp);
    u.forcePwChange = true;
    await u.save();
    res.json({ ok: true, tempPassword: temp });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
