// web/src/pages/PropertyDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import MapView from "../components/MapView";
import { toast } from "../components/useToast.js";

import KPIHeader from "../components/property/KPIHeader";
import ToggleChips from "../components/property/ToggleChips";
import NarrativeCard from "../components/property/NarrativeCard";
import InsightsCard from "../components/property/InsightsCard";

/* -------------------- small helpers -------------------- */
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const km = (m) => (m == null ? "—" : `${Number((m / 1000).toFixed(2))} km`);
const cls = (...xs) => xs.filter(Boolean).join(" ");
const canEdit = (role) => role === "EDITOR" || role === "ADMIN";

/* -------------------- Distance pill -------------------- */
function DistancePill({ m }) {
  if (m == null) return <span className="text-[11px] text-slate-400">—</span>;
  const kmVal = m / 1000;
  const tone =
    kmVal <= 2
      ? "bg-emerald-700/40 border-emerald-600 text-emerald-200"
      : kmVal <= 5
      ? "bg-amber-700/40 border-amber-600 text-amber-200"
      : "bg-rose-700/40 border-rose-600 text-rose-200";
  return <span className={cls("text-[11px] px-1.5 py-0.5 rounded border", tone)}>{km(m)}</span>;
}

/* -------------------- Tabbed Nearby -------------------- */
function TabbedNearby({ c = {}, onFocus }) {
  const data = {
    Schools: (asArray(c.nearest_school).concat(asArray(c.schools_top5).filter(Boolean))).slice(0, 5),
    Hospitals: (asArray(c.gov_hospital).concat(asArray(c.hospitals_top5).filter(Boolean))).slice(0, 5),
    Markets: (asArray(c.market).concat(asArray(c.markets)).filter(Boolean)).slice(0, 5),
    Malls: asArray(c.malls).slice(0, 5),
    "Govt Offices": asArray(c.govt_offices).slice(0, 6),
    Industries: (asArray(c.midc).concat(asArray(c.industries_top || c.industries))).slice(0, 5),
    Transport: (asArray(c.rail_stations).concat(asArray(c.bus_main), asArray(c.bus_near))).slice(0, 8),
    Temples: asArray(c.temples).slice(0, 6),
    Tourist: asArray(c.tourist_places).slice(0, 6),
    Rivers: asArray(c.rivers).slice(0, 4),
  };

  const tabs = Object.keys(data);
  const [tab, setTab] = useState(tabs[0] || "Schools");
  const list = data[tab] || [];

  return (
    <div className="border border-slate-700 rounded overflow-hidden">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2">Nearby</div>

      <div className="flex flex-wrap gap-2 px-3 pt-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cls(
              "text-xs px-2 py-1 rounded border",
              tab === t ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-3">
        {list.length === 0 ? (
          <div className="text-slate-400 text-sm">No data</div>
        ) : (
          <ul className="space-y-2">
            {list.map((x, i) => {
              const canFocus = x?.lat != null && x?.lng != null;
              const gmaps =
                x?.lat != null && x?.lng != null
                  ? `https://www.google.com/maps?q=${x.lat},${x.lng}`
                  : x?.place_id
                  ? `https://www.google.com/maps/place/?q=place_id:${x.place_id}`
                  : x?.gmaps_url;
              return (
                <li key={(x?.id || x?.name || "poi") + i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-slate-400 shrink-0 w-5">{i + 1}.</span>
                    {canFocus ? (
                      <button
                        onClick={() => onFocus?.({ lat: x.lat, lng: x.lng })}
                        className="text-left hover:underline text-slate-100 truncate"
                        title={x?.name}
                      >
                        {x?.name || "—"}
                      </button>
                    ) : (
                      <span className="text-left text-slate-100 truncate" title={x?.name}>
                        {x?.name || "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DistancePill m={x?.route_distance_m ?? x?.distance_m} />
                    {gmaps && (
                      <a
                        href={gmaps}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-100"
                        title="Open in Google Maps"
                      >
                        Maps
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ======================================================= */

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recomputing, setRecomputing] = useState(false);

  // role (PUBLIC by default)
  const [role, setRole] = useState("PUBLIC");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const me = await res.json();
          if (!cancelled) setRole(me?.role || "PUBLIC");
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // edit modal
  const [editing, setEditing] = useState(false);
  const [lngEd, setLngEd] = useState("");
  const [latEd, setLatEd] = useState("");
  const [savingGeo, setSavingGeo] = useState(false);
  const [errGeo, setErrGeo] = useState("");

  // benefit/narrative
  const [benefitState, setBenefitState] = useState({ loading: false, error: "", text: "" });

  // POI toggles
  const [poiTypes, setPoiTypes] = useState({
    HIGHWAY: true,
    ROAD: true,
    MARKET: true,
    MALL: true,
    RAIL: true,
    BUS: true,
    SCHOOL: true,
    HOSPITAL: true,
    INDUSTRY: true,
    GOVT: true,
    TEMPLE: true,
    TOURIST: true,
    RIVER: false,
  });
  const toggleType = (k) => setPoiTypes((s) => ({ ...s, [k]: !s[k] }));

  // basemap + unit
  const [tile, setTile] = useState("osm");
  const [unit, setUnit] = useState(localStorage.getItem("areaUnit") || "ac");
  const [mapCenter, setMapCenter] = useState(null);

  const isPublic = role === "PUBLIC";
  // Correct base path for the resource
  const base = `${API_BASE}/${isPublic ? "public/properties" : "properties"}`;

  /* ------------------ FETCH PROPERTY ------------------ */
  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      let res = await fetch(`${base}/${id}`, isPublic ? {} : { credentials: "include" });

      // fallback if private returns 401 → downgrade to public
      if (!isPublic && res.status === 401) {
        setRole("PUBLIC");
        res = await fetch(`${API_BASE}/public/properties/${id}`);
      }

      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setDoc(d);
      if (Array.isArray(d?.geo?.coordinates) && d.geo.coordinates.length === 2) {
        setMapCenter([d.geo.coordinates[1], d.geo.coordinates[0]]);
      }
    } catch (e) {
      const msg = typeof e === "string" ? e : e?.message || "Failed to load";
      setErrorMsg(msg);
      toast("Failed to load property");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id, role]);

  /* ------------------ BENEFIT TEXT ------------------ */
  async function loadBenefit() {
    setBenefitState({ loading: true, error: "", text: "" });
    try {
      let res = await fetch(`${base}/${id}/benefit`, isPublic ? {} : { credentials: "include" });

      if (!isPublic && res.status === 401) {
        setRole("PUBLIC");
        res = await fetch(`${API_BASE}/public/properties/${id}/benefit`);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      setBenefitState({ loading: false, error: "", text: data?.benefit || "(no data)" });
    } catch (e) {
      setBenefitState({ loading: false, error: String(e.message || e), text: "" });
    }
  }
  useEffect(() => {
    if (doc) loadBenefit();
  }, [doc, role]);

  /* ------------------ RECOMPUTE (private only) ------------------ */
  async function recompute() {
    if (!doc?.geo?.coordinates || isPublic) return;
    setRecomputing(true);
    try {
      const res = await fetch(`${API_BASE}/properties/${id}/recompute`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Recomputed ✓");
      await load();
      await loadBenefit();
    } catch (e) {
      toast("Recompute failed");
      console.error(e);
    } finally {
      setRecomputing(false);
    }
  }

  const coords = useMemo(() => {
    if (Array.isArray(doc?.geo?.coordinates) && doc.geo.coordinates.length === 2) {
      return { lng: doc.geo.coordinates[0], lat: doc.geo.coordinates[1] };
    }
    return null;
  }, [doc]);

  // area text with persistent toggle
  const areaAc = doc?.parcel?.area?.acres;
  const areaHa = areaAc != null ? areaAc * 0.40468564224 : null;
  const areaText =
    unit === "ac"
      ? typeof areaAc === "number"
        ? `${areaAc.toFixed(3)} acres`
        : "-"
      : typeof areaHa === "number"
      ? `${areaHa.toFixed(3)} ha`
      : "-";

  function copyShare() {
    navigator.clipboard.writeText(window.location.href);
    toast("Link copied");
  }
  function openGMaps() {
    if (!coords) return;
    window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, "_blank");
  }
  function toggleUnits() {
    const next = unit === "ac" ? "ha" : "ac";
    setUnit(next);
    localStorage.setItem("areaUnit", next);
  }

  // markers
  const markers = useMemo(() => {
    const m = [];
    if (!doc) return m;
    if (coords) m.push({ lat: coords.lat, lng: coords.lng, label: "Property", type: "PROPERTY" });
    const c = doc.computed || {};
    const pushIf = (x, type, label) => {
      if (x?.lat != null && x?.lng != null) m.push({ lat: x.lat, lng: x.lng, label: `${label}: ${x.name}`, type });
    };
    // Roads
    pushIf(c.nearestHighway, "HIGHWAY", "Highway");
    pushIf(c.nearestMajorRoad, "ROAD", "Road");
    // Markets & Malls
    asArray(c.market).forEach((x) => pushIf(x, "MARKET", "Market"));
    asArray(c.markets).forEach((x) => pushIf(x, "MARKET", "Market"));
    asArray(c.malls).forEach((x) => pushIf(x, "MALL", "Mall"));
    // Transport
    pushIf(c.transport?.rail, "RAIL", "Rail");
    pushIf(c.transport?.bus, "BUS", "Bus");
    asArray(c.rail_stations).forEach((x) => pushIf(x, "RAIL", "Railway"));
    asArray(c.bus_main).forEach((x) => pushIf(x, "BUS", "Bus Stand"));
    asArray(c.bus_near).forEach((x) => pushIf(x, "BUS", "Bus Stop"));
    // Healthcare
    asArray(c.gov_hospital).forEach((x) => pushIf(x, "HOSPITAL", "Govt Hospital"));
    (asArray(c.hospitals_top5).length ? asArray(c.hospitals_top5) : asArray(c.hospitals))
      .slice(0, 5)
      .forEach((x) => pushIf(x, "HOSPITAL", "Hospital"));
    // Education
    asArray(c.nearest_school).forEach((x) => pushIf(x, "SCHOOL", "Nearest School"));
    (asArray(c.schools_top5).length ? asArray(c.schools_top5) : asArray(c.schools))
      .slice(0, 5)
      .forEach((x) => pushIf(x, "SCHOOL", "School"));
    asArray(c.colleges).forEach((x) => pushIf(x, "SCHOOL", "College"));
    asArray(c.institutes).forEach((x) => pushIf(x, "SCHOOL", "Institute"));
    // Govt offices
    asArray(c.govt_offices).forEach((x) => pushIf(x, "GOVT", "Govt Office"));
    // Temples / Tourist
    asArray(c.temples).forEach((x) => pushIf(x, "TEMPLE", "Temple"));
    asArray(c.tourist_places).forEach((x) => pushIf(x, "TOURIST", "Tourist Place"));
    // Industries / MIDC
    asArray(c.midc).forEach((x) => pushIf(x, "INDUSTRY", "MIDC"));
    (asArray(c.industries_top).length ? asArray(c.industries_top) : asArray(c.industries))
      .slice(0, 5)
      .forEach((x) => pushIf(x, "INDUSTRY", "Industry"));
    // Rivers
    asArray(c.rivers).slice(0, 3).forEach((r) => pushIf(r, "RIVER", "River"));
    return m;
  }, [doc, coords]);

  const filteredMarkers = useMemo(
    () => markers.filter((m) => m.type === "PROPERTY" || poiTypes[m.type]),
    [markers, poiTypes]
  );

  const circles = useMemo(() => {
    const out = [];
    if (!coords) return out;
    const c = doc?.computed || {};
    if (c.nearestHighway?.distance_m != null)
      out.push({ lat: coords.lat, lng: coords.lng, radius: c.nearestHighway.distance_m, color: "#f59e0b" });
    if (c.nearestMajorRoad?.distance_m != null)
      out.push({ lat: coords.lat, lng: coords.lng, radius: c.nearestMajorRoad.distance_m, color: "#22c55e" });
    return out;
  }, [doc, coords]);

  // if failed
  if (!loading && errorMsg && !doc) {
    return (
      <div className="p-4">
        <div className="text-rose-300 mb-2">Failed to load property.</div>
        <pre className="text-xs text-slate-400 whitespace-pre-wrap">{errorMsg}</pre>
        <button className="mt-3 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (loading || !doc) return <div className="text-slate-300">Loading…</div>;

  const title = [doc.parcel?.survey_gat_no || "-", doc.parcel?.ulpin ? `• ${doc.parcel.ulpin}` : ""].join(" ");
  const c = doc?.computed || {};
  const hospitalsCount = (c.hospitals || c.hospitals_top5 || []).filter(Boolean).length;
  const schoolsCount = (c.schools || c.schools_top5 || []).filter(Boolean).length;
  const marketNear = !!(c.market || (c.markets && c.markets.length));

  function focusOn({ lat, lng }) {
    setMapCenter([lat, lng]);
    setTimeout(() => {
      if (coords) setMapCenter([coords.lat, coords.lng]);
    }, 1800);
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  function validCoords(lngV, latV) {
    const L1 = Number(lngV),
      L2 = Number(latV);
    return Number.isFinite(L1) && Number.isFinite(L2) && L1 >= -180 && L1 <= 180 && L2 >= -90 && L2 <= 90;
  }

  async function saveCoords(recompute = true) {
    if (!validCoords(lngEd, latEd)) {
      setErrGeo("Enter valid [lng, lat]");
      return;
    }
    setSavingGeo(true);
    setErrGeo("");
    try {
      const body = { geo: { type: "Point", coordinates: [Number(lngEd), Number(latEd)], geo_source: "property-detail-edit" } };
      const res = await fetch(`${API_BASE}/properties/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      let updated = await res.json();

      if (recompute) {
        const rec = await fetch(`${API_BASE}/properties/${id}/recompute`, { method: "POST", credentials: "include" });
        if (rec.ok) updated = await rec.json();
      }

      toast("Saved ✓");
      setEditing(false);
      setDoc(updated);
      if (updated?.geo?.coordinates?.length === 2) {
        setMapCenter([updated.geo.coordinates[1], updated.geo.coordinates[0]]);
      }
      await loadBenefit();
    } catch (e) {
      setErrGeo(String(e.message || e));
    } finally {
      setSavingGeo(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Title + Edit Coords */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {canEdit(role) && (
          <button
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm"
            onClick={() => {
              setLngEd(doc?.geo?.coordinates?.[0] ?? "");
              setLatEd(doc?.geo?.coordinates?.[1] ?? "");
              setEditing(true);
            }}
          >
            Edit Coords
          </button>
        )}
      </div>

      {/* KPIs and actions */}
      <KPIHeader
        areaText={areaText}
        landUse={doc?.use_and_crop?.land_use}
        roadTouch={!!c.roadTouch}
        hospitalsCount={hospitalsCount}
        schoolsCount={schoolsCount}
        marketNear={marketNear}
        onToggleUnits={toggleUnits}
        unitLabel={unit === "ac" ? "ha" : "acres"}
        onCopyLink={copyShare}
        onOpenGMaps={openGMaps}
        onRecompute={canEdit(role) && !recomputing ? recompute : undefined}
        recomputing={recomputing}
        brochureHref={`${API_BASE}/${isPublic ? "public/properties" : "properties"}/${doc._id}/brochure.pdf`}
        hasCoords={!!coords}
        onBack={() => navigate(-1)}
      />

      {/* Toggles */}
      <ToggleChips state={poiTypes} onToggle={toggleType} />

      <div className="grid grid-cols-12 gap-4">
        {/* Map column */}
        <div className="col-span-12 lg:col-span-7">
          {/* Basemap switch */}
          <div className="mb-2 text-xs flex items-center gap-2">
            <span className="text-slate-400">Basemap:</span>
            {["osm", "carto-light", "carto-dark"].map((t) => (
              <button
                key={t}
                onClick={() => setTile(t)}
                className={`px-2 py-1 rounded border ${tile === t ? "bg-slate-700 border-slate-600" : "bg-slate-800 border-slate-700"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="rounded overflow-hidden border border-slate-700">
            <MapView
              center={mapCenter || (coords ? [coords.lat, coords.lng] : [19.95, 79.3])}
              zoom={13}
              markers={filteredMarkers}
              circles={circles}
              tile={tile}
            />
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
            <span>* Circles show distance to nearest highway/major road.</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#f59e0b" }}></span> Highway
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#22c55e" }}></span> Major road
            </span>
          </div>

          {/* Insights under the map */}
          <InsightsCard c={c} areaText={areaText} landUse={doc?.use_and_crop?.land_use || "-"} onReload={loadBenefit} />
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          {/* Property basics */}
          <div className="border border-slate-700 rounded overflow-hidden">
            <div className="bg-slate-800 text-slate-100 font-semibold p-2">Property Basics</div>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">ULPIN</div>
                <div className="text-sm">{doc?.parcel?.ulpin || "—"}</div>
              </div>
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">Survey / Gat</div>
                <div className="text-sm">{doc?.parcel?.survey_gat_no || "—"}</div>
              </div>
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">Mouza</div>
                <div className="text-sm">{doc?.location_admin?.village || "—"}</div>
              </div>
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">Taluka</div>
                <div className="text-sm">{doc?.location_admin?.taluka || "—"}</div>
              </div>
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">District</div>
                <div className="text-sm">{doc?.location_admin?.district || "—"}</div>
              </div>
              <div className="p-2 rounded border border-slate-700 bg-slate-800/40">
                <div className="text-[11px] text-slate-400 mb-1">Land Use</div>
                <div className="text-sm">{doc?.use_and_crop?.land_use || "—"}</div>
              </div>
            </div>
          </div>

          {/* Tabbed Nearby */}
          <TabbedNearby c={c} onFocus={focusOn} />

          {/* Narrative */}
          <NarrativeCard text={benefitState.text} onReload={loadBenefit} />
          {benefitState.error && (
            <div className="p-2 bg-rose-900/30 border border-rose-700 text-rose-200 rounded text-xs">
              Failed to load: {benefitState.error}
            </div>
          )}
        </div>
      </div>

      {/* ✴️ Edit Coordinates Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[420px] bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="text-lg font-semibold mb-2">Edit Coordinates</div>
            <div className="text-slate-400 text-xs mb-3">Use [lng, lat]. Example: 79.295943, 19.947035</div>

            <label className="text-sm text-slate-400">Longitude (lng)</label>
            <input
              className="w-full p-2 rounded bg-slate-800 mb-2"
              value={lngEd}
              onChange={(e) => setLngEd(e.target.value)}
              type="number"
              step="0.000001"
              placeholder="79.295943"
            />

            <label className="text-sm text-slate-400">Latitude (lat)</label>
            <input
              className="w-full p-2 rounded bg-slate-800 mb-3"
              value={latEd}
              onChange={(e) => setLatEd(e.target.value)}
              type="number"
              step="0.000001"
              placeholder="19.947035"
            />

            {errGeo && <div className="text-rose-400 text-xs mb-2">{errGeo}</div>}

            <div className="flex gap-2 justify-end">
              <button className="px-3 py-2 rounded bg-slate-700" onClick={() => setEditing(false)} disabled={savingGeo}>
                Cancel
              </button>
              <button className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500" onClick={() => saveCoords(false)} disabled={savingGeo}>
                {savingGeo ? "Saving…" : "Save"}
              </button>
              <button className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => saveCoords(true)} disabled={savingGeo}>
                {savingGeo ? "Saving…" : "Save + Recompute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
