import jwt from "jsonwebtoken";

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

function cookieOpts() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",               // ✅ first-party flow
    secure: isProd ? true : secureFlag,
    // domain: undefined,          // ✅ host-only cookie
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signAccessCookie(res, payload, expiresIn = "7d") {
  const token = signToken(payload, expiresIn);
  res.cookie(COOKIE_NAME, token, cookieOpts());
  return token;
}

export function clearAccessCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts(), maxAge: 0 });
}

export function attachUser(req, _res, next) {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return next();
    const decoded = jwt.verify(raw, JWT_SECRET);

    const uid = decoded.uid || decoded.sub || decoded.id || null;
    const email = decoded.email || decoded.sub || null;
    const role = decoded.role || "PUBLIC";
    const roles = Array.isArray(decoded.roles) ? decoded.roles : [role];

    req.user = {
      ...decoded,
      uid,
      id: uid,
      email,
      role,
      roles,
      isMaster:
        !!MASTER_ADMIN_EMAIL &&
        email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase(),
    };
  } catch {
    // ignore invalid/expired tokens
  }
  next();
}
