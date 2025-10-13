// src/services/benefit.js

/**
 * Helpers to format values
 */
const fmt = {
  m(n) {
    if (n == null) return null;
    const v = Math.round(Number(n));
    return `${v} m`;
  },
  km(n) {
    if (n == null) return null;
    const v = (Number(n) / 1000).toFixed(1);
    return `${v} km`;
  },
  list(items = [], max = 2) {
    return items.slice(0, max).map((x) => x.name).join(", ");
  },
};

/**
 * Build a human-readable Benefit Card text from a Property document.
 * Expects `doc.computed` to be populated (call /recompute first).
 */
export function buildBenefitCard(doc, opts = {}) {
  const c = doc?.computed || {};
  const parts = [];

  // Title line from parcel info (optional)
  if (doc?.parcel?.survey_gat_no || doc?.parcel?.ulpin) {
    const title = [
      doc?.parcel?.survey_gat_no ? `Gat ${doc.parcel.survey_gat_no}` : null,
      doc?.parcel?.ulpin ? `ULPIN ${doc.parcel.ulpin}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
    if (title) parts.push(title);
  }

  // Road touch / highway
  if (c.roadTouch) {
    if (c.nearestHighway?.name) {
      parts.push(
        `Highway touch – ${c.nearestHighway.name} (${fmt.m(c.nearestHighway.distance_m)})`
      );
    } else if (c.nearestMajorRoad?.name) {
      parts.push(
        `Road touch – ${c.nearestMajorRoad.name} (${fmt.m(c.nearestMajorRoad.distance_m)})`
      );
    } else {
      parts.push("Road touch");
    }
  } else if (c.nearestHighway?.name) {
    parts.push(
      `Nearest highway: ${c.nearestHighway.name} (${fmt.m(c.nearestHighway.distance_m)})`
    );
  }

  // Admin location line
  {
    const loc = doc?.location_admin || {};
    const locStr = [loc.village, loc.taluka, loc.district].filter(Boolean).join(", ");
    if (locStr) parts.push(locStr);
  }

  // Villages / HQs
  if (c.nearestVillage?.name) {
    parts.push(`Nearest village: ${c.nearestVillage.name} (${fmt.km(c.nearestVillage.distance_m)})`);
  }
  if (c.nearestTalukaHQ?.name) {
    parts.push(
      `Taluka HQ: ${c.nearestTalukaHQ.name} (${fmt.km(c.nearestTalukaHQ.distance_m)})`
    );
  }
  if (c.nearestDistrictHQ?.name) {
    parts.push(
      `District HQ: ${c.nearestDistrictHQ.name} (${fmt.km(c.nearestDistrictHQ.distance_m)})`
    );
  }

  // Amenities counts / samples
  if (Array.isArray(c.schools) && c.schools.length > 0) {
    parts.push(
      `${c.schools.length} school${c.schools.length > 1 ? "s" : ""} nearby` +
        (opts.showNames ? ` — ${fmt.list(c.schools, 3)}` : "")
    );
  }
  if (Array.isArray(c.hospitals) && c.hospitals.length > 0) {
    parts.push(
      `${c.hospitals.length} hospital${c.hospitals.length > 1 ? "s" : ""} nearby` +
        (opts.showNames ? ` — ${fmt.list(c.hospitals, 3)}` : "")
    );
  }
  if (Array.isArray(c.industries) && c.industries.length > 0) {
    parts.push(
      `Industries: ${fmt.list(c.industries, 2)}` +
        (c.industries.length > 2 ? ` +${c.industries.length - 2} more` : "")
    );
  }

  // Market / river / transport
  if (c.market?.name) {
    parts.push(`Market: ${c.market.name} (${fmt.km(c.market.distance_m)})`);
  }
  if (Array.isArray(c.rivers) && c.rivers[0]?.name) {
    const r = c.rivers[0];
    parts.push(`River: ${r.name} (${fmt.m(r.distance_m)})`);
  }
  if (c.transport?.rail?.name) {
    parts.push(`Rail: ${c.transport.rail.name} (${fmt.km(c.transport.rail.distance_m)})`);
  }
  if (c.transport?.bus?.name) {
    parts.push(`Bus stand: ${c.transport.bus.name} (${fmt.km(c.transport.bus.distance_m)})`);
  }

  // Area & land use (optional)
  if (doc?.parcel?.area?.acres) {
    parts.push(`${doc.parcel.area.acres.toFixed(2)} acres • ${doc.use_and_crop?.land_use || "Land"}`);
  }

  // Join nicely
  const text = parts.filter(Boolean).join(" | ");
  return text || "Benefit details will appear after computing nearby points.";
}
