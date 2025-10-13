// No import of 'node-fetch' needed on Node 18+

const OSRM_URL = process.env.OSRM_URL || "";
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || "";

/** Small helper to add a timeout to fetch */
async function fetchWithTimeout(url, { timeout = 8000, ...opts } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Get driving route (meters + seconds) between two [lng, lat] points.
 * Returns: { distance_m, duration_s } or null on failure.
 */
export async function drivingRoute(lng1, lat1, lng2, lat2) {
  try {
    if (OSRM_URL) {
      const url = `${OSRM_URL}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false&alternatives=false&annotations=duration,distance`;
      const res = await fetchWithTimeout(url, { timeout: 8000 });
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) return null;
      return { distance_m: Math.round(route.distance || 0), duration_s: Math.round(route.duration || 0) };
    }

    if (MAPBOX_TOKEN) {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng1},${lat1};${lng2},${lat2}?overview=false&alternatives=false&annotations=duration,distance&access_token=${MAPBOX_TOKEN}`;
      const res = await fetchWithTimeout(url, { timeout: 8000 });
      if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) return null;
      return { distance_m: Math.round(route.distance || 0), duration_s: Math.round(route.duration || 0) };
    }

    return null; // no provider configured
  } catch {
    return null; // silent fallback → geodesic
  }
}
