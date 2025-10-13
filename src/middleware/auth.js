import jwt from "jsonwebtoken";

/** ===== Config ===== */
const {
  JWT_SECRET = "change-me",
  COOKIE_DOMAIN = "localhost",
  COOKIE_SECURE = "false",
} = process.env;

const COOKIE_NAME = "access_token";
const secureFlag = String(COOKIE_SECURE).toLowerCase() === "true";

/** For localhost we usually omit domain so the cookie actually sets. */
function cookieOptions() {
  const opts = {
    httpOnly: true,
    sameSite: "lax",
    secure: secureFlag,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  };
  if (COOKIE_DOMAIN && COOKIE_DOMAIN !== "localhost") {
    opts.domain = COOKIE_DOMAIN;
  }
  return opts;
}

/** Sign a JWT for the user payload you pass */
function signToken(payload, expiresIn = "30d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/** Set the auth cookie on the response */
export function signAccessCookie(res, userPayload, expiresIn = "30d") {
  const token = signToken(userPayload, expiresIn);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

/** Clear cookie (logout) */
export function clearAccessCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...cookieOptions(),
    maxAge: 0,
  });
}

/** Attach req.user if cookie is valid (non-blocking) */
export function attachUser(req, _res, next) {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return next();
    const decoded = jwt.verify(raw, JWT_SECRET);
    // Normalize roles
    const role = decoded.role || "PUBLIC";
    const roles = Array.isArray(decoded.roles) ? decoded.roles : role ? [role] : [];
    // Also expose email consistently (some tokens carry it under `sub`)
    const email = decoded.email || decoded.sub || null;
    req.user = { ...decoded, role, roles, email };
  } catch {
    // ignore invalid/expired token
  }
  next();
}

/** Middleware to require that a user is present (from cookie) */
export function auth(required = true) {
  return (req, res, next) => {
    if (!required) return next();
    if (!req.user) return res.status(401).json({ error: "auth required" });
    next();
  };
}

/** Require one of the roles */
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "auth required" });
    const roles = req.user.roles || [];
    if (allowed.length === 0 || roles.some((r) => allowed.includes(r))) {
      return next();
    }
    return res.status(403).json({ error: "forbidden" });
  };
}

/** 🚫 Master-only guard: only MASTER_ADMIN_EMAIL can pass */
export function requireMaster(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth required" });
  const master = String(process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
  const email = String(req.user.email || "").toLowerCase();
  if (master && email === master) return next();
  return res.status(403).json({ error: "forbidden" });
}
