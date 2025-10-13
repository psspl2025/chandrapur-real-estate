import React from "react";

function fmtKm(meters) {
  if (meters == null) return "—";
  const km = meters / 1000;
  return `${Number(km.toFixed(2))} km`;
}

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const top = (arr, n = 3) => (arr || []).filter(Boolean).slice(0, n);

const Row = ({ x, i, onFocus }) => {
  const canFocus = x?.lat != null && x?.lng != null;
  const gmaps =
    x?.lat != null && x?.lng != null
      ? `https://www.google.com/maps?q=${x.lat},${x.lng}`
      : x?.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${x.place_id}`
      : x?.gmaps_url;

  return (
    <div className="flex items-center justify-between gap-2">
      {canFocus ? (
        <button
          onClick={() => onFocus?.({ lat: x.lat, lng: x.lng })}
          className="text-left text-slate-100 hover:underline truncate"
          title={x?.name}
        >
          {i + 1}. {x?.name || "—"}
        </button>
      ) : (
        <span className="text-left text-slate-100 truncate" title={x?.name}>
          {i + 1}. {x?.name || "—"}
        </span>
      )}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] text-slate-300">{fmtKm(x?.distance_m)}</span>
        {gmaps && (
          <a
            href={gmaps}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 border border-slate-600"
            title="Open in Google Maps"
          >
            Maps
          </a>
        )}
      </div>
    </div>
  );
};

const Group = ({ title, items = [], onFocus, limit = 3 }) => {
  const list = items.filter(Boolean);
  const shown = top(list, limit);
  const more = Math.max(list.length - shown.length, 0);

  return (
    <div className="p-3 rounded border border-slate-700 bg-slate-800/40">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-slate-400">{title}</div>
        {more > 0 && <div className="text-[11px] text-slate-400">+{more} more</div>}
      </div>
      <div className="space-y-1">
        {shown.length === 0 && <div className="text-slate-400 text-[12px]">No data</div>}
        {shown.map((x, i) => (
          <Row key={`${x?.name || "item"}-${i}`} x={x} i={i} onFocus={onFocus} />
        ))}
      </div>
    </div>
  );
};

/**
 * Props:
 *  - c: doc.computed
 *    Expected keys (any can be a single object or an array; all optional):
 *      markets, malls,
 *      bus_main, bus_near, rail_stations,
 *      gov_hospital, hospitals, hospitals_top5,
 *      nearest_school, schools, schools_top5,
 *      colleges, institutes,
 *      govt_offices (array; each item name like "Municipal Corporation", "Court", "Setu", "ZP", etc.),
 *      temples, tourist_places,
 *      midc, industries, industries_top,
 *      rivers
 *  - onFocus: ({lat, lng}) => void
 */
export default function NearbyList({ c = {}, onFocus }) {
  // Normalize everything to arrays
  const markets = asArray(c.markets);
  const malls = asArray(c.malls);

  const busMain = asArray(c.bus_main);
  const busNear = asArray(c.bus_near);
  const rail = asArray(c.rail_stations);

  const govHospital = asArray(c.gov_hospital);
  const hospitals5 = asArray(c.hospitals_top5?.length ? c.hospitals_top5 : c.hospitals);
  const nearestSchool = asArray(c.nearest_school);
  const schools5 = asArray(c.schools_top5?.length ? c.schools_top5 : c.schools);

  const colleges = asArray(c.colleges);
  const institutes = asArray(c.institutes);

  const govtOffices = asArray(c.govt_offices); // items: {name, lat, lng, distance_m}

  const temples = asArray(c.temples); // include Mahakali Temple entry if available
  const tourist = asArray(c.tourist_places); // include Tadoba, etc.

  const midc = asArray(c.midc);
  const industries = asArray(c.industries_top?.length ? c.industries_top : c.industries);

  const rivers = asArray(c.rivers);

  return (
    <div className="border border-slate-700">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2">Nearby</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        {/* Market / Shopping */}
        <Group title="Main Markets" items={markets} onFocus={onFocus} />
        <Group title="Malls / Supermarkets" items={malls} onFocus={onFocus} />

        {/* Transport */}
        <Group title="Main Bus Stand(s)" items={busMain} onFocus={onFocus} />
        <Group title="Nearest Bus Stop(s)" items={busNear} onFocus={onFocus} />
        <Group title="Railway Stations" items={rail} onFocus={onFocus} />

        {/* Healthcare */}
        <Group title="Government Hospital" items={govHospital} onFocus={onFocus} />
        <Group title="Top 5 Hospitals" items={hospitals5} onFocus={onFocus} limit={5} />

        {/* Education */}
        <Group title="Nearest School" items={nearestSchool} onFocus={onFocus} />
        <Group title="Top 5 Schools" items={schools5} onFocus={onFocus} limit={5} />
        <Group title="Colleges" items={colleges} onFocus={onFocus} />
        <Group title="Educational Institutes" items={institutes} onFocus={onFocus} />

        {/* Government Offices */}
        <Group title="Government Offices (MC, Court, Setu, ZP)" items={govtOffices} onFocus={onFocus} />

        {/* Culture & Tourist */}
        <Group title="Temples" items={temples} onFocus={onFocus} />
        <Group title="Tourist Places" items={tourist} onFocus={onFocus} />

        {/* Industries / Rivers */}
        <Group title="MIDC / Industrial Areas" items={midc} onFocus={onFocus} />
        <Group title="Nearest Industries" items={industries} onFocus={onFocus} />
        <Group title="Rivers (nearby)" items={rivers} onFocus={onFocus} />
      </div>
    </div>
  );
}
