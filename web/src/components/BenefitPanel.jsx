// web/src/components/BenefitPanel.jsx
import { useState } from "react";

const km = (m) => (m == null ? "" : `${(m / 1000).toFixed(1)} km`);

function Pill({ tone = "slate", children }) {
  // Tailwind dynamic classes: ensure safelist in config if needed
  const cls =
    tone === "emerald"
      ? "bg-emerald-800/40 text-emerald-200 border-emerald-700"
      : tone === "orange"
      ? "bg-orange-800/40 text-orange-200 border-orange-700"
      : tone === "green"
      ? "bg-green-800/40 text-green-200 border-green-700"
      : "bg-slate-800/40 text-slate-200 border-slate-700";

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
}

function Row({ label, value, extra }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-slate-300">{label}</div>
      <div className="text-right">
        <div className="text-slate-100">{value}</div>
        {extra && <div className="text-xs text-slate-400">{extra}</div>}
      </div>
    </div>
  );
}

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded ${
      active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700/60"
    } text-sm`}
  >
    {children}
  </button>
);

export default function BenefitPanel({ doc, benefitText, areaOverride }) {
  const [tab, setTab] = useState("summary");
  const c = doc?.computed || {};
  const admin = doc?.location_admin || {};
  const areaAcres =
    typeof doc?.parcel?.area?.acres === "number"
      ? doc.parcel.area.acres.toFixed(3)
      : "-";

  const names = (arr, limit = 3) =>
    Array.isArray(arr) && arr.length
      ? `${arr.slice(0, limit).map((x) => x.name).join(", ")}${
          arr.length > limit ? ` +${arr.length - limit}` : ""
        }`
      : null;

  return (
    <div className="bg-slate-800 rounded-lg p-3 md:p-4 border border-slate-700">
      {/* Header */}
      <div className="mb-2">
        <div className="text-base font-semibold text-slate-100">
          {[admin.village, admin.taluka, admin.district].filter(Boolean).join(", ") || "—"}
        </div>
        <div className="text-sm text-slate-300">
          Area: <b>{areaOverride ?? areaAcres}</b> • Use:{" "}
          <b>{doc?.use_and_crop?.land_use || "-"}</b>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Pill tone={c.roadTouch ? "emerald" : "orange"}>
            {c.roadTouch ? "Road touch" : "No road touch"}
          </Pill>
          {c.nearestHighway?.name && (
            <Pill tone="orange">🛣 {c.nearestHighway.name} • {km(c.nearestHighway.distance_m)}</Pill>
          )}
          {c.nearestMajorRoad?.name && (
            <Pill tone="green">🛤 {c.nearestMajorRoad.name} • {km(c.nearestMajorRoad.distance_m)}</Pill>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 my-3">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>Summary</TabButton>
        <TabButton active={tab === "connect"} onClick={() => setTab("connect")}>Connectivity</TabButton>
        <TabButton active={tab === "neighbour"} onClick={() => setTab("neighbour")}>Neighbourhood</TabButton>
      </div>
      <div className="h-px bg-slate-700 mb-3" />

      {/* Tab content */}
      {tab === "summary" && (
        <div className="space-y-2">
          {benefitText ? (
            <div className="text-xs whitespace-pre-wrap bg-slate-900/70 border border-slate-700 rounded p-2">
              {benefitText}
            </div>
          ) : (
            <div className="text-sm text-slate-400">Click “Reload Benefit” to generate the narrative.</div>
          )}
        </div>
      )}

      {tab === "connect" && (
        <div className="grid grid-cols-1 gap-2">
          <Row label="Nearest village" value={c.nearestVillage?.name} extra={km(c.nearestVillage?.distance_m)} />
          <Row label="Taluka HQ" value={c.nearestTalukaHQ?.name} extra={km(c.nearestTalukaHQ?.distance_m)} />
          <Row label="District HQ" value={c.nearestDistrictHQ?.name} extra={km(c.nearestDistrictHQ?.distance_m)} />
          <Row label="Market" value={c.market?.name} extra={km(c.market?.distance_m)} />
          <Row label="Railway" value={c.transport?.rail?.name} extra={km(c.transport?.rail?.distance_m)} />
          <Row label="Bus stand" value={c.transport?.bus?.name} extra={km(c.transport?.bus?.distance_m)} />
        </div>
      )}

      {tab === "neighbour" && (
        <div className="grid grid-cols-1 gap-2">
          <Row
            label="Schools nearby"
            value={Array.isArray(c.schools) && c.schools.length ? `${c.schools.length}` : null}
            extra={names(c.schools)}
          />
          <Row
            label="Hospitals nearby"
            value={Array.isArray(c.hospitals) && c.hospitals.length ? `${c.hospitals.length}` : null}
            extra={names(c.hospitals)}
          />
          <Row
            label="Industries"
            value={Array.isArray(c.industries) && c.industries.length ? `${c.industries.length}` : null}
            extra={names(c.industries, 2)}
          />
          <Row label="Rivers" value={names(c.rivers)} />
        </div>
      )}
    </div>
  );
}
