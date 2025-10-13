// web/src/pages/ProjectDashboard.jsx
import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

const fmtINR  = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");
const Check = ({ ok }) => (
  <span className={`inline-block w-5 h-5 rounded-full border text-center leading-5 ${ok ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300"}`}>
    {ok ? "✓" : "✗"}
  </span>
);

// document rows: [label, summaryKey]
const DOC_ROWS = [
  ["Official Application letter",       "applicationLetter"],
  ["Official Permission letter(Approval letter)", "approvalLetter"],
  ["7/12",                              "sevenTwelve"],
  ["CMC Approval",                      "cmcApproval"],
  ["Land Survey Map 'ka prat'",         "landSurveyMap"],
  ["Sanctioned Tentative layout map",   "tentativeLayout"],
  ["Sanctioned Demarcated/Final layout map","finalLayout"],
  ["Registry Document",                 "registryDoc"],
];

async function uploadDoc(projectId, label, file, onDone) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("name", label);
  const res = await fetch(`${API_BASE}/projects/${projectId}/documents/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  onDone && onDone();
}

async function removeDoc(projectId, label, onDone) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/documents?name=${encodeURIComponent(label)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  onDone && onDone();
}

export default function ProjectDashboard() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (district) params.set("district", district);
      params.set("limit", "50");
      const res = await fetch(`${API_BASE}/projects/summary?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setList(data.items || []);
    } catch (e) {
      setErr(String(e.message || e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, status, district]);

  return (
    <div className="p-4 md:p-6 text-sm text-slate-200">
      {/* Header box */}
      <div className="border border-slate-600 p-3">
        <div className="flex items-center justify-between">
          <div className="w-32 h-16 border border-slate-600 grid place-items-center text-slate-300">LOGO</div>
          <div className="flex-1 text-center">
            <div className="font-semibold text-base text-slate-100">Pawanssiddhi Group of Companies</div>
            <div className="text-xs text-slate-400">
              Above Onestep Salon, Near Ramdeo Baba Temple, Milan Sq., Chandrapur - 442 402 (M.S.)
            </div>
            <div className="font-semibold text-sm mt-1 text-slate-100">
              Procurement, Sourcing & Accounting Dashboard
            </div>
          </div>
          <div className="w-32" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <button className="border border-slate-600 px-2 py-1 text-slate-200">Customer Wise</button>
          <button className="border border-slate-600 px-2 py-1 text-slate-200">Item Wise</button>
          <input
            placeholder="Search Bar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border border-slate-600 px-2 py-1 flex-1 min-w-[220px] bg-slate-900 text-slate-100"
          />
          <input
            placeholder="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-600 px-2 py-1 w-[160px] bg-slate-900 text-slate-100"
          />
          <input
            placeholder="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="border border-slate-600 px-2 py-1 w-[160px] bg-slate-900 text-slate-100"
          />
          <button className="border border-slate-600 px-2 py-1 text-slate-200" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Cards */}
      {err && <div className="mt-4 text-rose-300">Error: {err}</div>}
      {loading ? (
        <div className="mt-4 text-slate-300">Loading…</div>
      ) : !list.length ? (
        <div className="mt-4 p-6 border border-slate-600 text-slate-300">
          No projects found. Add one with POST <code className="text-slate-100">/api/projects</code> or seed a sample.
        </div>
      ) : (
        list.map((p) => (
          <div key={p._id} className="mt-4 border border-slate-600">
            {/* Project Summary (full width) */}
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Project ID","Project Name","Location","Project Type",
                    "Application Launch Date","Planned Completion",
                    "Project Status","Booking Status","No. of Occupants",
                    "Occupants Names","Aadhar No.","Mouza",
                  ].map((h) => (
                    <th key={h} className="border border-slate-600 p-2 text-left text-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-200">
                  <td className="border border-slate-600 p-2">{p.projectId || "-"}</td>
                  <td className="border border-slate-600 p-2">{p.projectName}</td>
                  <td className="border border-slate-600 p-2">{p.locationDetails?.address || "-"}</td>
                  <td className="border border-slate-600 p-2">{p.projectType || "-"}</td>
                  <td className="border border-slate-600 p-2">{fmtDate(p.launchDate)}</td>
                  <td className="border border-slate-600 p-2">{fmtDate(p.completionDate)}</td>
                  <td className="border border-slate-600 p-2">{p.status}</td>
                  <td className="border border-slate-600 p-2">{p.bookingStatus || "-"}</td>
                  <td className="border border-slate-600 p-2">{p.counts?.occupants || 0}</td>
                  <td className="border border-slate-600 p-2">
                    {p.occupants?.length ? (
                      <ol className="list-decimal list-inside space-y-1">
                        {p.occupants.map((n, i) => <li key={i}>{n}</li>)}
                      </ol>
                    ) : "-"}
                  </td>
                  <td className="border border-slate-600 p-2">{p.aadhaar?.length ? p.aadhaar.join(", ") : "-"}</td>
                  <td className="border border-slate-600 p-2">{p.locationDetails?.mouza || "-"}</td>
                </tr>
              </tbody>
            </table>

            {/* Section title */}
            <div className="border-t border-slate-600 p-2 font-semibold text-slate-100">Service Document Tracking</div>

            {/* Survey / Plots */}
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Survey No.","Warg","Tehsil","District","No. of Flat / Plot",
                    "Flat No. / Plot No.","Each Plotable Area (sq.m)","Total Plotable Area (sq.m)",
                    "Total Plotable Area (sq.ft)","Total Plotable Area (HR)","Rate per Sq.ft","Added Tax (TDS)",
                  ].map((h) => (
                    <th key={h} className="border border-slate-600 p-2 text-left text-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {p.plots?.length ? p.plots.map((pl, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-600 p-2">{p.locationDetails?.surveyNo || "-"}</td>
                    <td className="border border-slate-600 p-2">{p.locationDetails?.warg || "-"}</td>
                    <td className="border border-slate-600 p-2">{p.locationDetails?.tehsil || "-"}</td>
                    <td className="border border-slate-600 p-2">{p.locationDetails?.district || "-"}</td>
                    <td className="border border-slate-600 p-2">{p.counts?.noOfPlots || 0}</td>
                    <td className="border border-slate-600 p-2">{pl.plotNo}</td>
                    <td className="border border-slate-600 p-2">{pl.area_sqm ?? "-"}</td>
                    <td className="border border-slate-600 p-2">{p.totals?.totalPlotableSqm ?? "-"}</td>
                    <td className="border border-slate-600 p-2">{p.totals?.totalPlotableSqft ?? "-"}</td>
                    <td className="border border-slate-600 p-2">{p.totals?.totalPlotableHR ?? "-"}</td>
                    <td className="border border-slate-600 p-2">{pl.rate_per_sqft ?? (p.totals?.ratePerSqft || "-")}</td>
                    <td className="border border-slate-600 p-2">{pl.added_tax ?? "-"}</td>
                  </tr>
                )) : (
                  <tr><td className="border border-slate-600 p-2 text-center" colSpan={12}>No plots found</td></tr>
                )}
              </tbody>
            </table>

            {/* Checklist + Finance (with upload actions) */}
            <table className="w-full table-fixed border-collapse text-xs">
              <tbody className="text-slate-200">
                <tr>
                  <td className="border border-slate-600 p-2">Total Agreement Value</td>
                  <td className="border border-slate-600 p-2" colSpan={3}>{fmtINR(p.financials?.totalAgreementValue)}</td>
                  <td className="border border-slate-600 p-2">Stamp Duty/Registration Fee</td>
                  <td className="border border-slate-600 p-2" colSpan={2}>
                    {fmtINR(p.financials?.stampDuty)}/{fmtINR(p.financials?.registrationFee)}
                  </td>
                  <td className="border border-slate-600 p-2">Total Value</td>
                  <td className="border border-slate-600 p-2" colSpan={2}>{fmtINR(p.financials?.totalValue)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-2">Location</td>
                  <td className="border border-slate-600 p-2" colSpan={9}>{p.locationDetails?.address || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-2">Area</td>
                  <td className="border border-slate-600 p-2" colSpan={4}>{p.totals?.totalPlotableSqft?.toLocaleString("en-IN")} sq.ft</td>
                  <td className="border border-slate-600 p-2">Co-ordinates</td>
                  <td className="border border-slate-600 p-2" colSpan={4}>-</td>
                </tr>

                {/* dynamic document rows */}
                {DOC_ROWS.map(([label, key]) => {
                  const ok = p.docChecklist?.[key];
                  const url = p.docFiles?.[key] || null;
                  const inputId = `${p._id}-${key}-file`;
                  return (
                    <tr key={key}>
                      <td className="border border-slate-600 p-2">{label}</td>
                      <td className="border border-slate-600 p-2"><Check ok={!!ok} /></td>
                      <td className="border border-slate-600 p-2" colSpan={8}>
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={inputId}
                            className="px-2 py-1 rounded border border-slate-600 cursor-pointer bg-slate-800 hover:bg-slate-700"
                          >
                            {url ? "Replace file" : "Upload file"}
                          </label>
                          <input
                            id={inputId}
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                await uploadDoc(p._id, label, f, () => load());
                              } catch (err) {
                                alert("Upload failed");
                                console.error(err);
                              } finally {
                                e.target.value = "";
                              }
                            }}
                          />
                          {url && (
                            <>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700"
                              >
                                View
                              </a>
                              <button
                                className="px-2 py-1 rounded border border-rose-500 text-rose-300 hover:bg-rose-900/30"
                                onClick={async () => {
                                  if (!confirm("Remove uploaded file?")) return;
                                  try {
                                    await removeDoc(p._id, label, () => load());
                                  } catch (err) {
                                    alert("Remove failed");
                                    console.error(err);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
