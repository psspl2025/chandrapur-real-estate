import React, { useEffect, useMemo, useRef, useState } from "react";

export default function MultiSelect({ label, value = [], options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return options.filter(o => !qq || String(o).toLowerCase().includes(qq));
  }, [options, q]);

  const summary = value.length === 0
    ? label
    : value.length === 1
      ? `${label}: ${value[0]}`
      : `${label}: ${value.length} selected`;

  function toggle(opt) {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  }
  function clearAll() { onChange([]); setQ(""); }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="border border-slate-600 px-2 py-1 bg-slate-900 text-slate-100 rounded min-w-[160px] text-left"
      >
        {summary}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 bg-slate-900 border border-slate-700 rounded shadow-lg p-2">
          <input
            className="w-full mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-56 overflow-auto space-y-1 pr-1">
            {filtered.length === 0 && (
              <div className="text-slate-400 text-sm px-1 py-2">No options</div>
            )}
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm px-1 py-1 hover:bg-slate-800 rounded">
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-xs">
            <button onClick={clearAll} className="px-2 py-1 border border-slate-700 rounded">Clear</button>
            <button onClick={() => setOpen(false)} className="px-2 py-1 border border-slate-700 rounded">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
