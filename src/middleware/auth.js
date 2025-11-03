// src/middleware/auth.js
import jwt from "jsonwebtoken";

/** ===== Config ===== */
const {
  JWT_SECRET = "change-me",
  COOKIE_DOMAIN = ".pawanssiddhi.in", // allow cross-subdomain cookies
  COOKIE_SECURE = "true",             // true on HTTPS (prod)
  NODE_ENV = "development",
  COOKIE_NAME: ENV_COOKIE_NAME,       // prefer env if provided
  MASTER_ADMIN_EMAIL = "",
} = process.env;

const COOKIE_NAME = ENV_COOKIE_NAME || "access"; // align with your .env
const isProd = NODE_ENV === "production";
const secureFlag = String(COOKIE_SECURE).toLowerCase() === "true";

/** ================== Cookie Options ================== */
function cookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    secure: isProd && secureFlag,               // secure cookie in prod
    sameSite: isProd ? "none" : "lax",          // cross-subdomain in prod
    domain: isProd ? COOKIE_DOMAIN : undefined, // omit for localhost/dev
    maxAge: 30 * 24 * 60 * 60 * 1000,           // 30 days
  };
}

/** ================== JWT Helpers ================== */
function signToken(payload, expiresIn = "30d") {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/** Build consistent claims */
export function buildClaims({ id, _id, email, role, roles, ...rest }) {
  const uid = String(id || _id || rest.uid || rest.sub || rest.id || "");
  const primaryRole = role || (Array.isArray(roles) && roles[0]) || "PUBLIC";
  const roleList = Array.isArray(roles) ? roles : primaryRole ? [primaryRole] : [];
  return {
    ...rest,
    sub: email || rest.sub || null,
    email: email || rest.email || null,
    uid: uid || null,
    role: primaryRole,
    roles: roleList,
  };
}

export function signAccessCookie(res, userPayload, expiresIn = "30d") {
  const claims = buildClaims(userPayload);
  const token = signToken(claims, expiresIn);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

export function clearAccessCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
}

/** ================== Middleware ================== */
export function attachUser(req, _res, next) {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw || !JWT_SECRET) return next();

    const decoded = jwt.verify(raw, JWT_SECRET);

    // Normalize uid/email/roles
    const uid = String(decoded.uid || decoded.sub || decoded.id || decoded._id || "");
    const role = decoded.role || "PUBLIC";
    const roles = Array.isArray(decoded.roles) ? decoded.roles : role ? [role] : [];
    const email = (decoded.email || decoded.sub || null) ?? null;

    req.user = {
      ...decoded,
      uid: uid || null,
      id: uid || null, // compatibility for code that reads req.user.id
      role,
      roles,
      email,
      isMaster:
        !!MASTER_ADMIN_EMAIL &&
        String(email || "").toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase(),
    };
  } catch {
    // Silently ignore invalid/expired token; treat as anonymous
  }
  next();
}

/** ================== Guards ================== */
export function auth(required = true) {
  return (req, res, next) => {
    if (!required) return next();
    if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
    next();
  };
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
    const roles = req.user.roles || [];
    if (!allowed.length || roles.some((r) => allowed.includes(r))) return next();
    return res.status(403).json({ error: "forbidden" });
  };
}

export function requireMaster(req, res, next) {
  if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
  const master = String(MASTER_ADMIN_EMAIL || "").toLowerCase();
  const email = String(req.user.email || "").toLowerCase();
  if (master && email === master) return next();
  return res.status(403).json({ error: "forbidden" });
}
