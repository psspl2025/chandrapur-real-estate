// src/routes/import.js
import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import Property from "../models/Property.js";
import { recomputeForProperty } from "../services/nearby.js";

const router = express.Router();

// Multer in-memory store (no temp files on disk)
const upload = multer({ storage: multer.memoryStorage() });

// Health
router.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * POST /api/import/properties
 * Form-Data:
 *  - file: .xlsx or .csv
 *  - computeNearby: "true" | "false" (default: false)
 *
 * Expected columns (header names; case-insensitive):
 *  - district, taluka, village
 *  - ulpin, survey_gat_no
 *  - area_hectares, area_acres, area_sq_m, area_sq_ft
 *  - cultiv_hectares, cultiv_acres, cultiv_sq_m, cultiv_sq_ft
 *  - land_use (AGRICULTURE/NON_AGRICULTURE/INDUSTRIAL/RESIDENTIAL/COMMERCIAL)
 *  - year, crop_code, crop_name
 *  - lng, lat  (optional; if both present -> sets geo.coordinates)
 */
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
        // normalize header keys (lowercase)
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

        // coordinates
        const lng = num(obj.lng);
        const lat = num(obj.lat);
        if (isFinite(lng) && isFinite(lat)) {
          doc.geo = { type: "Point", coordinates: [lng, lat], geo_source: "import" };
        }

        if (computeNearby && doc?.geo?.coordinates?.length === 2) {
          await recomputeForProperty(doc);
        }

        await doc.save();
        out.push({ row: i + 2, _id: doc._id }); // +2 accounts for header row + 1-indexing
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
