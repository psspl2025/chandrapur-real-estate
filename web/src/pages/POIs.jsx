// web/src/pages/POIs.jsx
import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function POIs() {
  const [count, setCount] = useState(null);
  const [result, setResult] = useState("");

  async function refreshCount() {
    try {
      const res = await fetch(`${API_BASE}/pois/count`);
      const data = await res.json();
      setCount(data.total);
    } catch (e) {
      setResult(String(e));
    }
  }

  useEffect(() => { refreshCount(); }, []);

  async function handleClear() {
    setResult("Clearing...");
    try {
      const res = await fetch(`${API_BASE}/pois/clear`, { method: "DELETE" });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      refreshCount();
    } catch (e) {
      setResult(String(e));
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult("Uploading...");
    const fd = new FormData();
    fd.append("file", file);

    // Use the import endpoint for properties? No — POIs accept JSON via /bulk.
    // So we read the file (assume JSON for this quick tool).
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      const res = await fetch(`${API_BASE}/pois/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      refreshCount();
    } catch (e) {
      setResult("Expecting JSON array for this quick upload. Error: " + e.message);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">POIs</h2>
      <div className="mb-3">Total POIs: <span className="font-semibold">{count ?? "…"}</span></div>

      <div className="space-x-3 mb-3">
        <label className="px-3 py-2 bg-slate-800 rounded cursor-pointer inline-block">
          Upload POIs JSON (seed-pois-min.json)
          <input type="file" accept=".json" onChange={handleUpload} className="hidden" />
        </label>
        <button onClick={handleClear} className="px-3 py-2 bg-rose-600 rounded">
          Clear All POIs
        </button>
      </div>

      <pre className="bg-slate-800 p-3 rounded overflow-auto text-xs">{result}</pre>
    </div>
  );
}
