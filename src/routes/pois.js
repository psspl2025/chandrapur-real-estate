// src/routes/pois.js
import express from "express";
import POI from "../models/POI.js";

const router = express.Router();

// Health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// Bulk insert POIs
router.post("/bulk", async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [];
    if (!rows.length) return res.status(400).json({ error: "array body required" });

    const out = await POI.insertMany(rows, { ordered: false });
    res.status(201).json({ inserted: out.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List POIs with filters
router.get("/", async (req, res) => {
  const { type, district, q, limit = 50 } = req.query;
  const query = {};
  if (type) query.poiType = type;
  if (district) query.district = district;
  if (q) query.name = { $regex: q, $options: "i" };

  const items = await POI.find(query).limit(Number(limit));
  res.json({ items });
});

// Count POIs (useful sanity check)
router.get("/count", async (_req, res) => {
  const total = await POI.countDocuments({});
  res.json({ total });
});

// Clear ALL POIs (dangerous; good for resetting during testing)
router.delete("/clear", async (_req, res) => {
  try {
    const result = await POI.deleteMany({});
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
