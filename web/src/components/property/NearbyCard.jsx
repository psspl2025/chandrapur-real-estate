// web/src/components/property/NearbyCard.jsx
import React from "react";

const List = ({ title, items = [], onFocus }) => (
  <div className="p-3 rounded border border-slate-700 bg-slate-800/40">
    <div className="text-[11px] text-slate-400 mb-2">{title}</div>
    <div className="space-y-1">
      {items.length === 0 && <div className="text-slate-400 text-[12px]">No data</div>}
      {items.slice(0, 3).map((x, i) => (
        <div key={i} className="flex justify-between gap-2">
          <button
            onClick={() => onFocus({ lat: x.lat, lng: x.lng })}
            className="text-left text-slate-100 hover:underline truncate"
            title={x.name}
          >
            {i + 1}. {x.name}
          </button>
          <span className="text-[12px] text-slate-300">{x?.distance_m != null ? (x.distance_m / 1000).toFixed(2) : "—"} km</span>
        </div>
      ))}
    </div>
  </div>
);

export default function NearbyCard({ c, onFocus }) {
  return (
    <div className="border border-slate-700">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2">Nearby</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        <List title="Schools (top 3)" items={c?.schools || []} onFocus={onFocus} />
        <List title="Hospitals (top 3)" items={c?.hospitals || []} onFocus={onFocus} />
        <List title="Industries (top 3)" items={c?.industries || []} onFocus={onFocus} />
        <List title="Rivers (nearby)" items={c?.rivers || []} onFocus={onFocus} />
      </div>
    </div>
  );
}
