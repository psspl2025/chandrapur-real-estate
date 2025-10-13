// web/src/components/property/NarrativeCard.jsx
import React from "react";

export default function NarrativeCard({ text, onReload }) {
  function copy() {
    navigator.clipboard.writeText(text || "");
  }
  function download() {
    const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "property-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-slate-700">
      <div className="bg-slate-800 text-slate-100 font-semibold p-2 flex items-center justify-between">
        <span>Narrative Summary</span>
        <div className="space-x-2">
          <button onClick={copy} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">Copy</button>
          <button onClick={download} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">Download</button>
        </div>
      </div>
      <div className="p-3">
        <textarea
          className="w-full min-h-[140px] bg-slate-900 border border-slate-700 rounded p-2 text-sm"
          value={text || ""}
          readOnly
        />
        <button onClick={onReload} className="mt-2 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">
          Reload
        </button>
      </div>
    </div>
  );
}
