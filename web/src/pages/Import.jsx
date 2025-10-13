// web/src/pages/Import.jsx
import { useState } from "react";
import { API_BASE } from "../config";

export default function ImportPage() {
  const [out, setOut] = useState("Select a .xlsx or .csv and click import.");

  async function handleSubmit(e) {
    e.preventDefault();
    const file = e.currentTarget.file.files?.[0];
    const computeNearby = e.currentTarget.computeNearby.checked;
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("computeNearby", computeNearby ? "true" : "false");

    setOut("Uploading…");
    try {
      const res = await fetch(`${API_BASE}/import/properties`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      setOut(JSON.stringify(json, null, 2));
    } catch (e) {
      setOut(String(e));
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Bulk Import Properties</h2>
      <form onSubmit={handleSubmit} className="space-y-3 bg-slate-800 p-4 rounded">
        <input name="file" type="file" accept=".xlsx,.csv" className="block" required />
        <label className="block">
          <input type="checkbox" name="computeNearby" className="mr-2" /> Compute nearby after import
        </label>
        <button className="px-3 py-2 bg-sky-500 rounded">Import</button>
      </form>
      <pre className="mt-3 bg-slate-800 p-3 rounded text-xs overflow-auto">{out}</pre>

      <div className="mt-4 text-slate-400 text-sm">
        Expected columns (case-insensitive): district, taluka, village, ulpin, survey_gat_no, area_hectares, area_acres,
        area_sq_m, area_sq_ft, cultiv_hectares, cultiv_acres, cultiv_sq_m, cultiv_sq_ft, land_use, year, crop_code,
        crop_name, lng, lat
      </div>
    </div>
  );
}
