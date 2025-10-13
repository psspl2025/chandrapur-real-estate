// web/src/components/property/ConnectivityGrid.jsx
import React from "react";

function fmtKm(meters) {
  if (meters == null) return "—";
  const km = meters / 1000;
  // keep 2 decimals but strip trailing zeros
  return `${Number(km.toFixed(2))} km`;
}

const Box = ({ title, item, onFocus }) => {
  const name = item?.name || "—";
  const dist = fmtKm(item?.distance_m);
  const canFocus = item?.lat != null && item?.lng != null;

  return (
    <div className="p-3 rounded border border-slate-700 bg-slate-800/40">
      <div className="text-[11px] text-slate-400 mb-1">{title}</div>
      <div className="text-slate-100 truncate" title={name}>{name}</div>
      <div className="text-[12px] text-slate-300">{dist}</div>
      {canFocus && (
        <button
          onClick={() => onFocus?.({ lat: item.lat, lng: item.lng })}
          className="mt-1 text-[12px] text-sky-400 hover:underline"
        >
          View on map
        </button>
      )}
    </div>
  );
};

/**
 * Props:
 *  - c: doc.computed (expects nearestHighway, nearestMajorRoad, transport.rail, transport.bus)
 *  - onFocus: ({lat, lng}) => void   // recenter map
 */
export default function ConnectivityGrid({ c = {}, onFocus }) {
  return (
    <div className="border border-slate-700">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2">Connectivity</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        <Box title="Highway" item={c.nearestHighway} onFocus={onFocus} />
        <Box title="Major road" item={c.nearestMajorRoad} onFocus={onFocus} />
        <Box title="Rail" item={c?.transport?.rail} onFocus={onFocus} />
        <Box title="Bus" item={c?.transport?.bus} onFocus={onFocus} />
      </div>
    </div>
  );
}
