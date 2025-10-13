import React from "react";

export default function HeroChips({ area, landUse, roadTouch, extras = [] }) {
  const Chip = ({ label, value, tone = "slate" }) => (
    <div className={`px-3 py-2 rounded-lg bg-${tone}-800/60 border border-${tone}-700`}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <Chip label="Area" value={area} />
      <Chip label="Land use" value={landUse} />
      <Chip
        label="Road touch"
        value={roadTouch ? "Yes" : "No"}
        tone={roadTouch ? "emerald" : "amber"}
      />
      {extras.map((e, i) => (
        <Chip key={i} label={e.label} value={e.value} />
      ))}
    </div>
  );
}
