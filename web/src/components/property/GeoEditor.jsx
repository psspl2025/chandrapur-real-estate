import React, { useState } from "react";
import { API_BASE } from "../../config";

export default function GeoEditor({ property, onClose, onSaved }) {
  const [lng, setLng] = useState(property?.geo?.coordinates?.[0] ?? "");
  const [lat, setLat] = useState(property?.geo?.coordinates?.[1] ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save(recompute = true) {
    setSaving(true); setErr("");
    try {
      const body = {
        geo: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
          geo_source: "properties-edit",
        }
      };
      // Your PUT handler already recomputes when geo is present.
      const res = await fetch(`${API_BASE}/properties/${property._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      // (Optional) force recompute again via endpoint if you want to guarantee freshness
      if (recompute) {
        const rec = await fetch(`${API_BASE}/properties/${property._id}/recompute`, { method: "POST" });
        if (rec.ok) {
          const upd2 = await rec.json();
          onSaved?.(upd2);
          onClose?.();
          return;
        }
      }
      onSaved?.(updated);
      onClose?.();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-[420px] bg-slate-900 rounded-xl border border-white/10 p-4">
        <div className="text-lg font-semibold mb-2">Edit Coordinates</div>
        <div className="text-slate-400 text-xs mb-3">Use [lng, lat]. Example: 79.295943, 19.947035</div>

        <label className="text-sm text-slate-400">Longitude (lng)</label>
        <input className="w-full p-2 rounded bg-slate-800 mb-2"
               value={lng} onChange={(e) => setLng(e.target.value)}
               type="number" step="0.000001" placeholder="79.295943" />

        <label className="text-sm text-slate-400">Latitude (lat)</label>
        <input className="w-full p-2 rounded bg-slate-800 mb-3"
               value={lat} onChange={(e) => setLat(e.target.value)}
               type="number" step="0.000001" placeholder="19.947035" />

        {err && <div className="text-rose-400 text-xs mb-2">{err}</div>}

        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded bg-slate-700" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500" onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving…" : "Save + Recompute"}
          </button>
        </div>
      </div>
    </div>
  );
}
