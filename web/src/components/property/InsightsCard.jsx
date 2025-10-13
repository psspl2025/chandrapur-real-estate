import React from "react";

const km = (m) => (m == null ? "—" : `${Number((m / 1000).toFixed(2))} km`);
const mins = (m) => `${Math.max(1, Math.round(m))} min`;

/** Default speeds (km/h) — tune as needed */
const DEFAULT_SPEEDS = {
  HIGHWAY: 60,
  CITY: 25,
  RURAL: 35,
};

/** Choose which distance to show: prefer routed meters if present */
function bestDistanceM(poi) {
  return Number.isFinite(poi?.route_distance_m) ? poi.route_distance_m : poi?.distance_m;
}

/** Prefer real route duration if available; else estimate from distance & category */
function etaMinutesForPoi(poi, category, speeds = DEFAULT_SPEEDS) {
  if (Number.isFinite(poi?.route_duration_s)) return Math.round(poi.route_duration_s / 60);
  const d = bestDistanceM(poi);
  if (!Number.isFinite(d)) return null;
  const kmh =
    category === "HIGHWAY" ? speeds.HIGHWAY :
    category === "RURAL"   ? speeds.RURAL   :
                              speeds.CITY;
  const hours = (d / 1000) / Math.max(1, kmh);
  return Math.round(hours * 60);
}

function Row({ label, poi, category }) {
  if (!poi?.name) return null;
  const dist = bestDistanceM(poi);
  const eta = etaMinutesForPoi(poi, category);
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-slate-200">{label}:</span>
        <span className="text-slate-300">{poi.name}</span>
        {Number.isFinite(dist) && (
          <span className="text-[11px] px-1.5 py-0.5 rounded border bg-slate-700/60 border-slate-600 text-slate-100">
            {km(dist)}
          </span>
        )}
        {Number.isFinite(eta) && (
          <span className="text-[11px] text-slate-400">~{mins(eta)}</span>
        )}
      </span>
    </li>
  );
}

export default function InsightsCard({
  c = {},
  areaText = "-",
  landUse = "-",
  onReload,
}) {
  // pick best candidates from each category
  const school1   = c.schools_top5?.[0] || c.schools?.[0] || c.nearest_school?.[0];
  const hosp1     = c.hospitals_top5?.[0] || c.hospitals?.[0] || c.gov_hospital?.[0];
  const market1   = c.market || c.markets?.[0];
  const rail1     = c.transport?.rail || c.rail_stations?.[0];
  const bus1      = c.transport?.bus || c.bus_main?.[0];
  const hwy       = c.nearestHighway;
  const road      = c.nearestMajorRoad;
  const temple1   = c.temples?.[0];
  const tourist1  = c.tourist_places?.[0];
  const industry1 = (c.industries_top || c.industries)?.[0] || c.midc?.[0];

  // header logic prefers route distance when present
  const dHwy  = bestDistanceM(hwy);
  const dMrkt = bestDistanceM(market1);
  const dHosp = bestDistanceM(hosp1);

  let header = "Great connectivity with daily essentials close by.";
  if (Number.isFinite(dHwy) && Number.isFinite(dMrkt) && Number.isFinite(dHosp) &&
      dHwy <= 3000 && dMrkt <= 3000 && dHosp <= 3000) {
    header = "Prime location: highway, market, and hospital within 3 km.";
  } else if (bestDistanceM(rail1) <= 20000) {
    header = "Well-connected by rail with key amenities nearby.";
  }

  return (
    <div className="mt-3 border border-slate-700 rounded overflow-hidden">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2">Insights & Benefits</div>
      <div className="p-3 space-y-3">
        <div className="text-slate-200">{header}</div>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              <span className="text-slate-200">Land:</span>{" "}
              <span className="text-slate-300">{landUse} • {areaText}</span>
            </span>
          </li>

          {hwy && <Row label="Highway access" poi={hwy} category="HIGHWAY" />}
          {road && <Row label="Major road" poi={road} category="RURAL" />}
          {rail1 && <Row label="Rail connectivity" poi={rail1} category="CITY" />}
          {bus1 && <Row label="Bus stand" poi={bus1} category="CITY" />}
          {market1 && <Row label="Main market" poi={market1} category="CITY" />}
          {hosp1 && <Row label="Healthcare" poi={hosp1} category="CITY" />}
          {school1 && <Row label="Education nearby" poi={school1} category="CITY" />}
          {industry1 && <Row label="Employment/Industry" poi={industry1} category="RURAL" />}
          {temple1 && <Row label="Temple" poi={temple1} category="RURAL" />}
          {tourist1 && <Row label="Tourism" poi={tourist1} category="RURAL" />}
        </ul>

        <div className="text-[11px] text-slate-400">
          Times prefer real driving duration when available; otherwise they’re estimated from distance (city 25 km/h, rural 35 km/h, highway 60 km/h).
        </div>

        {onReload && (
          <button
            onClick={onReload}
            className="text-xs px-2 py-1 rounded border bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100"
          >
            Refresh insights
          </button>
        )}
      </div>
    </div>
  );
}
