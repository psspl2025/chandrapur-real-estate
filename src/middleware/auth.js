import jwt from "jsonwebtoken";

/** ===== Config ===== */
const {
  JWT_SECRET = "change-me",
  NODE_ENV = "development",
  COOKIE_NAME: ENV_COOKIE_NAME,
  COOKIE_SECURE = "true",
  MASTER_ADMIN_EMAIL = "",
} = process.env;

const COOKIE_NAME = ENV_COOKIE_NAME || "access";
const isProd = NODE_ENV === "production";
const secureFlag = String(COOKIE_SECURE).toLowerCase() === "true";

/** ================== Cookie Options ================== */
function cookieOpts() {
  return {
    httpOnly: true,
    path: "/",
    // same-origin OAuth flow (Option B) works with Lax;
    // set to "none" only if you purposely need cross-site
    sameSite: isProd ? "lax" : "lax",
    secure: isProd ? true : secureFlag,
    // host-only cookie in prod (no domain) to scope to psspl.pawanssiddhi.in
    // NOTE: omit "domain" so Chrome treats it as host-only
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  };
}

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

export function signAccessCookie(res, userPayload, expiresIn = "7d") {
  const claims = buildClaims(userPayload);
  const token = signToken(claims, expiresIn);
  res.cookie(COOKIE_NAME, token, cookieOpts());
  return token;
}

export function clearAccessCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts(), maxAge: 0 });
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
    // Invalid/expired tokens → treat as anonymous
  }
  next();
}

/** Require that a user is authenticated (optionally allow anonymous) */
export function auth(required = true) {
  return (req, res, next) => {
    if (!required) return next();
    if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
    next();
  };
}

/** ✅ This is the missing export your routes expect */
export function requireRole(allowed) {
  // Supports both: requireRole("ADMIN") and requireRole(["EDITOR","ADMIN"])
  const allowList = Array.isArray(allowed) ? allowed : [allowed];

  return (req, res, next) => {
    if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
    const roles = req.user.roles || [];
    if (!allowList.length || roles.some((r) => allowList.includes(r))) return next();
    return res.status(403).json({ error: "forbidden" });
  };
}

/** Master admin guard */
export function requireMaster(req, res, next) {
  if (!req.user?.uid) return res.status(401).json({ error: "auth required" });
  const email = String(req.user.email || "").toLowerCase();
  const master = String(MASTER_ADMIN_EMAIL || "").toLowerCase();
  if (master && email === master) return next();
  return res.status(403).json({ error: "forbidden" });
}
