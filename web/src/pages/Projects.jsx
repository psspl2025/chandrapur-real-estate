import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config";
import { useSearchParams } from "react-router-dom";
import ProjectHeader from "../components/projects/ProjectHeader";
import ProjectListTable from "../components/projects/ProjectListTable";
import ProjectDetailDrawer from "../components/projects/ProjectDetailDrawer";
import { DOC_ROWS } from "../components/projects/common"; // keep

function defaultProject() {
  return {
    projectId: "",
    projectName: "",
    projectType: "PLOTTING",
    status: "ONGOING",
    bookingStatus: "",
    launchDate: null,
    completionDate: null,
    locationDetails: { address: "", mouza: "", tehsil: "", district: "", surveyNo: "", warg: "" },
    plots: [],
    financials: { totalAgreementValue: null, stampDuty: null, registrationFee: null, totalValue: null, ratePerSqft: null },
    counts: { noOfPlots: 0 },
    totals: { totalPlotableSqm: 0, totalPlotableSqft: 0, addedTaxTDS: null },
    docChecklist: {},
    docFiles: {},
  };
}

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();

  // cross-page broadcast channel (➡ informs Properties page)
  const bcRef = useRef(null);
  useEffect(() => {
    try { bcRef.current = new BroadcastChannel("app-events"); } catch {}
    return () => { try { bcRef.current?.close?.(); } catch {} };
  }, []);

  // URL-synced filters
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [booking, setBooking] = useState(searchParams.get("booking") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [limit, setLimit] = useState(Number(searchParams.get("limit") || 20));
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "projectId");
  const [sortDir, setSortDir] = useState(searchParams.get("sortDir") || "asc");

  // list & selection
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("overview");
  const [pendingOnly, setPendingOnly] = useState(false);

  // optional view toggle
  const [view, setView] = useState("table");

  // sync URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (district) p.set("district", district);
    if (booking) p.set("booking", booking);
    p.set("page", String(page));
    p.set("limit", String(limit));
    p.set("sortBy", sortBy);
    p.set("sortDir", sortDir);
    setSearchParams(p, { replace: true });
  }, [q, status, district, booking, page, limit, sortBy, sortDir, setSearchParams]);

  // debounce search
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // load list
  const abortRef = useRef(null);
  const loadList = useCallback(async () => {
    setLoading(true); setErr("");
    abortRef.current?.abort?.();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const params = new URLSearchParams();
      if (qDebounced) params.set("q", qDebounced);
      if (district) params.set("district", district);
      if (status) params.set("status", status);
      params.set("limit", "500");
      const res = await fetch(`${API_BASE}/projects/summary?${params.toString()}`, { signal: ctl.signal, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        setErr(String(e.message || e));
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [qDebounced, status, district]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => () => abortRef.current?.abort?.(), []);

  // KPIs
  const kpis = useMemo(() => {
    const total = items.length;
    const ongoing = items.filter((p) => p.status === "ONGOING").length;
    const available = items.filter((p) => /available|open/i.test(p.bookingStatus || "")).length;
    const soldout = items.filter((p) => /sold\s*out|sold/i.test(p.bookingStatus || "")).length;
    return { total, ongoing, available, soldout };
  }, [items]);

  // booking filter
  const bookingFiltered = useMemo(() => {
    if (!booking) return items;
    if (booking === "AVAILABLE") return items.filter((p) => /available|open/i.test(p.bookingStatus || ""));
    if (booking === "SOLDOUT") return items.filter((p) => /sold\s*out|sold/i.test(p.bookingStatus || ""));
    return items;
  }, [items, booking]);

  // sorting (docs column now uses docFiles presence)
  const sorted = useMemo(() => {
    const copy = [...bookingFiltered];
    const dir = sortDir === "desc" ? -1 : 1;

    const getKey = (o) => {
      switch (sortBy) {
        case "name":    return (o.projectName || "").toLowerCase();
        case "type":    return o.projectType || "";
        case "status":  return o.status || "";
        case "district":return o.locationDetails?.district || "";
        case "mouza":   return o.locationDetails?.mouza || "";
        case "plots":   return Number(o.counts?.noOfPlots || 0);
        case "sqft":    return Number(o.totals?.totalPlotableSqft || 0);
        case "rate":    return Number(o.financials?.ratePerSqft || 0);
        case "docs": {
          const files = o?.docFiles || {};
          const total = DOC_ROWS.length;
          const done = DOC_ROWS.reduce((a, [, key]) => a + (files[key] ? 1 : 0), 0);
          return total > 0 ? done / total : 0;
        }
        default:        return (o.projectId || "").toString().toLowerCase();
      }
    };

    copy.sort((a, b) => {
      const A = getKey(a);
      const B = getKey(b);
      if (A < B) return -1 * dir;
      if (A > B) return  1 * dir;
      return 0;
    });
    return copy;
  }, [bookingFiltered, sortBy, sortDir]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const paged = useMemo(
    () => sorted.slice((page - 1) * limit, (page - 1) * limit + limit),
    [sorted, page, limit]
  );

  // detail loaders
  const loadDetail = useCallback(async (id) => {
    if (!id || id === "__new__") { setDetail(defaultProject()); return; }
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, { credentials: "include" });
      if (!res.ok) return;
      setDetail(await res.json());
    } catch {}
  }, []);
  useEffect(() => { if (sel) loadDetail(sel); }, [sel, loadDetail]);

  // selection helpers
  const openDetail  = useCallback((id) => { setSel(id); setTab("overview"); }, []);
  const openNew     = useCallback(() => { setSel("__new__"); setTab("edit"); }, []);
  const closeDetail = useCallback(() => { setSel(null); setDetail(null); }, []);
  const goPrev = useCallback(() => {
    const all = sorted.map(p => p._id);
    const i = all.indexOf(sel);
    if (i > 0) setSel(all[i - 1]);
  }, [sel, sorted]);
  const goNext = useCallback(() => {
    const all = sorted.map(p => p._id);
    const i = all.indexOf(sel);
    if (i >= 0 && i < all.length - 1) setSel(all[i + 1]);
  }, [sel, sorted]);
  const toggleSort = useCallback((key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  }, [sortBy]);
  const resetFilters = useCallback(() => {
    setQ(""); setStatus(""); setDistrict(""); setBooking(""); setPage(1);
  }, []);

  // CRUD
  const createProject = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    const created = await res.json();
    await loadList();
    setSel(created._id);
    setTab("overview");
    await loadDetail(created._id);

    // 🔔 notify other pages (Properties.jsx) to refresh
    try { bcRef.current?.postMessage?.({ type: "project-created", id: created._id }); } catch {}
    try {
      localStorage.setItem("app:lastProjectCreated", String(Date.now()));
      localStorage.removeItem("app:lastProjectCreated");
    } catch {}

    return created;
  }, [loadDetail, loadList]);

  const updateProject = useCallback(async (id, payload) => {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = await res.json();
    await loadList();
    await loadDetail(id);
    setTab("overview");
    return updated;
  }, [loadDetail, loadList]);

  const deleteProject = useCallback(async (id) => {
    const ok = confirm("Delete this project? This cannot be undone.");
    if (!ok) return;
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { alert(await res.text()); return; }
    await loadList();
    closeDetail();
  }, [closeDetail, loadList]);

  // KPI click handlers
  const onKpiClick = useCallback((key) => {
    if (key === "total")     { setStatus(""); setBooking(""); setPage(1); return; }
    if (key === "ongoing")   { setStatus("ONGOING"); setPage(1); return; }
    if (key === "available") { setBooking("AVAILABLE"); setPage(1); return; }
    if (key === "soldout")   { setBooking("SOLDOUT"); setPage(1); return; }
  }, []);

  return (
    <div className="p-4 md:p-6 text-sm text-slate-200">
      <div className="mx-auto max-w-[1320px] p-5 rounded-xl bg-slate-900/50 backdrop-blur-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
        <ProjectHeader
          q={q} setQ={(v) => { setQ(v); setPage(1); }}
          status={status} setStatus={(v) => { setStatus(v); setPage(1); }}
          booking={booking} setBooking={(v) => { setBooking(v); setPage(1); }}
          district={district} setDistrict={(v) => { setDistrict(v); setPage(1); }}
          onRefresh={loadList} onClear={resetFilters}
          onNew={() => openNew()}
          kpis={kpis} onKpiClick={onKpiClick}
          view={view} setView={setView}
        />

        <div className="mt-3 text-sm text-slate-400">
          {loading ? "Loading…" : `Showing ${paged.length} of ${sorted.length} project(s)`}
          {err && <span className="text-rose-300 ml-2">Error: {err}</span>}
        </div>

        <ProjectListTable
          rows={paged}
          sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}
          page={page} limit={limit} totalPages={totalPages}
          setPage={setPage} setLimit={setLimit}
          onView={(id) => openDetail(id)}
        />
      </div>

      {sel && detail && (
        <ProjectDetailDrawer
          detail={detail}
          isNew={sel === "__new__"}
          tab={tab} setTab={setTab}
          pendingOnly={pendingOnly} setPendingOnly={setPendingOnly}
          onClose={closeDetail} onPrev={goPrev} onNext={goNext}
          reloadDetail={() => loadDetail(sel)} reloadList={loadList}
          onCreate={createProject} onUpdate={updateProject} onDelete={deleteProject}
        />
      )}
    </div>
  );
}
