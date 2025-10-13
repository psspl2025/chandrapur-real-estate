// web/src/components/project/ProjectHeader.jsx
import React from "react";

/* ---------- tiny inline SVG icons (no extra deps) ---------- */
const Dot = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={`w-3 h-3 ${className}`} fill="currentColor">
    <circle cx="12" cy="12" r="6" />
  </svg>
);
const Home = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`} fill="currentColor">
    <path d="M12 3 3 10h2v10h6v-6h2v6h6V10h2z" />
  </svg>
);
const Refresh = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`} fill="currentColor">
    <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 5l5 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 13.65-5.65z" />
  </svg>
);
const Plus = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`} fill="currentColor">
    <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
  </svg>
);

/* --------------------- small utilities --------------------- */
const nfmt = (v) => Number(v || 0).toLocaleString("en-IN");

/* --------------------- KPI Card (colored) ------------------ */
function KpiCard({ tone = "sky", icon, label, value, active, onClick }) {
  const tones = {
    sky:   { ring: "ring-sky-500/50",   bg: "bg-sky-900/20",   hover: "hover:bg-sky-900/30",   text: "text-sky-200" },
    green: { ring: "ring-emerald-500/50", bg: "bg-emerald-900/20", hover: "hover:bg-emerald-900/30", text: "text-emerald-200" },
    amber: { ring: "ring-amber-500/50", bg: "bg-amber-900/20", hover: "hover:bg-amber-900/30", text: "text-amber-200" },
    red:   { ring: "ring-rose-500/50",  bg: "bg-rose-900/20",  hover: "hover:bg-rose-900/30",  text: "text-rose-200" },
  };
  const t = tones[tone] || tones.sky;

  return (
    <button
      onClick={onClick}
      className={`group px-3 py-2 rounded border text-left transition
        ${active ? "border-white/30 ring-2 " + t.ring : "border-slate-700"}
        ${t.bg} ${t.hover}`}
      title={label}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center rounded-md p-1 ${t.text} bg-black/20`}>
          {icon}
        </span>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      </div>
      <div className="mt-0.5 text-xl font-semibold text-slate-100">{nfmt(value)}</div>
    </button>
  );
}

/* ---------------------- Quick filter pill ------------------ */
function Pill({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full border border-slate-600 text-[11px] text-slate-300 bg-slate-800/60">
      {children}
      <button
        onClick={onClear}
        className="w-4 h-4 grid place-items-center rounded-full bg-slate-700 text-slate-200 hover:bg-slate-600"
        title="Clear filter"
      >
        ×
      </button>
    </span>
  );
}

export default function ProjectHeader({
  q, setQ,
  status, setStatus,
  booking, setBooking,
  district, setDistrict,
  kpis = { total: 0, available: 0, ongoing: 0, soldout: 0 },
  onKpiClick,
  onRefresh, onClear, onNew,
  view, setView, // optional: "table" | "cards"
}) {
  return (
    <div className="border border-slate-600 p-3 rounded bg-slate-900/40 backdrop-blur-sm">
      {/* Title row */}
      <div className="relative">
        <h2
          className="w-full text-center text-2xl font-extrabold tracking-wide
                     bg-gradient-to-r from-sky-300 via-white to-sky-300
                     bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(56,189,248,0.2)]"
        >
          Real Estate Dashboard
        </h2>
        {/* Optional subtitle for context */}
        {/* <p className="mt-1 text-center text-slate-400 text-xs">
          {kpis.total} projects • {kpis.available} available • Updated {new Date().toLocaleDateString()}
        </p> */}
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-sky-600/40 to-transparent" />
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {setView && (
            <div className="hidden md:flex border border-slate-600 rounded overflow-hidden">
              <button
                onClick={() => setView("table")}
                className={`px-2 py-1 text-xs ${view === "table" ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"}`}
                title="Table view"
              >
                Table
              </button>
              <button
                onClick={() => setView("cards")}
                className={`px-2 py-1 text-xs ${view === "cards" ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"}`}
                title="Cards view"
              >
                Cards
              </button>
            </div>
          )}

          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm shadow-sm"
            title="Create a new project"
          >
            <Plus className="opacity-90" /> New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 md:col-span-4">
          <div className="relative">
            <input
              placeholder="Search by project, mouza, ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border border-slate-600 pl-9 pr-2 py-2 w-full bg-slate-950 text-slate-100 rounded placeholder:text-slate-500"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
              <Home />
            </span>
          </div>
        </div>

        <div className="col-span-6 md:col-span-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-600 px-2 py-2 w-full bg-slate-950 text-slate-100 rounded"
            title="Project status"
          >
            <option value="">Status: All</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="ONHOLD">On Hold</option>
          </select>
        </div>

        <div className="col-span-6 md:col-span-2">
          <select
            value={booking}
            onChange={(e) => setBooking(e.target.value)}
            className="border border-slate-600 px-2 py-2 w-full bg-slate-950 text-slate-100 rounded"
            title="Booking filter"
          >
            <option value="">Booking: All</option>
            <option value="AVAILABLE">Available</option>
            <option value="SOLDOUT">Sold-out</option>
          </select>
        </div>

        <div className="col-span-6 md:col-span-2">
          <input
            placeholder="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="border border-slate-600 px-2 py-2 w-full bg-slate-950 text-slate-100 rounded placeholder:text-slate-500"
          />
        </div>

        <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
          <button
            onClick={onClear}
            className="inline-flex items-center gap-2 border border-slate-600 px-3 py-2 rounded text-slate-200 hover:bg-slate-800/70"
            title="Clear filters"
          >
            Clear
          </button>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 border border-slate-600 px-3 py-2 rounded text-slate-200 hover:bg-slate-800/70"
            title="Refresh"
          >
            <Refresh className="opacity-80" />
            Refresh
          </button>
        </div>
      </div>

      {/* Active filter pills */}
      {(status || booking || district || q) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {q && <Pill onClear={() => setQ("")}>Search: {q}</Pill>}
          {status && <Pill onClear={() => setStatus("")}>Status: {status}</Pill>}
          {booking && <Pill onClear={() => setBooking("")}>Booking: {booking}</Pill>}
          {district && <Pill onClear={() => setDistrict("")}>District: {district}</Pill>}
        </div>
      )}

      {/* KPI strip */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          tone="sky"
          icon={<Dot className="text-sky-300" />}
          label="Total Projects"
          value={kpis.total}
          active={!status && !booking}
          onClick={() => onKpiClick?.("total")}
        />
        <KpiCard
          tone="green"
          icon={<Dot className="text-emerald-300" />}
          label="Available"
          value={kpis.available}
          active={booking === "AVAILABLE"}
          onClick={() => onKpiClick?.("available")}
        />
        <KpiCard
          tone="amber"
          icon={<Dot className="text-amber-300" />}
          label="Ongoing"
          value={kpis.ongoing}
          active={status === "ONGOING"}
          onClick={() => onKpiClick?.("ongoing")}
        />
        <KpiCard
          tone="red"
          icon={<Dot className="text-rose-300" />}
          label="Sold-out"
          value={kpis.soldout}
          active={booking === "SOLDOUT"}
          onClick={() => onKpiClick?.("soldout")}
        />
      </div>
    </div>
  );
}
