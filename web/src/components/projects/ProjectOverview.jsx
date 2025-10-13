import React from "react";
import { DOC_ROWS, fmtINR, fmtDate } from "./common";

const fmtNum = (v, dec = 2) =>
  v == null || isNaN(v)
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });

// Resolve a document's URL (viewLink/url) from either:
// 1) detail.documents[] (array, old style)
// 2) detail.documents.record7_12 (object, your new upsert)
function docUrl(detail, label) {
  const docsArr = Array.isArray(detail?.documents) ? detail.documents : [];
  const d = docsArr.find(
    (x) => String(x?.name || "").toLowerCase() === String(label).toLowerCase()
  );
  if (d?.file?.viewLink || d?.file?.url) return d.file.viewLink || d.file.url;

  // Fallback for 7/12 stored as an object
  const r7 = detail?.documents?.record7_12;
  if (label === "7/12" && r7?.file) {
    return r7.file.viewLink || r7.file.url || null;
  }
  return null;
}

// Boolean helper: do we have the doc even without a URL?
function hasDoc(detail, label) {
  if (docUrl(detail, label)) return true;
  if (label === "7/12" && detail?.documents?.record7_12) return true;
  return false;
}

export default function ProjectOverview({ detail }) {
  const plots = Array.isArray(detail?.plots) ? detail.plots : [];
  const r7 = detail?.documents?.record7_12 || null;

  // Use locationDetails if present, else fallback to 7/12 fields
  const ld = detail?.locationDetails || {};
  const surveyNo = ld.surveyNo ?? r7?.gatNo ?? "-";
  const mouza    = ld.mouza    ?? r7?.village ?? r7?.village_raw ?? "-";
  const warg     = ld.warg     ?? "-";
  const tehsil   = ld.tehsil   ?? r7?.taluka ?? "-";
  const district = ld.district ?? r7?.district ?? "-";
  const address  = ld.address  ?? "-";

  // Per-plot derived areas
  const perPlot = plots.map((pl, i) => {
    const sqm = pl?.area_sqm != null ? Number(pl.area_sqm) : null;
    const sqft =
      pl?.area_sqft != null
        ? Number(pl.area_sqft)
        : sqm != null
        ? sqm * 10.76391041671
        : null;
    const ha = sqm != null ? sqm / 10000 : null;
    return { label: pl?.plotNo || i + 1, sqm, sqft, ha };
  });

  const noOfPlots =
    detail?.counts?.noOfPlots != null ? detail.counts.noOfPlots : plots.length;

  const money = detail?.financials || {};
  const av = Number(money?.totalAgreementValue || 0);
  const sd = Number(money?.stampDuty || 0);
  const rf = Number(money?.registrationFee || 0);
  const totalRegistryValue = av + sd + rf;

  // Docs progress: count by presence (array OR record7_12 object)
  const docsTotal = DOC_ROWS.length;
  const docsDone = DOC_ROWS.reduce(
    (n, [label]) => n + (hasDoc(detail, label) ? 1 : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <div className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold text-center p-2">
          Project Overview
        </div>
        <table className="w-full border-t border-slate-700 text-xs">
          <thead className="bg-slate-800/60">
            <tr>
              {[
                "Project ID",
                "Project Name",
                "Project Type",
                "Application Launch Date",
                "Planned Completion",
                "Project Status",
                "Booking Status",
              ].map((h) => (
                <th key={h} className="border border-slate-700 p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 p-2">
                {detail?.projectId || "-"}
              </td>
              <td className="border border-slate-700 p-2">
                {detail?.projectName || "-"}
              </td>
              <td className="border border-slate-700 p-2">
                {detail?.projectType || "-"}
              </td>
              <td className="border border-slate-700 p-2">
                {fmtDate(detail?.launchDate)}
              </td>
              <td className="border border-slate-700 p-2">
                {detail?.completionDate
                  ? fmtDate(detail.completionDate)
                  : "TBD (Not mentioned)"}
              </td>
              <td className="border border-slate-700 p-2">
                {detail?.status || "-"}
              </td>
              <td className="border border-slate-700 p-2">
                {detail?.bookingStatus || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Plot Information */}
      <div className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold text-center p-2">
          Plot Information
        </div>
        <table className="w-full border-t border-slate-700 text-xs">
          <thead className="bg-slate-800/60">
            <tr>
              {[
                "No of Plots",
                "Plot area (sq.m)",
                "Plot Area (sq.ft)",
                "Plot Area (Hectare)",
                "Rate per Sq.ft",
              ].map((h) => (
                <th key={h} className="border border-slate-700 p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 p-2">{noOfPlots}</td>
              <td className="border border-slate-700 p-2">
                <div className="space-y-1">
                  {perPlot.length ? (
                    perPlot.map((p, i) => (
                      <div key={i}>
                        {`Plot ${p.label}: `}
                        {p.sqm != null ? `${fmtNum(p.sqm, 3)} sq.m` : "-"}
                      </div>
                    ))
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </td>
              <td className="border border-slate-700 p-2">
                <div className="space-y-1">
                  {perPlot.length ? (
                    perPlot.map((p, i) => (
                      <div key={i}>
                        {`Plot ${p.label}: `}
                        {p.sqft != null ? `${fmtNum(p.sqft, 2)} sq.ft` : "-"}
                      </div>
                    ))
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </td>
              <td className="border border-slate-700 p-2">
                <div className="space-y-1">
                  {perPlot.length ? (
                    perPlot.map((p, i) => (
                      <div key={i}>
                        {`Plot ${p.label}: `}
                        {p.ha != null ? `${fmtNum(p.ha, 4)} ha` : "-"}
                      </div>
                    ))
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </td>
              <td className="border border-slate-700 p-2">
                {fmtINR(money?.ratePerSqft)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Survey & Legal Information (with 7/12 fallback) */}
      <div className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold text-center p-2">
          Survey &amp; Legal Information:
        </div>
        <table className="w-full border-t border-slate-700 text-xs">
          <thead className="bg-slate-800/60">
            <tr>
              {[
                "Survey Number",
                "Mouza",
                "Warg",
                "Tehsil",
                "District",
                "Location",
              ].map((h) => (
                <th key={h} className="border border-slate-700 p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 p-2">{surveyNo}</td>
              <td className="border border-slate-700 p-2">{mouza}</td>
              <td className="border border-slate-700 p-2">{warg}</td>
              <td className="border border-slate-700 p-2">{tehsil}</td>
              <td className="border border-slate-700 p-2">{district}</td>
              <td className="border border-slate-700 p-2 whitespace-pre-line">
                {address}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Metrics */}
      <div className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold text-center p-2">
          Financial Metrics
        </div>
        <table className="w-full border-t border-slate-700 text-xs">
          <thead className="bg-slate-800/60">
            <tr>
              {[
                "Agreement Value",
                "Stamp Duty",
                "Registration Fee",
                "Total Registry Value",
              ].map((h) => (
                <th key={h} className="border border-slate-700 p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 p-2">{fmtINR(av)}</td>
              <td className="border border-slate-700 p-2">{fmtINR(sd)}</td>
              <td className="border border-slate-700 p-2">{fmtINR(rf)}</td>
              <td className="border border-slate-700 p-2">
                {fmtINR(totalRegistryValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Document Attachments */}
      <div className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold text-center p-2">
          Document Attachments{" "}
          <span className="text-slate-300">({docsDone}/{docsTotal})</span>
        </div>
        <table className="w-full border-t border-slate-700 text-xs">
          <thead className="bg-slate-800/60">
            <tr>
              {DOC_ROWS.map(([label]) => (
                <th key={label} className="border border-slate-700 p-2 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {DOC_ROWS.map(([label]) => {
                const url = docUrl(detail, label);
                const present = hasDoc(detail, label);
                return (
                  <td key={label} className="border border-slate-700 p-2">
                    {present ? (
                      url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:underline"
                        >
                          Attached
                        </a>
                      ) : (
                        <span className="text-emerald-300">Attached</span>
                      )
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
