import jwt from "jsonwebtoken";

/** ===== Config ===== */
const {
  JWT_SECRET = "change-me",
  COOKIE_DOMAIN = ".pawanssiddhi.in", // ✅ allow subdomain sharing
  COOKIE_SECURE = "true",             // ✅ true for HTTPS (Vercel/Render)
  NODE_ENV = "development",
} = process.env;

const COOKIE_NAME = "ppms_jwt"; // match the name your frontend expects
const isProd = NODE_ENV === "production";
const secureFlag = String(COOKIE_SECURE).toLowerCase() === "true";

/** ================== Cookie Options ================== */
function cookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    secure: isProd && secureFlag,     // only secure cookies in prod
    sameSite: isProd ? "none" : "lax", // ✅ allow cross-subdomain cookies
    domain: isProd ? COOKIE_DOMAIN : undefined, // omit in local dev
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

/** ================== JWT Helpers ================== */
function signToken(payload, expiresIn = "30d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signAccessCookie(res, userPayload, expiresIn = "30d") {
  const token = signToken(userPayload, expiresIn);
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
    if (!raw) return next();
    const decoded = jwt.verify(raw, JWT_SECRET);

    // Normalize roles
    const role = decoded.role || "PUBLIC";
    const roles = Array.isArray(decoded.roles) ? decoded.roles : role ? [role] : [];

    // Normalize email
    const email = decoded.email || decoded.sub || null;
    req.user = { ...decoded, role, roles, email };
  } catch {
    // silently ignore invalid/expired token
  }
  next();
}

export function auth(required = true) {
  return (req, res, next) => {
    if (!required) return next();
    if (!req.user) return res.status(401).json({ error: "auth required" });
    next();
  };
}

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

export function requireMaster(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth required" });
  const master = String(process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
  const email = String(req.user.email || "").toLowerCase();
  if (master && email === master) return next();
  return res.status(403).json({ error: "forbidden" });
}
