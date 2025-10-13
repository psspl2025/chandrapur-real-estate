// web/src/pages/PublicProperty.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../config";
import MapView from "../components/MapView";

export default function PublicProperty() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/properties/${token}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json.property);
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, [token]);

  if (err) return <div className="p-4 text-rose-400">Failed: {err}</div>;
  if (!data) return <div className="p-4 text-slate-300">Loading…</div>;

  const coords = Array.isArray(data?.geo?.coordinates) ? { lng: data.geo.coordinates[0], lat: data.geo.coordinates[1] } : null;

  return (
    <div className="p-4 md:p-6 text-sm text-slate-200">
      <div className="mx-auto max-w-[1080px] p-5 rounded-xl bg-slate-900/50 ring-1 ring-white/5">
        <h2 className="text-xl font-semibold mb-3">
          {data?.parcel?.survey_gat_no || "Property"}
          {data?.parcel?.ulpin ? ` • ${data.parcel.ulpin}` : ""}
        </h2>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded overflow-hidden border border-slate-700">
              <MapView
                center={coords ? [coords.lat, coords.lng] : [19.95, 79.3]}
                zoom={13}
                markers={coords ? [{ lat: coords.lat, lng: coords.lng, label: "Property", type: "PROPERTY" }] : []}
                tile="osm"
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-3">
            <div className="border border-slate-700 rounded overflow-hidden">
              <div className="bg-slate-800 text-slate-100 font-semibold p-2">Location</div>
              <div className="p-3 space-y-1">
                <div>Village: {data?.location_admin?.village || "—"}</div>
                <div>Taluka: {data?.location_admin?.taluka || "—"}</div>
                <div>District: {data?.location_admin?.district || "—"}</div>
              </div>
            </div>

            <div className="border border-slate-700 rounded overflow-hidden">
              <div className="bg-slate-800 text-slate-100 font-semibold p-2">Nearby (summary)</div>
              <div className="p-3 text-slate-300 text-xs">
                {/* simple summary without edit actions */}
                {data?.computed ? "Nearby data available." : "Nearby not computed."}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400">View-only link</div>
      </div>
    </div>
  );
}
