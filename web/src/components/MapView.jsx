// web/src/components/MapView.jsx
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

// Default Leaflet marker for the property
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Emoji/colored div marker for POIs
function emojiIcon(emoji = "📍", bg = "#0ea5e9") {
  const html = `
    <div style="
      background:${bg};
      color:#fff;
      width:28px;height:28px;border-radius:14px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 1px 6px rgba(0,0,0,.35);
      border:2px solid rgba(255,255,255,.8)
    ">${emoji}</div>`;
  return L.divIcon({ html, className: "", iconSize: [28, 28], iconAnchor: [14, 14] });
}

function iconFor(typeOrLabel = "") {
  const t = String(typeOrLabel).toUpperCase();
  if (t.includes("HIGHWAY")) return emojiIcon("🛣", "#f59e0b");
  if (t.includes("ROAD")) return emojiIcon("🛤", "#22c55e");
  if (t.includes("HOSPITAL")) return emojiIcon("🏥", "#ef4444");
  if (t.includes("SCHOOL")) return emojiIcon("🏫", "#60a5fa");
  if (t.includes("INDUSTRY")) return emojiIcon("🏭", "#475569");
  if (t.includes("MARKET")) return emojiIcon("🛒", "#10b981");
  if (t.includes("RAIL")) return emojiIcon("🚉", "#8b5cf6");
  if (t.includes("BUS")) return emojiIcon("🚌", "#f59e0b");
  if (t.includes("RIVER")) return emojiIcon("🌊", "#38bdf8");
  return emojiIcon("📍", "#0ea5e9");
}

// Make Leaflet recalc size after layout
function MapFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

// Fit bounds to markers whenever they change
function Fit({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers || !markers.length) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng])).pad(0.2);
    map.fitBounds(bounds);
  }, [markers, map]);
  return null;
}

/**
 * props:
 *  - center: [lat, lng]
 *  - zoom: number
 *  - markers: [{lat, lng, label, type}]
 *  - circles: [{lat, lng, radius, color}]
 *  - tile: "osm" | "carto-light" | "carto-dark"
 */
export default function MapView({
  center = [19.95, 79.3],
  zoom = 12,
  markers = [],
  circles = [],
  tile = "osm",
}) {
  const tileUrl =
    tile === "carto-light"
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : tile === "carto-dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution =
    tile.startsWith("carto") ? "&copy; OpenStreetMap &copy; CARTO" : "&copy; OpenStreetMap";

  const useFit = markers && markers.length > 0;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: 460, width: "100%" }} scrollWheelZoom>
      <TileLayer attribution={attribution} url={tileUrl} />
      <MapFix />
      {useFit && <Fit markers={markers} />}

      {markers.map((m, i) => {
        const isProperty = (m.type || "").toUpperCase() === "PROPERTY" || m.label === "Property";
        const icon = isProperty ? defaultIcon : iconFor(m.type || m.label || "");
        return (
          <Marker key={i} position={[m.lat, m.lng]} icon={icon}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        );
      })}

      {circles.map((c, i) => (
        <Circle
          key={i}
          center={[c.lat, c.lng]}
          radius={c.radius}
          pathOptions={{ color: c.color || "#38bdf8" }}
        />
      ))}
    </MapContainer>
  );
}
