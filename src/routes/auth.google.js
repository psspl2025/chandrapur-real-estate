// src/routes/auth.google.js
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  WEB_AFTER_LOGIN,
  JWT_SECRET,
} = process.env;

const APP_HOME = WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in/";

/* -------------------------- Middleware --------------------------- */
const needConfig = (_req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: "google_oauth_not_configured" });
  }
  next();
};

// Prevent all caching
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Small helper for token exchange
async function postFormWithTimeout(url, form, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: ctrl.signal,
    });
    return resp;
  } finally {
    clearTimeout(t);
  }
}

/* --------------------------- Routes ------------------------------ */

// Ping
router.get("/ping", (_req, res) => res.json({ ok: true }));

/**
 * Step 1 – Start OAuth flow
 */
router.get("/login", needConfig, (req, res) => {
  const cookieUid = req.user?.uid || req.user?.id || req.user?._id;
  const queryFallback = (req.query.uid || req.query.state || "").toString();
  const uid = cookieUid ? String(cookieUid) : queryFallback;
  const redirect = String(req.query.redirect || APP_HOME);

  if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
    return res.status(401).json({ error: "login_required" });
  }

  // include both uid and redirect in state
  const state = encodeURIComponent(JSON.stringify({ uid, redirect }));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * Step 2 – Google callback
 *  • exchanges code for tokens
 *  • stores them in DB
 *  • issues a short-lived JWT in URL hash → frontend
 */
router.get("/callback", needConfig, async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const stateRaw = String(req.query.state || "");
    if (!code) return res.redirect(APP_HOME + "?gdrive_error=missing_code");

    let stateObj = {};
    try {
      stateObj = JSON.parse(decodeURIComponent(stateRaw || "{}"));
    } catch {}
    const stateUid = stateObj.uid || "";
    const redirect = stateObj.redirect || APP_HOME;

    const cookieUid = req.user?.uid || req.user?.id || req.user?._id || "";
    const userId = String(cookieUid || stateUid);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.redirect(APP_HOME + "?gdrive_error=not_logged_in");
    }

    // Exchange code → token
    const form = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const tokenResp = await postFormWithTimeout(
      "https://oauth2.googleapis.com/token",
      form,
      15000
    );
    const tokens = await tokenResp.json();

    if (!tokenResp.ok) {
      const reason = encodeURIComponent(tokens?.error || "token_exchange_failed");
      return res.redirect(`${redirect}?gdrive_error=${reason}`);
    }

    // Save tokens in user doc
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          gdrive: {
            access_token: tokens.access_token || null,
            refresh_token: tokens.refresh_token || null,
            scope: tokens.scope || null,
            token_type: tokens.token_type || null,
            expiry_date: tokens.expires_in
              ? Date.now() + tokens.expires_in * 1000
              : null,
          },
        },
      },
      { strict: false }
    ).exec();

    // short-lived exchange token (5 min)
    const exchangeToken = jwt.sign(
      { uid: userId },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    // redirect to frontend hash with token
    return res.redirect(`${redirect}#/gdrive-callback?token=${encodeURIComponent(exchangeToken)}`);
  } catch (e) {
    const msg = encodeURIComponent(String(e?.message || e));
    return res.redirect(`${APP_HOME}?gdrive_error=${msg}`);
  }
});

/**
 * Step 3 – Connection status
 */
router.get("/status", (req, res) => {
  const g = req.user?.gdrive;
  res.json({
    connected: !!(g?.access_token || g?.refresh_token),
    has_refresh: !!g?.refresh_token,
    expires_in_s: g?.expiry_date
      ? Math.max(0, Math.floor((g.expiry_date - Date.now()) / 1000))
      : null,
  });
});

export default router;
