// src/routes/public.js
import express from "express";
import Property from "../models/Property.js";
import { recomputeForProperty } from "../services/nearby.js";
import { buildBenefitCard } from "../services/benefit.js";
import { streamBrochurePDF } from "../services/brochure.js";

const router = express.Router();

/* Small helpers */
function normalizeLngLat(input) {
  if (!input) return null;
  let [lng, lat] = input;
  if (typeof lng === "string") lng = Number(lng);
  if (typeof lat === "string") lat = Number(lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/* Health */
router.get("/health", (_req, res) => res.json({ ok: true }));

/* -------- LIST (public) -------- */
router.get("/properties", async (req, res) => {
  try {
    const { district, taluka, village, q, page = 1, limit = 20 } = req.query;

    const query = {};
    if (district) query["location_admin.district"] = district;
    if (taluka) query["location_admin.taluka"] = taluka;
    if (village) query["location_admin.village"] = village;
    if (q) query["integration.search_tokens"] = { $regex: q, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(query),
    ]);

    // never expose edit on public
    const out = items.map((x) => ({ ...x, canEdit: false }));

    res.json({ items: out, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error("GET /public/properties error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* -------- GET by id (public) -------- */
router.get("/properties/:id", async (req, res) => {
  try {
    let doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not found" });

    // Auto-compute in-memory for display if missing
    if (
      (!doc.computed || !doc.computed.center) &&
      Array.isArray(doc?.geo?.coordinates) &&
      doc.geo.coordinates.length === 2
    ) {
      const tmp = await recomputeForProperty(doc.toObject());
      return res.json({ ...tmp, canEdit: false });
    }

    res.json({ ...(doc.toObject ? doc.toObject() : doc), canEdit: false });
  } catch (e) {
    console.error("GET /public/properties/:id error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* -------- Benefit (public) -------- */
router.get("/properties/:id/benefit", async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ error: "not found" });

    let source = prop;
    if (
      (!prop.computed || Object.keys(prop.computed || {}).length === 0) &&
      Array.isArray(prop?.geo?.coordinates) &&
      prop.geo.coordinates.length === 2
    ) {
      source = await recomputeForProperty(prop.toObject()); // transient
    }

    const text = buildBenefitCard(source, { showNames: true });
    res.json({ benefit: text, computed: source.computed || null });
  } catch (e) {
    console.error("GET /public/properties/:id/benefit error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* -------- Brochure PDF (public) -------- */
router.get("/properties/:id/brochure.pdf", async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ error: "not found" });

    let temp = prop;
    if (
      (!prop.computed || Object.keys(prop.computed || {}).length === 0) &&
      Array.isArray(prop?.geo?.coordinates) &&
      prop.geo.coordinates.length === 2
    ) {
      temp = await recomputeForProperty(prop.toObject()); // transient
    }

    await streamBrochurePDF(temp, res);
  } catch (e) {
    console.error("GET /public/properties/:id/brochure.pdf error:", e);
    res.status(400).json({ error: e.message });
  }
});

export default router;
