import express from "express";
import User from "../models/User.js";
import { signAccessCookie, clearAccessCookie } from "../middleware/auth.js";

const router = express.Router();

/* ========= Config ========= */
const WEB_AFTER_LOGIN = process.env.WEB_AFTER_LOGIN || "/";

/* ========= Routes ========= */

/** Return current session (public-friendly, never cached) */
router.get("/me", async (req, res) => {
  try {
    // Prevent 304/stale cache
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Vary", "Cookie");

    if (!req.user?.uid) {
      return res.json({ role: "PUBLIC", email: null, name: null, isMaster: false });
    }

    const u = await User.findById(req.user.uid).lean();
    if (!u || u.status === "DISABLED") {
      return res.json({ role: "PUBLIC", email: null, name: null, isMaster: false });
    }

    const master = String(process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
    const isMaster = String(u.email || "").toLowerCase() === master;

    return res.json({
      role: u.role,
      email: u.email,
      name: u.name || null,
      id: String(u._id),
      isMaster,
    });
  } catch (e) {
    console.error("GET /auth/me error:", e);
    return res.status(500).json({ error: "failed_me" });
  }
});

/** Email + password login (returns requirePasswordChange flag) */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "email_and_password_required" });
    }

    const user = await User.findOne({ email, status: "ACTIVE" });
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    // ✅ Set cross-subdomain cookie: SameSite=None; Secure; Domain=.pawanssiddhi.in
    signAccessCookie(res, {
      uid: String(user._id),
      email: user.email,
      role: user.role,
    }, "7d");

    const master = String(process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
    const isMaster = String(user.email || "").toLowerCase() === master;

    return res.json({
      ok: true,
      role: user.role,
      email: user.email,
      name: user.name || null,
      id: String(user._id),
      isMaster,
      redirect: WEB_AFTER_LOGIN,
      requirePasswordChange: !!user.forcePwChange,
    });
  } catch (e) {
    console.error("POST /auth/login error:", e);
    return res.status(500).json({ error: "login_failed" });
  }
});

/** Change password (requires auth, verifies old password) */
router.post("/change-password", async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: "auth_required" });

    const { oldPassword = "", newPassword = "" } = req.body || {};
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "new_password_too_short" });
    }

    const u = await User.findById(req.user.uid);
    if (!u) return res.status(404).json({ error: "not_found" });

    const ok = await u.checkPassword(oldPassword);
    if (!ok) return res.status(400).json({ error: "old_password_incorrect" });

    await u.setPassword(newPassword);
    u.forcePwChange = false;
    await u.save();

    // refresh cookie with fresh claims
    signAccessCookie(res, {
      uid: String(u._id),
      email: u.email,
      role: u.role,
    }, "7d");

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /auth/change-password error:", e);
    return res.status(500).json({ error: "change_password_failed" });
  }
});

/** Logout */
router.post("/logout", (_req, res) => {
  clearAccessCookie(res);
  res.json({ ok: true });
});

export default router;
