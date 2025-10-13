// src/services/nearby.js
import POI from "../models/POI.js";
import { drivingRoute } from "./routing.js"; // ← NEW: enrich with route distance/time

/** Units & helpers */
const KM = 1000;
const within = (v, def) => (Number.isFinite(v) ? v : def);
const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Default radii (m) */
const RADIUS = {
  HIGHWAY: 12 * KM,
  ROAD_MAJOR: 8 * KM,
  VILLAGE: 6 * KM,
  TALUKA_HQ: 40 * KM,
  DISTRICT_HQ: 80 * KM,

  SCHOOL: 8 * KM,
  COLLEGE: 20 * KM,
  INSTITUTE: 15 * KM,

  HOSPITAL: 12 * KM,
  HOSPITAL_GOVT: 20 * KM,

  INDUSTRY: 20 * KM,
  MIDC: 40 * KM,

  MARKET: 12 * KM,
  MALL: 25 * KM,

  RIVER: 8 * KM,

  RAIL_STATION: 25 * KM,
  BUS_STAND: 25 * KM,
  BUS_STOP: 6 * KM,
};

/** Normalize aggregation row → compact object (keeps coords) */
function entry(row) {
  return {
    id: row._id?.toString(),
    name: row.name,
    poiType: row.poiType,
    subType: row.subType || null,
    distance_m: Math.round(row.dist_m ?? row.distance_m ?? 0),
    lng: row.location?.coordinates?.[0] ?? null,
    lat: row.location?.coordinates?.[1] ?? null,
  };
}

/** $geoNear with explicit geo index */
async function geoNear({ type, lng, lat, maxDistance, limit = 1, query = {} }) {
  const pipeline = [
    {
      $geoNear: {
        key: "location",
        near: { type: "Point", coordinates: [lng, lat] },
        spherical: true,
        distanceField: "dist_m",
        maxDistance: within(maxDistance, 10 * KM),
        query: { poiType: type, ...(query || {}) },
      },
    },
    { $limit: limit },
  ];
  return POI.aggregate(pipeline);
}

/** Enrich a single POI with route distance/time (fallback to geodesic if router not available) */
async function withRouteFrom(coords, item) {
  if (!item || item.lat == null || item.lng == null) return item;
  const [lng0, lat0] = coords;
  try {
    const route = await drivingRoute(lng0, lat0, item.lng, item.lat);
    if (route?.distance_m != null) item.route_distance_m = route.distance_m;
    if (route?.duration_s != null) item.route_duration_s = route.duration_s;
  } catch {
    // ignore routing errors; keep geodesic
  }
  return item;
}

async function nearestOne(type, coords, maxDistance, query) {
  const [lng, lat] = coords;
  const rows = await geoNear({ type, lng, lat, maxDistance, limit: 1, query });
  const obj = rows[0] ? entry(rows[0]) : null;
  return obj ? await withRouteFrom(coords, obj) : null;
}

async function nearestMany(type, coords, maxDistance, limit = 5, query) {
  const [lng, lat] = coords;
  const rows = await geoNear({ type, lng, lat, maxDistance, limit, query });
  const items = await Promise.all(rows.map((r) => withRouteFrom(coords, entry(r))));
  // Prefer route distance when present; otherwise geodesic distance
  items.sort((a, b) => {
    const da = a?.route_distance_m ?? a?.distance_m ?? Infinity;
    const db = b?.route_distance_m ?? b?.distance_m ?? Infinity;
    return da - db;
  });
  return items;
}

/** Preferred query then fallback */
async function nearestOnePrefer(type, coords, maxDistance, preferredQuery) {
  if (preferredQuery && Object.keys(preferredQuery).length) {
    const hit = await nearestOne(type, coords, maxDistance, preferredQuery);
    if (hit) return hit;
  }
  return nearestOne(type, coords, maxDistance);
}

/** Road-touch */
function computeRoadTouch({ highway, majorRoad }) {
  const TOUCH_HWY_M = 30;
  const TOUCH_MAJOR_M = 15;
  const h = highway?.distance_m ?? Infinity;
  const r = majorRoad?.distance_m ?? Infinity;
  return h <= TOUCH_HWY_M || r <= TOUCH_MAJOR_M;
}

/** Recompute nearby info and attach to doc.computed */
export async function recomputeForProperty(doc) {
  if (!doc?.geo?.coordinates || doc.geo.coordinates.length !== 2) return doc;

  const coords = doc.geo.coordinates; // [lng, lat]
  const [lng, lat] = coords;

  // Preferences based on admin fields
  const district = doc.location_admin?.district || null;
  const taluka = doc.location_admin?.taluka || null;
  const village = doc.location_admin?.village || null;

  const prefVillageQ =
    village ? { name: { $regex: esc(village), $options: "i" }, ...(district && { district }) } : district ? { district } : null;
  const prefTalukaQ = {
    ...(district && { district }),
    ...(taluka && { name: { $regex: esc(taluka), $options: "i" } }),
  };
  const prefDistrictHQ = district
    ? { $or: [{ district }, { name: { $regex: esc(district), $options: "i" } }] }
    : null;

  const [
    nearestHighway,
    nearestMajorRoad,
    nearestVillage,
    nearestTalukaHQ,
    nearestDistrictHQ,

    schoolsTop5,
    nearestSchool,
    hospitalsTop5,
    govHospitals,

    industriesTop5,
    midcAreas,

    markets,
    malls,

    rivers,

    railStations,
    busStands,
    busStops,

    colleges,
    institutes,

    govtOffices,
    temples,
    touristPlaces,
  ] = await Promise.all([
    nearestOne("HIGHWAY", coords, RADIUS.HIGHWAY),
    nearestOne("ROAD_MAJOR", coords, RADIUS.ROAD_MAJOR),

    nearestOnePrefer("VILLAGE", coords, RADIUS.VILLAGE, prefVillageQ),
    nearestOnePrefer("TALUKA_HQ", coords, RADIUS.TALUKA_HQ, prefTalukaQ),
    nearestOnePrefer("DISTRICT_HQ", coords, RADIUS.DISTRICT_HQ, prefDistrictHQ),

    nearestMany("SCHOOL", coords, RADIUS.SCHOOL, 5),
    nearestOne("SCHOOL", coords, RADIUS.SCHOOL),

    nearestMany("HOSPITAL", coords, RADIUS.HOSPITAL, 5),
    nearestMany("HOSPITAL_GOVT", coords, RADIUS.HOSPITAL_GOVT, 3),

    nearestMany("INDUSTRY", coords, RADIUS.INDUSTRY, 5),
    nearestMany("MIDC", coords, RADIUS.MIDC, 3),

    nearestMany("MARKET", coords, RADIUS.MARKET, 3),
    nearestMany("MALL", coords, RADIUS.MALL, 3),

    nearestMany("RIVER", coords, RADIUS.RIVER, 2),

    nearestMany("RAIL_STATION", coords, RADIUS.RAIL_STATION, 3),
    nearestMany("BUS_STAND", coords, RADIUS.BUS_STAND, 2),
    nearestMany("BUS_STOP", coords, RADIUS.BUS_STOP, 3),

    nearestMany("COLLEGE", coords, RADIUS.COLLEGE, 5),
    nearestMany("INSTITUTE", coords, RADIUS.INSTITUTE, 5),

    nearestMany("GOVT_OFFICE", coords, RADIUS.DISTRICT_HQ, 8),
    nearestMany("TEMPLE", coords, 30 * KM, 5),
    nearestMany("TOURIST_PLACE", coords, 80 * KM, 5),
  ]);

  const computed = {
    // legacy keys (keep for backward compatibility)
    nearestHighway,
    nearestMajorRoad,
    nearestVillage,
    nearestTalukaHQ,
    nearestDistrictHQ,
    schools: schoolsTop5,
    hospitals: hospitalsTop5,
    industries: industriesTop5,
    market: markets?.[0] || null,
    rivers,
    transport: {
      rail: railStations?.[0] || null,
      bus: busStands?.[0] || null,
    },
    center: { lng, lat },

    // richer keys for UI
    markets,
    malls,

    rail_stations: railStations,
    bus_main: busStands,
    bus_near: busStops,

    gov_hospital: govHospitals,
    hospitals_top5: hospitalsTop5,

    nearest_school: nearestSchool ? [nearestSchool] : [],
    schools_top5: schoolsTop5,

    colleges,
    institutes,

    govt_offices: govtOffices,

    temples,
    tourist_places: touristPlaces,

    midc: midcAreas,
    industries_top: industriesTop5,
  };

  computed.roadTouch = computeRoadTouch({
    highway: nearestHighway,
    majorRoad: nearestMajorRoad,
  });

  doc.computed = computed;
  return doc;
}

export { RADIUS };
