import React from "react";
import { chip, progressOf, fmtINR } from "./common";

export default function ProjectListTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  page,
  limit,
  totalPages,
  setPage,
  setLimit,
  onView,
}) {
  const cols = [
    { key: "projectId", label: "Project ID", sortable: true, align: "left" },
    // fixed: key must be "name" to align with getKey('name') in Projects.jsx
    { key: "name", label: "Project Name", sortable: true, align: "left" },
    { key: "type", label: "Type", sortable: true, align: "left" },
    { key: "status", label: "Status", sortable: true, align: "left" },
    { key: "district", label: "District", sortable: true, align: "left" },
    { key: "mouza", label: "Mouza", sortable: true, align: "left" },
    { key: "plots", label: "Plots", sortable: true, align: "right", num: true },
    {
      key: "sqft",
      label: "Total Sq.ft",
      sortable: true,
      align: "right",
      num: true,
    },
    {
      key: "rate",
      label: "Rate (₹/sq.ft)",
      sortable: true,
      align: "right",
      num: true,
    },
    { key: "docs", label: "Docs", sortable: true, align: "left" },
    { key: null, label: "Actions", sortable: false, align: "right" },
  ];

  const formatInt = (v) =>
    v == null || isNaN(v) ? "-" : Number(v).toLocaleString("en-IN");
  const colCount = cols.length;
  const sortIcon = (field) =>
    sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕";

  return (
    <>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-[1100px] w-full text-[13px] border border-white/10 rounded-lg overflow-hidden">
          <thead className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/10">
            <tr>
              {cols.map(({ key, label, sortable, align }) => {
                const active = sortable && sortBy === key;
                const aria = active
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                return (
                  <th
                    key={label}
                    className={`px-3 py-2 font-semibold text-slate-300 select-none ${
                      align === "right" ? "text-right" : "text-left"
                    }`}
                    aria-sort={sortable ? aria : undefined}
                    scope="col"
                    title={sortable ? `Sort by ${label}` : undefined}
                  >
                    {sortable ? (
                      <button
                        onClick={() => onSort(key)}
                        className={`inline-flex items-center gap-1 hover:text-white focus:outline-none ${
                          active ? "text-white" : ""
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-xs opacity-70">
                          {sortIcon(key)}
                        </span>
                      </button>
                    ) : (
                      <span>{label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {rows.map((p) => {
              const { done, total } = progressOf(p);
              const pct = total ? Math.round((done / total) * 100) : 0;
              const bar =
                pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

              return (
                <tr
                  key={p._id}
                  className="even:bg-white/[0.02] hover:bg-white/[0.04] transition"
                >
                  {/* Project ID */}
                  <td className="px-3 py-2">
                    <button
                      className="text-sky-300 hover:underline"
                      onClick={() => onView(p._id)}
                      title="Open project"
                    >
                      {p.projectId || "-"}
                    </button>
                  </td>

                  {/* Name (truncate with tooltip) */}
                  <td className="px-3 py-2">
                    <button
                      className="text-slate-100 hover:underline max-w-[320px] truncate block text-left"
                      onClick={() => onView(p._id)}
                      title={p.projectName || "-"}
                    >
                      {p.projectName || "-"}
                    </button>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2 text-slate-300">
                    {p.projectType || "-"}
                  </td>

                  {/* Status chip via helper */}
                  <td className="px-3 py-2">
                    {p.status
                      ? chip(
                          p.status,
                          p.status === "COMPLETED"
                            ? "emerald"
                            : p.status === "ONGOING"
                            ? "sky"
                            : "amber"
                        )
                      : "-"}
                  </td>

                  {/* District / Mouza */}
                  <td className="px-3 py-2 text-slate-300">
                    {p.locationDetails?.district || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {p.locationDetails?.mouza || "-"}
                  </td>

                  {/* Plots */}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.counts?.noOfPlots ?? 0}
                  </td>

                  {/* Total Sq.ft */}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatInt(p.totals?.totalPlotableSqft)}
                  </td>

                  {/* Rate (₹/sq.ft) */}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtINR(p.financials?.ratePerSqft)}
                  </td>

                  {/* Docs progress */}
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-2"
                      title={`${done}/${total} (${pct}%)`}
                    >
                      <span
                        className="inline-block w-24 h-1.5 bg-slate-700 rounded overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        aria-label="Documents completed"
                      >
                        <span
                          className={`block h-1.5 ${bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        {done}/{total}
                      </span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    <button
                      className="px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white"
                      onClick={() => onView(p._id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400" colSpan={colCount}>
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-slate-400">Rows</span>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="bg-slate-900 border border-white/10 rounded px-2 py-1"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`px-2 py-1 rounded ${
            page <= 1
              ? "bg-white/5 text-slate-500"
              : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
        >
          Prev
        </button>

        <span className="text-slate-300 tabular-nums">{page}</span>
        <span className="text-slate-400">/ {totalPages}</span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={`px-2 py-1 rounded ${
            page >= totalPages
              ? "bg-white/5 text-slate-500"
              : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
        >
          Next
        </button>
      </div>
    </>
  );
}
