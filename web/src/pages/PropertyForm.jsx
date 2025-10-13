// web/src/pages/PropertyForm.jsx
import { useState } from "react";
import { API_BASE } from "../config";

const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isNaN(n) ? null : n;
};

export default function PropertyForm() {
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setDoc(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      source: { type: "MAHA_7_12" },
      location_admin: {
        state: "Maharashtra",
        district: fd.get("district") || null,
        taluka: fd.get("taluka") || null,
        village: fd.get("village") || null,
      },
      parcel: {
        ulpin: fd.get("ulpin") || null,
        survey_gat_no: fd.get("survey_gat_no") || null,
        area: {
          hectares: num(fd.get("area_hectares")),
          acres: num(fd.get("area_acres")),
          square_meters: num(fd.get("area_sq_m")),
          square_feet: num(fd.get("area_sq_ft")),
        },
        cultivable_area: {
          hectares: num(fd.get("cultiv_hectares")),
          acres: num(fd.get("cultiv_acres")),
          square_meters: num(fd.get("cultiv_sq_m")),
          square_feet: num(fd.get("cultiv_sq_ft")),
        },
      },
      use_and_crop: {
        land_use: fd.get("land_use") || "AGRICULTURE",
        year: fd.get("year") || null,
        crop_code: fd.get("crop_code") || null,
        crop_name: fd.get("crop_name") || null,
      },
      remarks: { notes: fd.get("notes") || null },
      integration: {
        district_tag: fd.get("district") || null,
        taluka_tag: fd.get("taluka") || null,
        village_tag: fd.get("village") || null,
        search_tokens: [
          fd.get("district"),
          fd.get("taluka"),
          fd.get("village"),
          fd.get("ulpin"),
          fd.get("survey_gat_no"),
        ].filter(Boolean),
      },
    };

    const lng = num(fd.get("lng"));
    const lat = num(fd.get("lat"));
    if (isFinite(lng) && isFinite(lat)) {
      payload.geo = { type: "Point", coordinates: [lng, lat], geo_source: "react-form" };
    }

    const computeNearby = fd.get("computeNearby") === "on";

    try {
      // create
      const res = await fetch(`${API_BASE}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      let created = await res.json();

      // recompute (optional)
      if (computeNearby && created?.geo?.coordinates?.length === 2) {
        const rec = await fetch(`${API_BASE}/properties/${created._id}/recompute`, { method: "POST" });
        if (rec.ok) {
          created = await rec.json();
        }
      }

      setDoc(created);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function loadBenefit(id) {
    const res = await fetch(`${API_BASE}/properties/${id}/benefit`);
    return res.json();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Add Property</h2>
        <a href="/" className="text-sky-400 hover:underline">← Back to Properties</a>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 bg-slate-800 p-4 rounded-lg">
        <div className="col-span-4">
          <label className="text-sm text-slate-400">District</label>
          <input name="district" className="w-full p-2 rounded bg-slate-900" placeholder="Chandrapur" required />
        </div>
        <div className="col-span-4">
          <label className="text-sm text-slate-400">Taluka</label>
          <input name="taluka" className="w-full p-2 rounded bg-slate-900" placeholder="Rajura" />
        </div>
        <div className="col-span-4">
          <label className="text-sm text-slate-400">Village</label>
          <input name="village" className="w-full p-2 rounded bg-slate-900" placeholder="देवई गोविंदपूर" />
        </div>

        <div className="col-span-6">
          <label className="text-sm text-slate-400">ULPIN</label>
          <input name="ulpin" className="w-full p-2 rounded bg-slate-900" placeholder="25461903803" />
        </div>
        <div className="col-span-6">
          <label className="text-sm text-slate-400">Survey / Gat No.</label>
          <input name="survey_gat_no" className="w-full p-2 rounded bg-slate-900" placeholder="107/43/3" />
        </div>

        <div className="col-span-3">
          <label className="text-sm text-slate-400">Area (hectares)</label>
          <input name="area_hectares" type="number" step="0.0001" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Area (acres)</label>
          <input name="area_acres" type="number" step="0.0001" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Area (sq m)</label>
          <input name="area_sq_m" type="number" step="1" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Area (sq ft)</label>
          <input name="area_sq_ft" type="number" step="1" className="w-full p-2 rounded bg-slate-900" />
        </div>

        <div className="col-span-3">
          <label className="text-sm text-slate-400">Cultivable (hectares)</label>
          <input name="cultiv_hectares" type="number" step="0.0001" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Cultivable (acres)</label>
          <input name="cultiv_acres" type="number" step="0.0001" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Cultivable (sq m)</label>
          <input name="cultiv_sq_m" type="number" step="1" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-slate-400">Cultivable (sq ft)</label>
          <input name="cultiv_sq_ft" type="number" step="1" className="w-full p-2 rounded bg-slate-900" />
        </div>

        <div className="col-span-4">
          <label className="text-sm text-slate-400">Land Use</label>
          <select name="land_use" className="w-full p-2 rounded bg-slate-900">
            <option value="AGRICULTURE">AGRICULTURE</option>
            <option value="NON_AGRICULTURE">NON_AGRICULTURE</option>
            <option value="INDUSTRIAL">INDUSTRIAL</option>
            <option value="RESIDENTIAL">RESIDENTIAL</option>
            <option value="COMMERCIAL">COMMERCIAL</option>
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-sm text-slate-400">Crop Year</label>
          <input name="year" className="w-full p-2 rounded bg-slate-900" placeholder="2023-24" />
        </div>
        <div className="col-span-2">
          <label className="text-sm text-slate-400">Crop Code</label>
          <input name="crop_code" className="w-full p-2 rounded bg-slate-900" />
        </div>
        <div className="col-span-2">
          <label className="text-sm text-slate-400">Crop Name</label>
          <input name="crop_name" className="w-full p-2 rounded bg-slate-900" placeholder="Jowar (ज्वारी)" />
        </div>

        <div className="col-span-6">
          <label className="text-sm text-slate-400">Longitude (lng)</label>
          <input name="lng" type="number" step="0.000001" className="w-full p-2 rounded bg-slate-900" placeholder="79.3074" />
        </div>
        <div className="col-span-6">
          <label className="text-sm text-slate-400">Latitude (lat)</label>
          <input name="lat" type="number" step="0.000001" className="w-full p-2 rounded bg-slate-900" placeholder="19.9506" />
        </div>

        <div className="col-span-12">
          <label className="text-sm text-slate-400">Notes</label>
          <textarea name="notes" className="w-full p-2 rounded bg-slate-900" placeholder="Any remarks..."></textarea>
        </div>

        <div className="col-span-12">
          <label className="text-sm">
            <input type="checkbox" name="computeNearby" className="mr-2" />
            Compute nearby (requires POIs & coordinates)
          </label>
        </div>

        <div className="col-span-12 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-sky-500 hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Property"}
          </button>
        </div>
      </form>

      {error && <div className="mt-3 text-rose-400 text-sm">{error}</div>}

      {doc && (
        <div className="mt-6 p-4 bg-slate-800 rounded-lg">
          <div className="font-semibold">Saved ✓</div>
          <div className="text-sm text-slate-400 mb-2">ID: {doc._id}</div>
          <div className="space-x-3">
            <a
              className="text-sky-400 hover:underline"
              href={`${API_BASE}/properties/${doc._id}/benefit`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Benefit JSON
            </a>
            <a
              className="text-sky-400 hover:underline"
              href={`${API_BASE}/properties/${doc._id}/brochure.pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Brochure PDF
            </a>
          </div>
          <pre className="mt-3 text-xs bg-slate-900 p-3 rounded overflow-auto max-h-80">
{JSON.stringify(doc, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
