// src/routes/auth.finalize.js
import express from "express";
import jwt from "jsonwebtoken";
import { signAccessCookie } from "../middleware/auth.js";

const router = express.Router();

router.post("/finalize", (req, res) => {
  try {
    const token = String(req.body?.token || "");
    if (!token) return res.status(400).json({ error: "missing_token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.uid) return res.status(400).json({ error: "invalid_token" });

    // Set persistent session cookie
    signAccessCookie(res, {
      uid: decoded.uid,
      role: "ADMIN",
      email: decoded.email || null,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /auth/finalize error:", e);
    res.status(500).json({ error: "finalize_failed" });
  }
});

export default router;
