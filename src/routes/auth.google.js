import express from "express";
import User from "../models/User.js"; // adjust path if needed

const router = express.Router();
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, WEB_AFTER_LOGIN } = process.env;

const needConfig = (_req, res, next) =>
  (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)
    ? res.status(500).json({ error: "google_oauth_not_configured" }) : next();

// GET /api/auth/google/login
router.get("/login", needConfig, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "login_required" });
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: String(req.user._id || "")
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`);
});

// GET /api/auth/google/callback
router.get("/callback", needConfig, async (req, res) => {
  try {
    const body = new URLSearchParams({
      code: String(req.query.code || ""),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokens = await r.json();
    if (!r.ok) throw new Error(tokens.error || "token_exchange_failed");

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          gdrive: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
            token_type: tokens.token_type,
            expiry_date: Date.now() + (tokens.expires_in || 0) * 1000,
          },
        },
      }).exec();
    }
    res.redirect((WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in") + "?gdrive=connected");
  } catch (e) {
    res.redirect((WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in") + `?gdrive_error=${encodeURIComponent(String(e.message||e))}`);
  }
});

export default router;
