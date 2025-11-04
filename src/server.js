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
import googleAuthRouter from "./routes/auth.google.js";
import finalizeRouter from "./routes/auth.finalize.js";

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
const DEFAULT_ORIGIN = "http://localhost:5173";
const allowOrigins = (process.env.CORS_ORIGIN || DEFAULT_ORIGIN)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Important for secure cookies behind proxies (when COOKIE_SECURE=true in prod)
app.set("trust proxy", 1);

// ❌ Disable ETag on API responses to avoid stale 304s
app.set("etag", false);

// 🔐 attach req.user for all subsequent routes (reads JWT from cookie)
app.use(attachUser);

// 🚫 Make all /api responses uncacheable and vary by Cookie/Authorization
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Vary", "Cookie, Authorization");
  next();
});

/* ---------------------------- Static ---------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

/* --------------------- Quick config snapshot -------------------- */
const OSRM_URL = process.env.OSRM_URL || "";
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || "";
const ROUTE_PROFILE = process.env.ROUTE_PROFILE || "driving";

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
      local_login_enabled: true,
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
app.use("/api/auth", authRouter);
if (process.env.NODE_ENV !== "production") {
  app.use("/api/auth", devAuthRouter);
}
app.use("/api/users", usersRouter);
app.use("/api/auth/google", googleAuthRouter);
app.use("/api/auth", finalizeRouter);

app.use("/api/public", publicRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/pois", poisRouter);
app.use("/api/import", importRouter);

/* --------------------------- 404 & Errors ------------------------ */
app.use((_req, res) => res.status(404).json({ error: "not found" }));

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
    const u = new User({ email, name: email.split("@")[0], role: "ADMIN", status: "ACTIVE" });
    await u.setPassword(password);
    await u.save();
    console.log(`✅ Master admin created: ${email}`);
    return;
  }

  let changed = false;
  if (force && existing.role !== "ADMIN") { existing.role = "ADMIN"; changed = true; }
  if (force && existing.status !== "ACTIVE") { existing.status = "ACTIVE"; changed = true; }
  if (force && password) { await existing.setPassword(password); changed = true; }

  if (changed) { await existing.save(); console.log(`✅ Master admin updated (force): ${email}`); }
  else { console.log(`ℹ️  Master admin already exists: ${email}`); }
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
    await ensureMasterAdmin();
  } catch (e) {
    console.error("❌ DB connect failed:", e?.message || e);
    console.error("   API is still running; /health will show db status.");
  }
})();

/* --------------------------- Safety nets ------------------------ */
process.on("unhandledRejection", (e) => console.error("UNHANDLED REJECTION:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT EXCEPTION:", e));
