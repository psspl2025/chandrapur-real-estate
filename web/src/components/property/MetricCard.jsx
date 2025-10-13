import React from "react";

export default function MetricCard({ label, value, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded border border-slate-700 bg-slate-800/40 hover:bg-slate-700/40 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-100">{value ?? "—"}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </button>
  );
}
