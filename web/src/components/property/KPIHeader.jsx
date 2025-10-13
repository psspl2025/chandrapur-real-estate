// web/src/components/property/KPIHeader.jsx
import React from "react";

const K = ({ label, value, icon }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded border border-slate-700">
    <span className="text-lg">{icon}</span>
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm text-slate-100">{value ?? "—"}</div>
    </div>
  </div>
);

export default function KPIHeader({
  areaText,
  landUse,
  roadTouch,
  hospitalsCount,
  schoolsCount,
  marketNear,
  onToggleUnits,
  unitLabel,
  onCopyLink,
  onOpenGMaps,
  onRecompute,
  recomputing,
  brochureHref,
  hasCoords,
  onBack,
}) {
  return (
    <div className="mb-3">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 lg:col-span-9 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <K label="Area" value={areaText} icon="📐" />
          <K label="Land use" value={landUse || "—"} icon="🏷️" />
          <K label="Road touch" value={roadTouch ? "Yes" : "No"} icon="🛣️" />
          <K label="Hospitals ≤2km" value={hospitalsCount ?? 0} icon="🏥" />
          <K label="Schools ≤2km" value={schoolsCount ?? 0} icon="🏫" />
          <K label="Market ≤2km" value={marketNear ? "Yes" : "No"} icon="🛒" />
        </div>

        <div className="col-span-12 lg:col-span-3 flex flex-wrap lg:justify-end gap-2">
          <button
            onClick={onToggleUnits}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm"
            title="Toggle acres/hectares"
          >
            Show {unitLabel}
          </button>
          <button onClick={onCopyLink} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">
            Copy link
          </button>
          <button
            onClick={onOpenGMaps}
            disabled={!hasCoords}
            className={`px-3 py-1.5 rounded text-sm ${
              hasCoords ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-700/40 cursor-not-allowed"
            }`}
          >
            Google Maps
          </button>
          <button
            onClick={onRecompute}
            disabled={!hasCoords || recomputing}
            className={`px-3 py-1.5 rounded text-sm ${
              hasCoords ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-700/40 cursor-not-allowed"
            }`}
          >
            {recomputing ? "Recomputing…" : "Recompute"}
          </button>
          <a
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm"
            href={brochureHref}
            target="_blank"
            rel="noreferrer"
            title="Open brochure PDF"
          >
            Brochure
          </a>
          <button onClick={onBack} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
