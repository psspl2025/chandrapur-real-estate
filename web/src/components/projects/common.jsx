//web/src/components/projects/common.jsx
import React from "react";
import { API_BASE } from "../../config";

/** master list of document rows */
export const DOC_ROWS = [
  ["Official Application letter", "applicationLetter"],
  ["Official Permission letter(Approval letter)", "approvalLetter"],
  ["7/12", "sevenTwelve"],
  ["CMC Approval", "cmcApproval"],
  ["Land Survey Map 'ka prat'", "landSurveyMap"],
  ["Sanctioned Tentative layout map", "tentativeLayout"],
  ["Sanctioned Demarcated/Final layout map", "finalLayout"],
  ["Registry Document", "registryDoc"],
];

export const fmtINR = (n) => (n == null ? "-" : Number(n).toLocaleString("en-IN"));
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

export const Check = ({ ok }) => (
  <span
    className={`inline-block w-5 h-5 rounded-full border text-center leading-5 ${
      ok ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300"
    }`}
  >
    {ok ? "✓" : "✗"}
  </span>
);

/** Tailwind-safe tone map (no dynamic class names) */
const toneMap = {
  slate: "bg-slate-700/30 border-slate-600 text-slate-200",
  emerald: "bg-emerald-700/30 border-emerald-600 text-emerald-200",
  sky: "bg-sky-700/30 border-sky-600 text-sky-200",
  amber: "bg-amber-700/30 border-amber-600 text-amber-200",
};
export function chip(text, tone = "slate") {
  return <span className={`px-2 py-0.5 rounded text-[11px] border ${toneMap[tone] || toneMap.slate}`}>{text}</span>;
}

export function progressOf(p) {
  const ck = p?.docChecklist || {};
  const total = DOC_ROWS.length;
  const done = DOC_ROWS.reduce((a, [, k]) => a + (ck[k] ? 1 : 0), 0);
  return { done, total };
}

/** API helpers for documents */
export async function uploadDoc(projectId, label, file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("name", label);
  const res = await fetch(`${API_BASE}/projects/${projectId}/documents/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    // Try to extract a useful message (our server returns { error: "..." })
    let msg = await res.text();
    try {
      const j = JSON.parse(msg);
      msg = j?.error || msg;
    } catch {
      // not JSON – keep raw text
    }
    throw new Error(msg || "Upload failed");
  }
}

export async function removeDoc(projectId, label) {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/documents?name=${encodeURIComponent(label)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    let msg = await res.text();
    try {
      const j = JSON.parse(msg);
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg || "Remove failed");
  }
}
