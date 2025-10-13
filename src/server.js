// src/server.js

// ✅ Load env FIRST so routes see the vars at import-time
import "dotenv/config";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDB } from "./db.js";

// Models (for bootstrap)
import User from "./models/User.js";

// Auth helpers/middleware & routers
import { attachUser } from "./middleware/auth.js"; // parses JWT cookie → req.user
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";       // admin user mgmt
import devAuthRouter from "./routes/auth.dev.js";

// Feature routers
import publicRouter from "./routes/public.js";
import propertiesRouter from "./routes/properties.js";
import projectsRouter from "./routes/projects.js";
import poisRouter from "./routes/pois.js";
import importRouter from "./routes/import.js";

const app = express();

/* ------------------------- CORS & basics ------------------------- */
// If you want cookies (JWT) to work, you MUST set explicit origins (not "*")
const DEFAULT_ORIGIN = "http://localhost:5173";
const allowOrigins = (process.env.CORS_ORIGIN || DEFAULT_ORIGIN)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Allow listed origins + credentialed requests (cookies)
const corsOptions = {
  origin(origin, cb) {
    // allow REST tools / same-origin calls (no Origin header) and whitelisted origins
    if (!origin || allowOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// Apply CORS and handle preflight early
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight for all routes

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Important for secure cookies behind proxies (when COOKIE_SECURE=true in prod)
app.set("trust proxy", 1);

// 🔐 attach req.user for all subsequent routes (reads JWT from cookie)
app.use(attachUser);

/* ---------------------------- Static ---------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

/* --------------------- Quick config snapshot -------------------- */
const OSRM_URL = process.env.OSRM_URL || "";
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || "";
const ROUTE_PROFILE = process.env.ROUTE_PROFILE || "driving"; // driving | foot | bike

/* ----------------------------- Health --------------------------- */
app.get("/health", (_req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    ok: true,
    db: states[mongoose.connection.readyState] || "unknown",
    routing: {
      osrm_url: OSRM_URL || null,
      mapbox: MAPBOX_TOKEN ? "configured" : null,
      profile: ROUTE_PROFILE,
    },
    env: process.env.NODE_ENV || "development",
    cors: { allowOrigins },
    auth: {
      local_login_enabled: true, // email + password
      dev_login_enabled: process.env.NODE_ENV !== "production" && !!process.env.AUTH_DEV_SECRET,
      google_oauth_enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      cookie: {
        domain: process.env.COOKIE_DOMAIN || null,
        secure: String(process.env.COOKIE_SECURE || "false"),
      },
    },
  });
});

/* ----------------------------- Routes --------------------------- */
// Auth (login/logout/me)
app.use("/api/auth", authRouter);
if (process.env.NODE_ENV !== "production") {
  app.use("/api/auth", devAuthRouter);
}
// Admin-only user management
app.use("/api/users", usersRouter);

// Public, read-only endpoints (shareable links, etc.)
app.use("/api/public", publicRouter);

// Private API (routers themselves check roles as needed)
app.use("/api/properties", propertiesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/pois", poisRouter);
app.use("/api/import", importRouter);

/* --------------------------- 404 & Errors ------------------------ */
app.use((_req, res) => res.status(404).json({ error: "not found" }));

// Convert CORS origin rejections (or other thrown errors) to JSON
// (keep last so it catches anything above)
app.use((err, _req, res, _next) => {
  if (String(err?.message || "").startsWith("CORS blocked for origin:")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

/* -------------------------- Bootstrap Admin --------------------- */
async function ensureMasterAdmin() {
  const email = (process.env.MASTER_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.MASTER_ADMIN_PASSWORD || "";
  const force = String(process.env.MASTER_ADMIN_FORCE || "false").toLowerCase() === "true";

  if (!email || !password) {
    console.log("ℹ️  Master admin bootstrap: skipped (set MASTER_ADMIN_EMAIL & MASTER_ADMIN_PASSWORD to enable).");
    return;
  }

  const existing = await User.findOne({ email }).exec();
  if (!existing) {
    const u = new User({
      email,
      name: email.split("@")[0],
      role: "ADMIN",
      status: "ACTIVE",
    });
    await u.setPassword(password);
    await u.save();
    console.log(`✅ Master admin created: ${email}`);
    return;
  }

  let changed = false;
  if (force && existing.role !== "ADMIN") {
    existing.role = "ADMIN";
    changed = true;
  }
  if (force && existing.status !== "ACTIVE") {
    existing.status = "ACTIVE";
    changed = true;
  }
  if (force && password) {
    await existing.setPassword(password);
    changed = true;
  }

  if (changed) {
    await existing.save();
    console.log(`✅ Master admin updated (force): ${email}`);
  } else {
    console.log(`ℹ️  Master admin already exists: ${email}`);
  }
}

/* --------------------------- Start HTTP ------------------------- */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`🚀 API on http://localhost:${PORT}`);
  console.log(`ℹ️  Health: http://localhost:${PORT}/health`);
  console.log(
    "⚙️  Routing config:",
    JSON.stringify(
      {
        OSRM_URL: OSRM_URL || "(not set)",
        MAPBOX_TOKEN: MAPBOX_TOKEN ? "(set)" : "(not set)",
        ROUTE_PROFILE,
        CORS_ORIGIN: allowOrigins,
      },
      null,
      0
    )
  );
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `🔧 Dev login: ${process.env.AUTH_DEV_SECRET ? "enabled" : "disabled"} (POST /api/auth/dev-login)`
    );
  }
});

/* --------------------------- Connect DB ------------------------- */
(async () => {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/chandrapur-real-estate";
  try {
    console.log("⏳ Connecting to MongoDB…");
    await connectDB(uri);
    console.log("✅ MongoDB connected");

    // Bootstrap a master admin if configured
    await ensureMasterAdmin();
  } catch (e) {
    console.error("❌ DB connect failed:", e?.message || e);
    console.error("   API is still running; /health will show db status.");
  }
})();

/* --------------------------- Safety nets ------------------------ */
process.on("unhandledRejection", (e) => console.error("UNHANDLED REJECTION:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT EXCEPTION:", e));
