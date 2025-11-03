// src/routes/auth.google.js
import express from "express";
const router = express.Router();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, WEB_AFTER_LOGIN } = process.env;

const needConfig = (_req, res, next) =>
  (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)
    ? res.status(500).json({ error: "google_oauth_not_configured" }) : next();

router.get("/ping", (_req, res) => res.json({ ok: true }));

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
    state: String(req.user?._id || ""),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`);
});

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
    const back = WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in/";
    res.redirect(`${back}?gdrive=connected`);
  } catch (e) {
    const back = WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in/";
    res.redirect(`${back}?gdrive_error=${encodeURIComponent(String(e.message || e))}`);
  }
});

export default router;
