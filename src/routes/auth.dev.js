// src/routes/auth.dev.js
import express from "express";
import { signAccessCookie, clearAccessCookie } from "../middleware/auth.js";

const router = express.Router();

/**
 * Dev-only login:
 *   POST /api/auth/dev-login
 *   Headers: x-dev-secret: <AUTH_DEV_SECRET>
 *   Body: { email, name?, role? ("ADMIN"|"EDITOR"|"STAFF"|"PUBLIC") }
 */
router.post("/dev-login", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "not found" });
  }
  const devSecret = process.env.AUTH_DEV_SECRET || "";
  if (!devSecret || req.headers["x-dev-secret"] !== devSecret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { email, name = "Dev User", role = "ADMIN" } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  // Minimal payload you want to carry inside JWT
  const payload = {
    id: email, // or a real user id if you have one
    email,
    name,
    role,
    roles: [role],
  };

  signAccessCookie(res, payload, "30d");

  res.json({ ok: true, user: payload });
});

/** Dev logout convenience */
router.post("/dev-logout", (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "not found" });
  }
  clearAccessCookie(res);
  res.json({ ok: true });
});

export default router;
