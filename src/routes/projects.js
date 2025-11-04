// src/routes/projects.js
import express from "express";
import Project from "../models/Project.js";
import Property from "../models/Property.js";
import User from "../models/User.js";

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { google } from "googleapis";

const router = express.Router();

/* ====================== ENV ====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || "").trim();
const GDRIVE_FOLDER_ENV = (process.env.GDRIVE_FOLDER_ID || "").trim();
const APP_HOME = process.env.WEB_AFTER_LOGIN || "https://psspl.pawanssiddhi.in/";

/** accept folder URL or just ID */
function extractFolderId(v) {
  if (!v) return undefined;
  const m = String(v).match(/[-\w]{25,}/);
  return m ? m[0] : v;
}
const GDRIVE_FOLDER_ID = extractFolderId(GDRIVE_FOLDER_ENV);

function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("[GDRIVE] Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/* ====================== AUTH HELPERS ====================== */
const requireAuth = (req, res, next) => {
  if (!req.user?.uid) return res.status(401).json({ error: "login_required" });
  next();
};

/** Load user's Drive credentials from DB; returns an authenticated drive client */
async function getUserDrive(req) {
  const uid = req.user?.uid;
  if (!uid) throw new Error("auth_required");

  const u = await User.findById(uid).select("gdrive").lean();
  const g = u?.gdrive || {};
  if (!g.access_token && !g.refresh_token) {
    const url = "/api/auth/google/login?redirect=" + encodeURIComponent(APP_HOME);
    const e = new Error(
      `Google Drive not connected yet. Open this once to authorize: ${new URL(url, APP_HOME).toString()}`
    );
    e.code = "NO_TOKENS";
    throw e;
  }

  const oauth2 = getOAuth2Client();
  // Set credentials (access token may be stale; refresh_token will auto-refresh)
  oauth2.setCredentials({
    access_token: g.access_token || undefined,
    refresh_token: g.refresh_token || undefined,
    scope: g.scope || undefined,
    token_type: g.token_type || undefined,
    expiry_date: g.expiry_date || undefined,
  });

  // Force a lightweight token refresh check
  try {
    await oauth2.getAccessToken(); // triggers refresh if expired and refresh_token exists
  } catch (_) {
    // ignore; google lib refreshes lazily as well
  }

  return google.drive({ version: "v3", auth: oauth2 });
}

/* ============================ UPLOADS (LOCAL TEMP) ============================= */
const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

/* ================================ UTILITIES =================================== */
const ok = (s) => String(s).toUpperCase() === "APPROVED";
const sum = (arr, pick) => (arr || []).reduce((a, b) => a + Number(pick(b) || 0), 0);

function findDoc(docs, name) {
  return (docs || []).find((x) => (x.name || "").toLowerCase() === String(name).toLowerCase());
}

function computeProjectSummary(p) {
  const plots = p.plots || [];
  const totalPlotableSqm = sum(plots, (x) => x.area_sqm);
  const totalPlotableSqft = sum(plots, (x) => x.area_sqft);
  const totalPlotableHR = sum(plots, (x) => x.hr);
  const ratePerSqft = p.financials?.ratePerSqft || 0;

  const occupants = plots.flatMap((pl) => pl.occupant_names || []);
  const aadhaar = plots.flatMap((pl) => pl.aadhaar_numbers || []);

  const docs = p.documents || [];
  const checklist = {
    applicationLetter: ok(findDoc(docs, "Official Application letter")?.status),
    approvalLetter: ok(findDoc(docs, "Official Permission letter(Approval letter)")?.status),
    sevenTwelve: ok(findDoc(docs, "7/12")?.status),
    cmcApproval: ok(findDoc(docs, "CMC Approval")?.status),
    landSurveyMap: ok(findDoc(docs, "Land Survey Map 'ka prat'")?.status),
    tentativeLayout: ok(findDoc(docs, "Sanctioned Tentative layout map")?.status),
    finalLayout: ok(findDoc(docs, "Sanctioned Demarcated/Final layout map")?.status),
    registryDoc: ok(findDoc(docs, "Registry Document")?.status),
  };

  const docFiles = {
    applicationLetter:
      findDoc(docs, "Official Application letter")?.file?.viewLink ||
      findDoc(docs, "Official Application letter")?.file?.url ||
      null,
    approvalLetter:
      findDoc(docs, "Official Permission letter(Approval letter)")?.file?.viewLink ||
      findDoc(docs, "Official Permission letter(Approval letter)")?.file?.url ||
      null,
    sevenTwelve: findDoc(docs, "7/12")?.file?.viewLink || findDoc(docs, "7/12")?.file?.url || null,
    cmcApproval: findDoc(docs, "CMC Approval")?.file?.viewLink || findDoc(docs, "CMC Approval")?.file?.url || null,
    landSurveyMap:
      findDoc(docs, "Land Survey Map 'ka prat'")?.file?.viewLink ||
      findDoc(docs, "Land Survey Map 'ka prat'")?.file?.url ||
      null,
    tentativeLayout:
      findDoc(docs, "Sanctioned Tentative layout map")?.file?.viewLink ||
      findDoc(docs, "Sanctioned Tentative layout map")?.file?.url ||
      null,
    finalLayout:
      findDoc(docs, "Sanctioned Demarcated/Final layout map")?.file?.viewLink ||
      findDoc(docs, "Sanctioned Demarcated/Final layout map")?.file?.url ||
      null,
    registryDoc:
      findDoc(docs, "Registry Document")?.file?.viewLink ||
      findDoc(docs, "Registry Document")?.file?.url ||
      null,
  };

  const av = Number(p.financials?.totalAgreementValue || 0);
  const sd = Number(p.financials?.stampDuty || 0);
  const rf = Number(p.financials?.registrationFee || 0);
  const addedTaxTDS = sum(plots, (x) => x.added_tax) || Number(p.financials?.addedTax || 0);
  const registryValue = av + sd + rf;
  const totalRegistryValue = registryValue - addedTaxTDS;

  return {
    _id: p._id,
    projectId: p.projectId || "",
    projectName: p.projectName || "",
    projectType: p.projectType || "",
    status: p.status || "",
    bookingStatus: p.bookingStatus || "",
    launchDate: p.launchDate || null,
    completionDate: p.completionDate || null,
    locationDetails: {
      address: p.locationDetails?.address || "",
      mouza: p.locationDetails?.mouza || "",
      tehsil: p.locationDetails?.tehsil || "",
      district: p.locationDetails?.district || "",
      surveyNo: p.locationDetails?.surveyNo || "",
      warg: p.locationDetails?.warg || "",
    },
    counts: { noOfPlots: plots.length, occupants: occupants.length },
    occupants,
    aadhaar,
    plots: plots.map((pl) => ({
      plotNo: pl.plotNo,
      area_sqm: pl.area_sqm,
      area_sqft: pl.area_sqft,
      hr: pl.hr,
      rate_per_sqft: pl.rate_per_sqft,
      added_tax: pl.added_tax,
    })),
    totals: {
      totalPlotableSqm,
      totalPlotableSqft,
      totalPlotableHR,
      ratePerSqft,
      addedTaxTDS,
    },
    financials: {
      totalAgreementValue: av,
      stampDuty: sd,
      registrationFee: rf,
      totalValue: totalRegistryValue,
      ratePerSqft,
      registryValue,
      totalRegistryValue,
    },
    docChecklist: checklist,
    docFiles,
  };
}

/* ================================== ROUTES ==================================== */

// health
router.get("/health", (_req, res) => res.json({ ok: true }));

// create (✅ also seeds a linked Property unless ?seedProperty=0)
router.post("/", async (req, res) => {
  try {
    const doc = await Project.create(req.body);

    const seed = String(req.query.seedProperty ?? "1") === "1";
    if (seed) {
      const p = await Property.create({
        project: doc._id,
        location_admin: {
          state: "Maharashtra",
          district: req.body?.locationDetails?.district || "",
          taluka: req.body?.locationDetails?.tehsil || "",
          village: req.body?.locationDetails?.mouza || "",
        },
        parcel: {
          survey_gat_no: req.body?.locationDetails?.surveyNo || "",
          area: { hectares: null, acres: null, square_meters: null, square_feet: null },
        },
        integration: {
          search_tokens: [
            doc.projectId,
            doc.projectName,
            req.body?.locationDetails?.district,
            req.body?.locationDetails?.mouza,
            req.body?.locationDetails?.tehsil,
          ].filter(Boolean),
        },
      });

      doc.properties = Array.isArray(doc.properties) ? doc.properties : [];
      doc.properties.push(p._id);
      await doc.save();
    }

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// list (basic)
router.get("/", async (req, res) => {
  const { q, district, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (district) query["locationDetails.district"] = district;
  if (status) query.status = status;
  if (q) query.projectName = { $regex: q, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Project.countDocuments(query),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

// list dashboard summaries
router.get("/summary", async (req, res) => {
  const { q, district, status, limit = 50 } = req.query;
  const query = {};
  if (district) query["locationDetails.district"] = district;
  if (status) query.status = status;
  if (q) query.projectName = { $regex: q, $options: "i" };

  const items = await Project.find(query).sort({ createdAt: -1 }).limit(Number(limit));
  res.json({ items: items.map(computeProjectSummary), total: items.length });
});

/**
 * Export Projects + Plots to Excel (keep before :id routes)
 */
router.get("/export.xlsx", async (req, res) => {
  try {
    const { q, district, status } = req.query;
    const query = {};
    if (district) query["locationDetails.district"] = district;
    if (status) query.status = status;
    if (q) query.projectName = { $regex: q, $options: "i" };

    const cursor = Project.find(query).sort({ createdAt: -1 }).lean().cursor();

    const projHeaders = [
      "Project ID","Project Name","Type","Status","Booking Status",
      "Launch Date","Planned Completion",
      "District","Tehsil","Mouza","Survey No","Warg","Address",
      "No. of Plots","Total Plot Area (sq.m)","Total Plot Area (sq.ft)",
      "Agreement Value","Registry Value","Rate / sq.ft","Added Tax (TDS)","Created At"
    ];
    const plotHeaders = [
      "Project ID","Project Name","Plot No","Area (sq.m)","Area (sq.ft)","HR",
      "Rate / sq.ft (plot)","Added Tax (plot)","Occupants (names)","Occupants (Aadhaar)"
    ];

    const wsProj  = xlsx.utils.aoa_to_sheet([projHeaders]);
    const wsPlots = xlsx.utils.aoa_to_sheet([plotHeaders]);
    let rp = 1, rpl = 1;

    for await (const p of cursor) {
      const plots = Array.isArray(p.plots) ? p.plots : [];
      const totalSqm  = plots.reduce((a, x) => a + (Number(x.area_sqm)  || 0), 0);
      const totalSqft = plots.reduce((a, x) => a + (Number(x.area_sqft) || 0), 0) || totalSqm * 10.76391041671;

      const av  = Number(p?.financials?.totalAgreementValue || 0);
      const sd  = Number(p?.financials?.stampDuty || 0);
      const rf  = Number(p?.financials?.registrationFee || 0);
      const registryValue = av + sd + rf;
      const addedTaxTDS   =
        plots.reduce((a, x) => a + (Number(x.added_tax) || 0), 0) ||
        Number(p?.financials?.addedTax || 0);

      const projRow = [
        p.projectId || "",
        p.projectName || "",
        p.projectType || "",
        p.status || "",
        p.bookingStatus || "",
        p.launchDate ? new Date(p.launchDate).toISOString().slice(0, 10) : "",
        p.completionDate ? new Date(p.completionDate).toISOString().slice(0, 10) : "",
        p.locationDetails?.district || "",
        p.locationDetails?.tehsil || "",
        p.locationDetails?.mouza || "",
        p.locationDetails?.surveyNo || "",
        p.locationDetails?.warg || "",
        p.locationDetails?.address || "",
        plots.length,
        Number(totalSqm) || "",
        Number(Math.round(totalSqft * 100) / 100) || "",
        av || "",
        registryValue || "",
        p.financials?.ratePerSqft ?? "",
        addedTaxTDS ?? "",
        p.createdAt ? new Date(p.createdAt).toISOString() : "",
      ];
      xlsx.utils.sheet_add_aoa(wsProj, [projRow], { origin: { r: rp++, c: 0 } });

      for (const pl of plots) {
        const row = [
          p.projectId || "",
          p.projectName || "",
          pl.plotNo || "",
          pl.area_sqm ?? "",
          pl.area_sqft ?? (pl.area_sqm != null ? Number(pl.area_sqm) * 10.76391041671 : ""),
          pl.hr ?? "",
          pl.rate_per_sqft ?? "",
          pl.added_tax ?? "",
          Array.isArray(pl.occupant_names) ? pl.occupant_names.join("; ") : "",
          Array.isArray(pl.aadhaar_numbers) ? pl.aadhaar_numbers.join("; ") : "",
        ];
        xlsx.utils.sheet_add_aoa(wsPlots, [row], { origin: { r: rpl++, c: 0 } });
      }
    }

    wsProj["!cols"]  = projHeaders.map(() => ({ wch: 20 }));
    wsPlots["!cols"] = plotHeaders.map(() => ({ wch: 18 }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, wsProj,  "Projects");
    xlsx.utils.book_append_sheet(wb, wsPlots, "Plots");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const dt = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="projects_${dt}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ------------------------- ID-BASED ROUTES ------------------------- */
const OID = "([0-9a-fA-F]{24})";

// full by id
router.get(`/:id(${OID})`, async (req, res) => {
  const doc = await Project.findById(req.params.id).populate("properties");
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

// single summary
router.get(`/:id(${OID})/summary`, async (req, res) => {
  const p = await Project.findById(req.params.id);
  if (!p) return res.status(404).json({ error: "not found" });
  res.json(computeProjectSummary(p));
});

// update
router.put(`/:id(${OID})`, async (req, res) => {
  try {
    const doc = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ error: "not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// delete (✅ cascade remove linked properties)
router.delete(`/:id(${OID})`, async (req, res) => {
  try {
    const proj = await Project.findById(req.params.id);
    if (!proj) return res.status(404).json({ error: "not found" });

    const referencedIds = (proj.properties || []).map(String);

    const filters = [];
    if (referencedIds.length) filters.push({ _id: { $in: referencedIds } });
    filters.push({ project: proj._id });

    const deleteFilter = filters.length === 1 ? filters[0] : { $or: filters };
    const delRes = await Property.deleteMany(deleteFilter);
    const deletedProps = delRes?.deletedCount || 0;

    await proj.deleteOne();

    res.json({ ok: true, deletedProject: proj._id, deletedProperties: deletedProps });
  } catch (e) {
    console.error("DELETE /projects/:id error:", e);
    res.status(400).json({ error: e.message });
  }
});

/* ----------------------- DOCUMENT UPLOADS (DRIVE) ----------------------- */
router.post(`/:id(${OID})/documents/upload`, requireAuth, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, refNo, date } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!req.file) return res.status(400).json({ error: "file is required" });

    console.log("[UPLOAD] Incoming:", {
      id,
      name,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      tempPath: req.file?.path,
    });

    const p = await Project.findById(id);
    if (!p) return res.status(404).json({ error: "not found" });

    // Ensure we have a drive client for this user
    const drive = await getUserDrive(req); // throws if not connected

    let d = findDoc(p.documents, name);
    if (!d) {
      d = { name, status: "PENDING" };
      p.documents.push(d);
    }

    // Upload to Drive
    const createRes = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: GDRIVE_FOLDER_ID ? [GDRIVE_FOLDER_ID] : undefined,
        mimeType: req.file.mimetype || "application/octet-stream",
      },
      media: {
        mimeType: req.file.mimetype || "application/octet-stream",
        body: fs.createReadStream(req.file.path),
      },
      fields: "id,name,webViewLink,webContentLink",
    });

    // Cleanup local temp
    try { fs.unlinkSync(req.file.path); } catch {}

    // Try to make link public (optional)
    try {
      await drive.permissions.create({
        fileId: createRes.data.id,
        requestBody: { role: "reader", type: "anyone" },
      });
    } catch (e) {
      console.warn("[GDRIVE] permissions.create failed (continuing):", e?.message || e);
    }

    const meta = await drive.files.get({
      fileId: createRes.data.id,
      fields: "id,name,webViewLink,webContentLink",
    });

    d.status = "APPROVED";
    if (refNo) d.refNo = refNo;
    if (date) d.date = new Date(date);
    d.file = {
      provider: "gdrive",
      fileId: meta.data.id,
      filename: meta.data.name,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      url: meta.data.webViewLink,
      viewLink: meta.data.webViewLink,
      downloadLink: meta.data.webContentLink,
    };

    await p.save();
    console.log("[UPLOAD] Saved document on project:", { projectId: p._id, name, fileId: meta.data.id });
    res.json({ ok: true, document: d });
  } catch (e) {
    console.error("[UPLOAD] Error:", e);
    // If user hasn't connected Drive, guide them
    if (e.code === "NO_TOKENS") {
      return res.status(400).json({
        error: "gdrive_not_connected",
        auth_url: "/api/auth/google/login?redirect=" + encodeURIComponent(APP_HOME),
      });
    }
    res.status(400).json({ error: e.message });
  }
});

export default router;
