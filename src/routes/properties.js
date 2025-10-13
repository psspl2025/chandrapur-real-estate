// src/routes/properties.js
import express from "express";
import Property from "../models/Property.js";
import { recomputeForProperty } from "../services/nearby.js";
import { buildBenefitCard } from "../services/benefit.js";
import { streamBrochurePDF } from "../services/brochure.js";

import { requireRole } from "../middleware/auth.js"; // ✅ attachUser is global in server.js
import { PropertyAccess, ProjectAccess } from "../models/Access.js";
import { requirePropertyEdit } from "../middleware/perm.js";

const router = express.Router();

/* ------------------------- Helpers ------------------------- */

function normalizeLngLat(input) {
  if (!input) return null;
  let [lng, lat] = input;
  if (typeof lng === "string") lng = Number(lng);
  if (typeof lat === "string") lat = Number(lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
}

function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth required" });
  next();
}

function isAdmin(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles)
    ? user.roles
    : user.role
    ? [user.role]
    : [];
  return roles.includes("ADMIN");
}

function getUserId(user) {
  return user?.id || user?._id || user?.sub || null;
}

/* -------------------------- Health ------------------------- */

router.get("/health", (_req, res) => res.json({ ok: true }));

/* -------------------------- Create ------------------------- */
/**
 * Create a property
 * - Requires STAFF or ADMIN
 * - If geo.coordinates present, recompute nearby and persist
 */
router.post("/", ensureAuth, requireRole(["STAFF", "ADMIN"]), async (req, res) => {
  try {
    const body = { ...req.body };

    // normalize coords if user sent strings
    const norm = normalizeLngLat(body?.geo?.coordinates);
    if (norm) {
      body.geo = {
        ...(body.geo || {}),
        type: "Point",
        coordinates: norm,
        geo_source: body.geo?.geo_source || "api",
      };
    }

    let doc = new Property(body);

    if (doc?.geo?.coordinates?.length === 2) {
      await recomputeForProperty(doc); // mutates doc.computed
      doc.markModified("computed");
    }

    await doc.save();
    res.status(201).json(doc);
  } catch (e) {
    console.error("POST /properties error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- List -------------------------- */
/**
 * List with filters & pagination (RBAC scope)
 * - ADMIN: all
 * - Non-admin: items assigned via PropertyAccess or ProjectAccess
 */
router.get("/", ensureAuth, async (req, res) => {
  try {
    const { district, taluka, village, q, page = 1, limit = 20 } = req.query;
    const user = req.user;
    const uid = getUserId(user);

    // scope query
    let scopeQuery = {};
    if (!isAdmin(user)) {
      const [propIds, projIds] = await Promise.all([
        PropertyAccess.find({ user: uid }).distinct("property"),
        ProjectAccess.find({ user: uid }).distinct("project"),
      ]);

      if (propIds.length || projIds.length) {
        scopeQuery = { $or: [{ _id: { $in: propIds } }, { project: { $in: projIds } }] };
      } else {
        // No assignments — return empty result
        scopeQuery = { _id: { $in: [] } };
      }
    }

    const query = { ...scopeQuery };
    if (district) query["location_admin.district"] = district;
    if (taluka) query["location_admin.taluka"] = taluka;
    if (village) query["location_admin.village"] = village;
    if (q) query["integration.search_tokens"] = { $regex: q, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Property.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Property.countDocuments(query),
    ]);

    // compute canEdit set
    let canEditIds = new Set();
    if (isAdmin(user)) {
      canEditIds = new Set(items.map((x) => x._id.toString()));
    } else if (items.length) {
      const ids = items.map((x) => x._id);
      const grants = await PropertyAccess.find({ user: uid, property: { $in: ids }, canEdit: true })
        .select("property")
        .lean();
      canEditIds = new Set(grants.map((g) => g.property.toString()));
    }

    const out = items.map((x) => ({
      ...x,
      canEdit: canEditIds.has(x._id.toString()) || isAdmin(user),
    }));

    res.json({ items: out, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error("GET /properties error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* ---------------------------- Get -------------------------- */
/**
 * Get by id (RBAC scope)
 * - Auto-heal: if computed missing but coords exist, recompute + persist once
 * - Adds canEdit flag in response
 */
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const user = req.user;
    const uid = getUserId(user);

    let doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not found" });

    // scope check for non-admin
    if (!isAdmin(user)) {
      const hasProp = await PropertyAccess.exists({ user: uid, property: doc._id });
      const hasProj = doc.project ? await ProjectAccess.exists({ user: uid, project: doc.project }) : false;
      if (!hasProp && !hasProj) return res.status(403).json({ error: "forbidden" });
    }

    const needsCompute =
      (!doc.computed || !doc.computed.center) &&
      Array.isArray(doc?.geo?.coordinates) &&
      doc.geo.coordinates.length === 2;

    if (needsCompute) {
      await recomputeForProperty(doc);
      doc.markModified("computed");
      await doc.save();
    }

    const canEdit =
      isAdmin(user) ||
      !!(await PropertyAccess.exists({ user: uid, property: doc._id, canEdit: true }));

    res.json({ ...(doc.toObject ? doc.toObject() : doc), canEdit });
  } catch (e) {
    console.error("GET /properties/:id error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- Update ------------------------ */
/**
 * Update by id (partial)
 * - Guarded by assignment/role (requirePropertyEdit)
 * - If geo.coordinates present, recompute nearby and persist
 */
router.put("/:id", ensureAuth, requirePropertyEdit, async (req, res) => {
  try {
    let doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not found" });

    const payload = { ...req.body };

    // normalize coords if provided in payload
    if (payload?.geo?.coordinates) {
      const norm = normalizeLngLat(payload.geo.coordinates);
      if (norm) {
        payload.geo = {
          ...(doc.geo?.toObject?.() || doc.geo || {}),
          ...payload.geo,
          type: "Point",
          coordinates: norm,
        };
      } else {
        // bad coords were sent — drop them to avoid breaking the doc
        if (payload.geo && "coordinates" in payload.geo) delete payload.geo.coordinates;
      }
    }

    Object.assign(doc, payload);

    if (Array.isArray(doc?.geo?.coordinates) && doc.geo.coordinates.length === 2) {
      await recomputeForProperty(doc);
      doc.markModified("computed");
    }

    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error("PUT /properties/:id error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* -------------------------- Recompute ---------------------- */
/** Manual recompute nearby for a property (edit required) */
router.post("/:id/recompute", ensureAuth, requirePropertyEdit, async (req, res) => {
  try {
    let doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not found" });

    if (!doc?.geo?.coordinates || doc.geo.coordinates.length !== 2) {
      return res.status(400).json({ error: "geo.coordinates [lng,lat] required to recompute" });
    }

    await recomputeForProperty(doc);
    doc.markModified("computed");
    await doc.save();

    res.json(doc);
  } catch (e) {
    console.error("POST /properties/:id/recompute error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- Benefit ----------------------- */
/**
 * Benefit Card (read-only)
 * - If computed block missing but coords exist, compute in-memory (no save)
 * - RBAC scope: same visibility as GET /:id
 */
router.get("/:id/benefit", ensureAuth, async (req, res) => {
  try {
    const user = req.user;
    const uid = getUserId(user);

    const doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "not found" });

    if (!isAdmin(user)) {
      const hasProp = await PropertyAccess.exists({ user: uid, property: doc._id });
      const hasProj = doc.project ? await ProjectAccess.exists({ user: uid, project: doc.project }) : false;
      if (!hasProp && !hasProj) return res.status(403).json({ error: "forbidden" });
    }

    if (
      (!doc.computed || Object.keys(doc.computed || {}).length === 0) &&
      Array.isArray(doc?.geo?.coordinates) &&
      doc.geo.coordinates.length === 2
    ) {
      // compute transiently for display
      const tempDoc = await recomputeForProperty(doc.toObject());
      const text = buildBenefitCard(tempDoc, { showNames: true });
      return res.json({ benefit: text, computed: tempDoc.computed });
    }

    const text = buildBenefitCard(doc, { showNames: true });
    res.json({ benefit: text, computed: doc.computed || null });
  } catch (e) {
    console.error("GET /properties/:id/benefit error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- Brochure ---------------------- */
/**
 * Brochure PDF (computes in-memory if needed; no persist)
 * - RBAC scope: same visibility as GET /:id
 */
router.get("/:id/brochure.pdf", ensureAuth, async (req, res) => {
  try {
    const user = req.user;
    const uid = getUserId(user);

    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ error: "not found" });

    if (!isAdmin(user)) {
      const hasProp = await PropertyAccess.exists({ user: uid, property: prop._id });
      const hasProj = prop.project ? await ProjectAccess.exists({ user: uid, project: prop.project }) : false;
      if (!hasProp && !hasProj) return res.status(403).json({ error: "forbidden" });
    }

    let temp = prop;
    if (
      (!prop.computed || Object.keys(prop.computed || {}).length === 0) &&
      Array.isArray(prop?.geo?.coordinates) &&
      prop.geo.coordinates.length === 2
    ) {
      temp = await recomputeForProperty(prop.toObject()); // transient compute
    }

    await streamBrochurePDF(temp, res);
  } catch (e) {
    console.error("GET /properties/:id/brochure.pdf error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- Delete ------------------------ */
/** Delete by id (edit required — you may prefer ADMIN only) */
router.delete("/:id", ensureAuth, requirePropertyEdit, async (req, res) => {
  try {
    const out = await Property.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ error: "not found" });
    res.json({ ok: true, deleted: out._id });
  } catch (e) {
    console.error("DELETE /properties/:id error:", e);
    res.status(400).json({ error: e.message });
  }
});

export default router;
