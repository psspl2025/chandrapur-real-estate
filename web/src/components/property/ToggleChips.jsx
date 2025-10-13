// web/src/components/property/ToggleChips.jsx
import React from "react";

const ICONS = {
  HIGHWAY: "🛣️",
  ROAD: "🛤️",
  MARKET: "🛒",
  MALL: "🏬",
  RAIL: "🚆",
  BUS: "🚌",
  SCHOOL: "🏫",
  HOSPITAL: "🏥",
  INDUSTRY: "🏭",
  GOVT: "🏢",
  TEMPLE: "🛕",
  TOURIST: "📍",
  RIVER: "🌊",
};

const LABELS = {
  HIGHWAY: "Highway",
  ROAD: "Major Road",
  MARKET: "Market",
  MALL: "Mall",
  RAIL: "Rail",
  BUS: "Bus",
  SCHOOL: "Schools",
  HOSPITAL: "Hospitals",
  INDUSTRY: "Industries",
  GOVT: "Govt Offices",
  TEMPLE: "Temples",
  TOURIST: "Tourist",
  RIVER: "Rivers",
};

// Control the visual order; unknown keys are appended at the end.
const ORDER = [
  "HIGHWAY",
  "ROAD",
  "MARKET",
  "MALL",
  "BUS",
  "RAIL",
  "SCHOOL",
  "HOSPITAL",
  "INDUSTRY",
  "GOVT",
  "TEMPLE",
  "TOURIST",
  "RIVER",
];

export default function ToggleChips({ state = {}, onToggle }) {
  const entries = Object.entries(state);
  const known = ORDER.filter((k) => state.hasOwnProperty(k)).map((k) => [k, state[k]]);
  const unknown = entries.filter(([k]) => !ORDER.includes(k));

  const setAll = (val) => {
    // caller keeps state; send toggle events for each key
    Object.keys(state).forEach((k) => {
      if (!!state[k] !== val) onToggle(k);
    });
  };

  return (
    <div className="mb-2">
      {/* Quick actions */}
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="px-2 py-1 rounded border bg-slate-700 border-slate-600 hover:bg-slate-600"
          title="Show all"
        >
          Show All
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="px-2 py-1 rounded border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          title="Hide all"
        >
          Hide All
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[...known, ...unknown].map(([k, v]) => (
          <label
            key={k}
            className={`px-2 py-1 rounded border cursor-pointer ${
              v ? "bg-slate-700 border-slate-600" : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title={LABELS[k] || k}
          >
            <input
              type="checkbox"
              checked={!!v}
              onChange={() => onToggle(k)}
              className="mr-1 align-middle"
            />
            <span className="mr-1">{ICONS[k] || "•"}</span>
            {LABELS[k] || k}
          </label>
        ))}
      </div>
    </div>
  );
}
