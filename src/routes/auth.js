// src/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* ========= Config ========= */
const JWT_SECRET     = process.env.JWT_SECRET || "dev-secret";const COOKIE_NAME    = process.env.COOKIE_NAME || "access"; // must match middleware/attachUser
const COOKIE_DOMAIN  = process.env.COOKIE_DOMAIN || undefined;    // undefined on localhost
const COOKIE_SECURE  = String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";
const SAME_SITE      = COOKIE_SECURE ? "none" : "lax";            // cross-site when secure
const WEB_AFTER_LOGIN = process.env.WEB_AFTER_LOGIN || "/";

/* ========= Helpers ========= */
function sign(user) {
  return jwt.sign(
    {
      sub: user.email,            // subject = email for convenience
      uid: String(user._id),      // canonical id
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: SAME_SITE,
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN, // ok if undefined
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: SAME_SITE,
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN,
    path: "/",
  });
}

/* ========= Routes ========= */

/** Return current session (public-friendly) */
router.get("/me", async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.json({ role: "PUBLIC", email: null, name: null, isMaster: false });
    }

    const u = await User.findById(req.user.uid).lean();
    if (!u || u.status === "DISABLED") {
      return res.json({ role: "PUBLIC", email: null, name: null, isMaster: false });
    }

    const master = String(process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
    const isMaster = String(u.email || "").toLowerCase() === master;

    res.json({
      role: u.role,
      email: u.email,
      name: u.name || null,
      id: String(u._id),
      isMaster,
    });
  } catch {
    res.status(500).json({ error: "failed_me" });
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

    const token = sign(user);
    setAuthCookie(res, token);

    res.json({
      ok: true,
      role: user.role,
      email: user.email,
      name: user.name || null,
      redirect: WEB_AFTER_LOGIN,
      requirePasswordChange: !!user.forcePwChange,
    });
  } catch (e) {
    console.error("POST /auth/login error:", e);
    res.status(500).json({ error: "login_failed" });
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

    // Require old password to match
    const ok = await u.checkPassword(oldPassword);
    if (!ok) return res.status(400).json({ error: "old_password_incorrect" });

    await u.setPassword(newPassword);
    u.forcePwChange = false; // clear the flag after success
    await u.save();

    // refresh cookie with fresh claims
    const token = sign(u);
    setAuthCookie(res, token);

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /auth/change-password error:", e);
    res.status(500).json({ error: "change_password_failed" });
  }
});

/** Logout */
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
