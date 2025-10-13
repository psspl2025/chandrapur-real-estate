import React, { useMemo } from "react";

export default function InsightsPanel({ items = [], loading }) {
  const byStatus = useMemo(() => {
    const m = new Map();
    items.forEach(i => m.set(i.status || "-", (m.get(i.status || "-") || 0) + 1));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
  }, [items]);

  const byDistrict = useMemo(() => {
    const m = new Map();
    items.forEach(i => {
      const k = i.locationDetails?.district || "-";
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [items]);

  const avgDocs = useMemo(() => {
    const total = items.length || 1;
    const done = items.reduce((acc,i)=> acc + (Object.values(i?.docChecklist || {}).filter(Boolean).length), 0);
    return Math.round((done / (items.length * 8 || 1)) * 100);
  }, [items]);

  return (
    <div className="border border-slate-700 rounded p-3 sticky top-4">
      <div className="font-semibold text-slate-100 mb-2">Insights</div>
      {loading && <div className="text-slate-400 text-sm">Loading…</div>}

      <div className="text-xs text-slate-400 mb-2">Avg docs completion</div>
      <div className="h-2 w-full bg-slate-800 rounded overflow-hidden mb-4">
        <div className="h-2 bg-emerald-500" style={{ width: `${avgDocs}%` }}></div>
      </div>

      <div className="text-xs text-slate-400 mb-1">By status</div>
      <ul className="mb-3 text-sm space-y-1">
        {byStatus.map(([k,v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-slate-400">{v}</span></li>)}
      </ul>

      <div className="text-xs text-slate-400 mb-1">Top districts</div>
      <ul className="text-sm space-y-1">
        {byDistrict.map(([k,v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-slate-400">{v}</span></li>)}
      </ul>
    </div>
  );
}
