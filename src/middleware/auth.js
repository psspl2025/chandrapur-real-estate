// src/middleware/auth.js
import jwt from "jsonwebtoken";

/** ===== Config ===== */
const {
  JWT_SECRET = "change-me",
  NODE_ENV = "development",
  COOKIE_NAME: ENV_COOKIE_NAME,
  COOKIE_DOMAIN = ".pawanssiddhi.in",
  COOKIE_SECURE = "true",
  MASTER_ADMIN_EMAIL = "",
} = process.env;

// 👉 Use the same name everywhere (default per your spec)
export const COOKIE_NAME = ENV_COOKIE_NAME || "access_token";
const isProd = NODE_ENV === "production";
const secureFlag = String(COOKIE_SECURE).toLowerCase() === "true";

/** ================== JWT Helpers ================== */
function signToken(payload, expiresIn = "7d") {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/** Build consistent claims */
export function buildClaims({ id, _id, email, role, roles, ...rest }) {
  const uid =
    String(id || _id || rest.uid || rest.sub || rest.id || "").trim() || null;
  const primaryRole = role || (Array.isArray(roles) && roles[0]) || "PUBLIC";
  const roleList = Array.isArray(roles) ? roles : primaryRole ? [primaryRole] : [];
  return {
    ...rest,
    sub: email || rest.sub || null,
    email: email || rest.email || null,
    uid,
    role: primaryRole,
    roles: roleList,
  };
}

/** ================== Cookie Writers (EXACT in prod) ================== */
export function signAccessCookie(res, userPayload, expiresIn = "7d") {
  const claims = buildClaims(userPayload);
  const token = signToken(claims, expiresIn);

  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7d

  if (isProd) {
    // ⚠️ EXACT attributes you requested for cross-subdomain cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: COOKIE_DOMAIN, // e.g. ".pawanssiddhi.in" (must include leading dot)
      path: "/",
      maxAge,
    });
  } else {
    // Dev: readable from same-origin only
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureFlag, // usually false on http://localhost
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }
  return token;
}

export function clearAccessCookie(res) {
  if (isProd) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: COOKIE_DOMAIN,
      path: "/",
    });
  } else {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      path: "/",
    });
  }
}

/** ================== Middleware ================== */
export function attachUser(req, _res, next) {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw || !JWT_SECRET) return next();

    const decoded = jwt.verify(raw, JWT_SECRET);

    // Normalize uid/email/roles
    const uid =
      String(decoded.uid || decoded.sub || decoded.id || decoded._id || "")
        .trim() || null;
    const role = decoded.role || "PUBLIC";
    const roles = Array.isArray(decoded.roles) ? decoded.roles : role ? [role] : [];
    const email = decoded.email || decoded.sub || null;

    req.user = {
      ...decoded,
      uid,
      id: uid, // compatibility for any code reading req.user.id
      role,
      roles,
      email,
      isMaster:
        !!MASTER_ADMIN_EMAIL &&
        String(email || "").toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase(),
    };
  } catch {
    // Invalid/expired tokens fall through as anonymous
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
  const email = String(req.user.email || "").toLowerCase();
  const master = String(MASTER_ADMIN_EMAIL || "").toLowerCase();
  if (master && email === master) return next();
  return res.status(403).json({ error: "forbidden" });
}
