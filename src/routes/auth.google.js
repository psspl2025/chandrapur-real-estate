import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  WEB_AFTER_LOGIN,
} = process.env;

const APP_HOME = WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in/";

// Ensure env is present
const needConfig = (_req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: "google_oauth_not_configured" });
  }
  next();
};

// Sanity check
router.get("/ping", (_req, res) => res.json({ ok: true }));

// Connection status for the logged-in user
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

// Kick off Google OAuth: send current user id in `state`
router.get("/login", needConfig, (req, res) => {
  const uid = req.user?._id;
  if (!uid) return res.status(401).json({ error: "login_required" });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: String(uid),
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Helper: fetch with timeout
async function postFormWithTimeout(url, form, ms = 12000) {
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

// Handle callback: use req.user OR fallback to `state`
router.get("/callback", needConfig, async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code) return res.redirect(APP_HOME + "?gdrive_error=missing_code");

    // Prefer req.user first; otherwise fall back to state
    let userId = req.user?._id ? String(req.user._id) : state;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.redirect(APP_HOME + "?gdrive_error=not_logged_in");
    }

    // Exchange code → tokens
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
      return res.redirect(`${APP_HOME}?gdrive_error=${reason}`);
    }

    // Persist tokens for that user
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          gdrive: {
            access_token: tokens.access_token || null,
            refresh_token: tokens.refresh_token || null, // may be null on subsequent consents
            scope: tokens.scope || null,
            token_type: tokens.token_type || null,
            expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
          },
        },
      },
      { strict: false }
    ).exec();

    // Done → back to app
    return res.redirect(APP_HOME + "?gdrive=connected");
  } catch (e) {
    const msg = encodeURIComponent(String(e?.message || e));
    return res.redirect(`${APP_HOME}?gdrive_error=${msg}`);
  }
});

export default router;
