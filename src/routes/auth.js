import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const COOKIE_NAME = process.env.COOKIE_NAME || "access_token";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";
const WEB_AFTER_LOGIN = process.env.WEB_AFTER_LOGIN || "/";

function sign(user) {
  return jwt.sign(
    { sub: user.email, uid: String(user._id), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: COOKIE_SECURE ? "none" : "lax",
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: COOKIE_SECURE ? "none" : "lax",
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN,
    path: "/",
  });
}

/** Return current session */
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

    if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });

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

/** Change password (user must be logged in) */
router.post("/change-password", async (req, res) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "new_password_too_short" });
    }
    const u = await User.findById(req.user.uid);
    if (!u) return res.status(404).json({ error: "not_found" });

    // Old password must match
    const ok = await u.checkPassword(oldPassword || "");
    if (!ok) return res.status(400).json({ error: "old_password_incorrect" });

    await u.setPassword(newPassword);
    u.forcePwChange = false;
    await u.save();

    // refresh cookie
    const token = sign(u);
    setAuthCookie(res, token);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "change_password_failed" });
  }
});

/** Logout */
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
