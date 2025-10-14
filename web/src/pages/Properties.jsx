// web/src/pages/Properties.jsx
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { API_BASE } from "../config";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "../components/useToast.js";

/* ---------------- Role helpers ---------------- */
async function fetchRoleOnce() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
    if (!res.ok) return "PUBLIC";
    const me = await res.json();
    return me?.role || "PUBLIC";
  } catch {
    return "PUBLIC";
  }
}
const canEdit = (role) => role === "EDITOR" || role === "ADMIN";
const cls = (...xs) => xs.filter(Boolean).join(" ");

/* ======================= Component ======================= */
export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [role, setRole] = useState("PUBLIC");
  const [exporting, setExporting] = useState(false);

  // 🔑 role once
  useEffect(() => {
    let cancelled = false;
    fetchRoleOnce().then((r) => !cancelled && setRole(r));
    return () => { cancelled = true; };
  }, []);

  // cross-page notify
  const bcRef = useRef(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel("app-events");
      bcRef.current.onmessage = (ev) => {
        if (ev?.data?.type === "project-created") load();
      };
    } catch {}
    const onStorage = (e) => {
      if (e.key === "app:lastProjectCreated") load();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      try { bcRef.current?.close?.(); } catch {}
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filters from URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [taluka, setTaluka] = useState(searchParams.get("taluka") || "");
  const [village, setVillage] = useState(searchParams.get("village") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [limit, setLimit] = useState(Number(searchParams.get("limit") || 20));

  // UI density
  const [compact, setCompact] = useState(() => localStorage.getItem("ui:compactList") === "1");
  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    try { localStorage.setItem("ui:compactList", next ? "1" : "0"); } catch {}
  };

  // keep URL in sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (district) p.set("district", district);
    if (taluka) p.set("taluka", taluka);
    if (village) p.set("village", village);
    p.set("page", String(page));
    p.set("limit", String(limit));
    setSearchParams(p, { replace: true });
  }, [q, district, taluka, village, page, limit, setSearchParams]);

  // debounce search q
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("page", String(page));
    if (qDebounced) p.set("q", qDebounced);
    if (district) p.set("district", district);
    if (taluka) p.set("taluka", taluka);
    if (village) p.set("village", village);
    return p;
  }, [qDebounced, district, taluka, village, page, limit]);

  const queryString = useMemo(() => queryParams.toString(), [queryParams]);

  // fetch list
  const abortRef = useRef(null);
  async function load() {
    setLoading(true);
    setErr("");
    abortRef.current?.abort?.();
    const ctl = new AbortController();
    abortRef.current = ctl;

    const isPublic = role === "PUBLIC";
    const PRIVATE_BASE = `${API_BASE}/properties`;
    const PUBLIC_BASE = `${API_BASE}/public/properties`;

    try {
      let res = await fetch(`${isPublic ? PUBLIC_BASE : PRIVATE_BASE}?${queryString}`, {
        signal: ctl.signal,
        ...(isPublic ? {} : { credentials: "include" }),
      });

      if (!isPublic && (res.status === 401 || res.status === 403 || res.status === 404)) {
        setRole("PUBLIC");
        res = await fetch(`${PUBLIC_BASE}?${queryString}`, { signal: ctl.signal });
      }

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      if (e.name !== "AbortError") {
        setErr(String(e.message || e));
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [queryString, role]);

  function resetFilters() {
    setQ(""); setDistrict(""); setTaluka(""); setVillage(""); setPage(1);
  }

  async function handleRecompute(id, hasCoords) {
    if (!canEdit(role)) return;
    if (!hasCoords) { toast("Add coordinates first"); return; }
    try {
      const res = await fetch(`${API_BASE}/properties/${id}/recompute`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      toast("Recomputed ✓");
      await load();
    } catch (e) {
      toast("Recompute failed"); console.error(e);
    }
  }

  // ✴️ edit modal
  const [editing, setEditing] = useState(null);

  /* ---------------- Row ---------------- */
  const Row = memo(function Row({ p }) {
    const area = p?.parcel?.area?.acres;
    const acres = typeof area === "number" ? area.toFixed(2) : "-";
    const hasCoords = Array.isArray(p?.geo?.coordinates) && p.geo.coordinates.length === 2;
    const coord = hasCoords ? `[${p.geo.coordinates[0].toFixed(5)}, ${p.geo.coordinates[1].toFixed(5)}]` : "—";

    const isPublic = role === "PUBLIC";
    const brochurePrefix = `${API_BASE}/${isPublic ? "public/properties" : "properties"}`;

    return (
      <div className={cls(compact ? "p-3" : "p-4", "bg-slate-800 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)] transition-shadow")}>
        <div className="flex flex-wrap justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold truncate">
              {p.parcel?.survey_gat_no || "-"} {p.parcel?.ulpin ? `– ${p.parcel.ulpin}` : ""}
              {p?.computed?.roadTouch && (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-300 align-middle border border-emerald-600/30">Road touch</span>
              )}
            </div>
            <div className="text-[13px] text-slate-300 truncate">
              {[p.location_admin?.village, p.location_admin?.taluka, p.location_admin?.district].filter(Boolean).join(", ")}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-700/30 text-emerald-200 border border-emerald-600/40">
                Area: {acres} acres
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-700/30 text-sky-200 border border-sky-600/40">
                {p.use_and_crop?.land_use || "-"}
              </span>
              <span className="ml-auto text-[11px] text-slate-400">Coords: {coord}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 shrink-0">
            <Link to={`/property/${p._id}`} className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm" title="Open details">
              View
            </Link>
            <a
              href={`${brochurePrefix}/${p._id}/brochure.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-700 text-sm"
              title="Open brochure (PDF)"
            >
              Brochure ↗
            </a>
            {canEdit(role) && (
              <>
                <button
                  onClick={() => handleRecompute(p._id, hasCoords)}
                  className={cls(
                    "px-3 py-1.5 rounded text-sm border",
                    hasCoords ? "bg-slate-700 hover:bg-slate-600 border-slate-600" : "bg-slate-700/40 cursor-not-allowed border-transparent"
                  )}
                  disabled={!hasCoords}
                  title={hasCoords ? "Recompute nearby & insights" : "Add coordinates first"}
                >
                  Recompute
                </button>
                <button
                  onClick={() => setEditing(p)}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm"
                  title="Edit coordinates"
                >
                  Edit Coords
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeFilters = [q, district, taluka, village].filter(Boolean).length;

  // keyboard helper: clear on Esc
  const onEscClear = (setter) => (e) => { if (e.key === "Escape") { setter(""); setPage(1); } };

  /* ======================= EXPORT (CSV for Excel) ======================= */
  function csvEscape(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  async function exportCSV() {
    try {
      setExporting(true);
      // build filter params but ignore current page/limit; we will paginate ourselves
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (district) p.set("district", district);
      if (taluka) p.set("taluka", taluka);
      if (village) p.set("village", village);

      const isPublic = role === "PUBLIC";
      const base = `${API_BASE}/${isPublic ? "public/properties" : "properties"}`;

      const pageSize = 500; // chunk size for export
      let pageNum = 1;
      let rows = [];
      let totalCount = 0;

      while (true) {
        const params = new URLSearchParams(p);
        params.set("limit", String(pageSize));
        params.set("page", String(pageNum));
        const res = await fetch(`${base}?${params.toString()}`, isPublic ? {} : { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = data.items || data || [];
        if (pageNum === 1) totalCount = Number(data.total || list.length || 0);
        rows = rows.concat(list);
        if (rows.length >= totalCount || list.length === 0) break;
        pageNum += 1;
      }

      if (rows.length === 0) {
        toast("Nothing to export");
        return;
      }

      const headers = [
        "Survey/Gat No",
        "ULPIN",
        "District",
        "Taluka",
        "Village",
        "Land Use",
        "Area (acres)",
        "Lng",
        "Lat",
        "Road Touch",
        "Created At",
        "Updated At",
        "_id",
      ];

      const lines = [];
      lines.push(headers.map(csvEscape).join(","));

      for (const p of rows) {
        const lng = Array.isArray(p?.geo?.coordinates) ? p.geo.coordinates[0] : "";
        const lat = Array.isArray(p?.geo?.coordinates) ? p.geo.coordinates[1] : "";
        const line = [
          p?.parcel?.survey_gat_no || "",
          p?.parcel?.ulpin || "",
          p?.location_admin?.district || "",
          p?.location_admin?.taluka || "",
          p?.location_admin?.village || "",
          p?.use_and_crop?.land_use || "",
          typeof p?.parcel?.area?.acres === "number" ? p.parcel.area.acres : "",
          typeof lng === "number" ? lng : "",
          typeof lat === "number" ? lat : "",
          p?.computed?.roadTouch ? "YES" : "NO",
          p?.createdAt || "",
          p?.updatedAt || "",
          p?._id || "",
        ];
        lines.push(line.map(csvEscape).join(","));
      }

      const csv = lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const ts = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const name = `properties_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast(`Exported ${rows.length} row(s)`);
    } catch (e) {
      console.error(e);
      toast("Export failed");
    } finally {
      setExporting(false);
    }
  }

   /* ======================= RENDER ======================= */
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Properties</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleCompact}
            className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-700/50"
            title="Toggle compact view"
          >
            {compact ? "Comfort" : "Compact"}
          </button>
          {canEdit(role) && (
            <Link to="/properties/new" className="text-sky-400 hover:underline text-sm">
              + New Property
            </Link>
          )}
        </div>
      </div>

      {/* Filters (mobile-first) */}
      <div className="bg-slate-800 p-3 rounded mb-4 grid grid-cols-1 md:grid-cols-12 gap-2">
        {/* Search */}
        <div className="md:col-span-3 relative">
          <input
            className="w-full p-2 pr-9 rounded bg-slate-900 outline-none focus:ring-2 focus:ring-sky-600/40"
            placeholder="Search…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); setPage(1); } }}
            aria-label="Search properties"
          />
          {q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              title="Clear"
              onClick={() => { setQ(""); setPage(1); }}
            >
              ×
            </button>
          )}
        </div>

        <input
          className="md:col-span-3 p-2 rounded bg-slate-900 outline-none focus:ring-2 focus:ring-sky-600/40"
          placeholder="District"
          value={district}
          onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setDistrict(""); setPage(1); } }}
          aria-label="Filter by district"
        />
        <input
          className="md:col-span-3 p-2 rounded bg-slate-900 outline-none focus:ring-2 focus:ring-sky-600/40"
          placeholder="Taluka"
          value={taluka}
          onChange={(e) => { setTaluka(e.target.value); setPage(1); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setTaluka(""); setPage(1); } }}
          aria-label="Filter by taluka"
        />
        <input
          className="md:col-span-3 p-2 rounded bg-slate-900 outline-none focus:ring-2 focus:ring-sky-600/40"
          placeholder="Village"
          value={village}
          onChange={(e) => { setVillage(e.target.value); setPage(1); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setVillage(""); setPage(1); } }}
          aria-label="Filter by village"
        />

        <div className="md:col-span-12 flex flex-wrap items-center gap-2">
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
            title="Clear all filters"
          >
            Clear
          </button>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-700 text-sm w-full md:w-auto"
            title="Refresh"
          >
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={exporting}
            className={cls(
              "px-3 py-1.5 rounded text-sm w-full md:w-auto",
              exporting ? "bg-slate-700 cursor-wait" : "bg-emerald-700 hover:bg-emerald-600"
            )}
            title="Download all rows as CSV (opens in Excel)"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>

          {activeFilters > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Filters • {activeFilters}
            </span>
          )}

          <div className="md:ml-auto flex items-center gap-2 text-sm w-full md:w-auto">
            <span className="text-slate-400" title="Rows per page">Rows</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-slate-900 p-1 rounded outline-none focus:ring-2 focus:ring-sky-600/40"
              aria-label="Rows per page"
            >
              {[10, 20, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
            <div className="flex gap-2 ml-auto md:ml-0">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cls("px-2 py-1 rounded w-full md:w-auto", page <= 1 ? "bg-slate-700/40 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600")}
                title="Previous page"
              >
                Prev
              </button>
              <span className="text-slate-300 self-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cls("px-2 py-1 rounded w-full md:w-auto", page >= totalPages ? "bg-slate-700/40 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600")}
                title="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>


      {err && <div className="mb-2 text-rose-400 text-sm">Error: {err}</div>}
      <div className="mb-2 text-sm text-slate-400">{loading ? "Loading…" : `Showing ${items.length} of ${total}`}</div>

      <div className="space-y-3">
        {loading && items.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cls(compact ? "p-3" : "p-4", "bg-slate-800 rounded-lg animate-pulse")}>
                <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
                <div className="h-3 w-1/2 bg-slate-700 rounded mb-2" />
                <div className="h-3 w-1/4 bg-slate-700 rounded" />
              </div>
            ))
          : items.map((p) => <Row key={p._id} p={p} />)}
        {!loading && items.length === 0 && <div className="text-slate-400">No properties found.</div>}
      </div>

      {/* ✴️ Edit Coordinates Modal */}
      {canEdit(role) && editing && (
        <GeoEditorModal
          property={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Inline Geo Editor Modal ---------------- */
function GeoEditorModal({ property, onClose, onSaved }) {
  const [lng, setLng] = useState(property?.geo?.coordinates?.[0] ?? "");
  const [lat, setLat] = useState(property?.geo?.coordinates?.[1] ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function valid(lngV, latV) {
    const L1 = Number(lngV), L2 = Number(latV);
    return Number.isFinite(L1) && Number.isFinite(L2) && L1 >= -180 && L1 <= 180 && L2 >= -90 && L2 <= 90;
  }

  async function save(recompute = true) {
    if (!valid(lng, lat)) { setErr("Enter valid [lng, lat]"); return; }
    setSaving(true); setErr("");
    try {
      const body = { geo: { type: "Point", coordinates: [Number(lng), Number(lat)], geo_source: "properties-edit" } };
      const res = await fetch(`${API_BASE}/properties/${property._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      let updated = await res.json();

      if (recompute) {
        const rec = await fetch(`${API_BASE}/properties/${property._id}/recompute`, { method: "POST", credentials: "include" });
        if (rec.ok) updated = await rec.json();
      }

      toast("Saved ✓");
      onSaved?.(updated);
      onClose?.();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-[420px] bg-slate-900 rounded-xl border border-white/10 p-4">
        <div className="text-lg font-semibold mb-2">Edit Coordinates</div>
        <div className="text-slate-400 text-xs mb-3">Use [lng, lat]. Example: 79.295943, 19.947035</div>

        <label className="text-sm text-slate-400">Longitude (lng)</label>
        <input
          className="w-full p-2 rounded bg-slate-800 mb-2 outline-none focus:ring-2 focus:ring-sky-600/40"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          type="number"
          step="0.000001"
          placeholder="79.295943"
        />

        <label className="text-sm text-slate-400">Latitude (lat)</label>
        <input
          className="w-full p-2 rounded bg-slate-800 mb-3 outline-none focus:ring-2 focus:ring-sky-600/40"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          type="number"
          step="0.000001"
          placeholder="19.947035"
        />

        {err && <div className="text-rose-400 text-xs mb-2">{err}</div>}

        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded bg-slate-700" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500" onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving…" : "Save + Recompute"}
          </button>
        </div>
      </div>
    </div>
  );
}
