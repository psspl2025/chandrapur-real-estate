import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import Property from "../models/Property.js";
import { recomputeForProperty } from "../services/nearby.js";
import User from "../models/User.js"; // ⬅️ added for DB-backed gdrive status

const router = express.Router();

/* ------------------------------------------------------------------ */
/*                   Google Drive OAuth (uses auth.google)             */
/* ------------------------------------------------------------------ */

// Simple auth guard (use your own if you already have one)
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "login_required" });
  next();
};

// Start → delegate to the new login route which sets state=<userId>
router.get("/gdrive/start", requireAuth, (_req, res) => {
  return res.redirect(302, "/api/auth/google/login");
});

// Status → read tokens saved on the user (DB-backed)
router.get("/gdrive/status", requireAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Vary", "Cookie");

    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "auth required" });

    const u = await User.findById(uid).select("gdrive").lean();
    const g = u?.gdrive || {};

    const connected = !!(g.access_token || g.refresh_token);
    const has_refresh = !!g.refresh_token;
    const expires_in_s = g?.expiry_date
      ? Math.max(0, Math.floor((g.expiry_date - Date.now()) / 1000))
      : null;

    return res.status(200).json({ connected, has_refresh, expires_in_s });
  } catch (e) {
    return res.status(500).json({ error: "status_failed" });
  }
});

/* ------------------------------------------------------------------ */
/*                           File Import (Excel)                       */
/* ------------------------------------------------------------------ */

const upload = multer({ storage: multer.memoryStorage() });

router.get("/health", (_req, res) => res.json({ ok: true }));

router.post("/properties", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const computeNearby = (req.body.computeNearby || "false").toLowerCase() === "true";

    const wb = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: true });

    if (!rows.length) return res.status(400).json({ error: "no rows found in sheet" });

    const out = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const obj = {};
        Object.keys(r).forEach((k) => (obj[k.toLowerCase().trim()] = r[k]));

        const doc = new Property({
          source: { type: "MAHA_7_12" },
          location_admin: {
            state: "Maharashtra",
            district: obj.district || null,
            taluka: obj.taluka || null,
            village: obj.village || null,
          },
          parcel: {
            ulpin: obj.ulpin || null,
            survey_gat_no: obj.survey_gat_no || null,
            area: {
              hectares: num(obj.area_hectares),
              acres: num(obj.area_acres),
              square_meters: num(obj.area_sq_m),
              square_feet: num(obj.area_sq_ft),
            },
            cultivable_area: {
              hectares: num(obj.cultiv_hectares),
              acres: num(obj.cultiv_acres),
              square_meters: num(obj.cultiv_sq_m),
              square_feet: num(obj.cultiv_sq_ft),
            },
          },
          use_and_crop: {
            land_use: pickUse(obj.land_use),
            year: obj.year || null,
            crop_code: obj.crop_code || null,
            crop_name: obj.crop_name || null,
          },
          integration: {
            district_tag: obj.district || null,
            taluka_tag: obj.taluka || null,
            village_tag: obj.village || null,
            search_tokens: buildTokens(obj),
          },
        });

        const lng = num(obj.lng);
        const lat = num(obj.lat);
        if (isFinite(lng) && isFinite(lat)) {
          doc.geo = { type: "Point", coordinates: [lng, lat], geo_source: "import" };
        }

        if (computeNearby && doc?.geo?.coordinates?.length === 2) {
          await recomputeForProperty(doc);
        }

        await doc.save();
        out.push({ row: i + 2, _id: doc._id });
      } catch (e) {
        errors.push({ row: i + 2, error: e.message });
      }
    }

    res.status(201).json({ inserted: out.length, items: out, errors });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// helpers
function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isNaN(n) ? null : n;
}

function pickUse(v) {
  if (!v) return "AGRICULTURE";
  const s = String(v).toUpperCase().trim();
  const allowed = new Set(["AGRICULTURE", "NON_AGRICULTURE", "INDUSTRIAL", "RESIDENTIAL", "COMMERCIAL"]);
  return allowed.has(s) ? s : "AGRICULTURE";
}

function buildTokens(o) {
  const t = [];
  ["district", "taluka", "village", "ulpin", "survey_gat_no"].forEach((k) => {
    if (o[k]) t.push(String(o[k]));
  });
  return t;
}

export default router;
