import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyPassword } from "../utils/password.js";

const router = express.Router();
const COOKIE_NAME   = "access"; // keep same as your attachUser expects
const JWT_SECRET    = process.env.JWT_SECRET || "dev-secret";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || "false") === "true";
const SAME_SITE     = COOKIE_SECURE ? "none" : "lax";

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: SAME_SITE,
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/local/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid_login" });
    if (user.status === "DISABLED") return res.status(403).json({ error: "disabled" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_login" });

    setAuthCookie(res, { sub: user._id, role: user.role, email: user.email });
    return res.json({ ok: true, role: user.role, email: user.email });
  } catch (e) {
    console.error("POST /auth/local/login error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
