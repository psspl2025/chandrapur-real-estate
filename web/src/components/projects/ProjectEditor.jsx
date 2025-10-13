// web/src/components/projects/ProjectEditor.jsx
import React, { useMemo, useState } from "react";
import { fmtINR } from "./common.jsx";

const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isNaN(n) ? null : n;
};
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function ProjectEditor({ initial, isNew, onSave, onCancel }) {
  // make a local, editable draft
  const [draft, setDraft] = useState(() => ({
    projectId: initial.projectId || "",
    projectName: initial.projectName || "",
    projectType: initial.projectType || "PLOTTING",
    status: initial.status || "ONGOING",
    bookingStatus: initial.bookingStatus || "",
    launchDate: initial.launchDate || null,
    completionDate: initial.completionDate || null,
    locationDetails: {
      address: initial.locationDetails?.address || "",
      mouza: initial.locationDetails?.mouza || "",
      tehsil: initial.locationDetails?.tehsil || "",
      district: initial.locationDetails?.district || "",
      surveyNo: initial.locationDetails?.surveyNo || "",
      warg: initial.locationDetails?.warg || "",
    },
    plots: (initial.plots || []).map((p) => ({ plotNo: p.plotNo || "", area_sqm: p.area_sqm || null })),
    financials: {
      totalAgreementValue: initial.financials?.totalAgreementValue ?? null,
      stampDuty: initial.financials?.stampDuty ?? null,
      registrationFee: initial.financials?.registrationFee ?? null,
      totalValue: initial.financials?.totalValue ?? null,
      ratePerSqft: initial.financials?.ratePerSqft ?? null,
    },
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // derived totals (display only)
  const derived = useMemo(() => {
    const sqm = (draft.plots || []).reduce((a, p) => a + (Number(p.area_sqm) || 0), 0);
    const sqft = sqm * 10.76391041671;
    return {
      plots: draft.plots?.length || 0,
      sqm: Math.round(sqm * 1000) / 1000,
      sqft: Math.round(sqft * 100) / 100,
    };
  }, [draft.plots]);

  function setField(path, value) {
    setDraft((d) => {
      const n = structuredClone(d);
      // shallow path setter
      const segs = path.split(".");
      let cur = n;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs[segs.length - 1]] = value;
      return n;
    });
  }

  function updatePlot(i, key, val) {
    setDraft((d) => {
      const copy = structuredClone(d);
      copy.plots[i][key] = val;
      return copy;
    });
  }
  function addPlot() {
    setDraft((d) => ({ ...d, plots: [...(d.plots || []), { plotNo: String((d.plots?.length || 0) + 1), area_sqm: null }] }));
  }
  function removePlot(i) {
    setDraft((d) => ({ ...d, plots: d.plots.filter((_, idx) => idx !== i) }));
  }

  async function submit() {
    setSaving(true); setError("");
    try {
      // basic validation
      if (!draft.projectName.trim()) throw new Error("Project Name is required");
      if (!draft.locationDetails.district.trim()) throw new Error("District is required");

      // build payload per schema
      const payload = {
        projectId: draft.projectId || undefined,
        projectName: draft.projectName,
        projectType: draft.projectType,
        status: draft.status,
        bookingStatus: draft.bookingStatus || undefined,
        launchDate: draft.launchDate || undefined,
        completionDate: draft.completionDate || undefined,
        locationDetails: {
          address: draft.locationDetails.address || undefined,
          mouza: draft.locationDetails.mouza || undefined,
          tehsil: draft.locationDetails.tehsil || undefined,
          district: draft.locationDetails.district || undefined,
          surveyNo: draft.locationDetails.surveyNo || undefined,
          warg: draft.locationDetails.warg || undefined,
        },
        plots: (draft.plots || []).map((p) => ({
          plotNo: p.plotNo || "",
          area_sqm: num(p.area_sqm),
          // area_sqft is derived and optional in your schema; omit unless you want to persist:
          area_sqft: p.area_sqm != null ? Number(p.area_sqm) * 10.76391041671 : undefined,
        })),
        financials: {
          totalAgreementValue: num(draft.financials.totalAgreementValue),
          stampDuty: num(draft.financials.stampDuty),
          registrationFee: num(draft.financials.registrationFee),
          totalValue: num(draft.financials.totalValue),
          ratePerSqft: num(draft.financials.ratePerSqft),
        },
      };

      await onSave(payload);
    } catch (e) {
      setError(typeof e === "string" ? e : e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top action bar (sticky inside editor) */}
      <div className="sticky top-12 z-10 bg-slate-900/90 backdrop-blur border-b border-slate-700 p-2 flex items-center gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded border border-slate-600 hover:bg-slate-700">Cancel</button>
        <button onClick={submit} disabled={saving} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">
          {saving ? "Saving…" : (isNew ? "Create Project" : "Save changes")}
        </button>
        <div className="ml-auto text-xs text-slate-400">
          Plots: {derived.plots} • Total: {fmtINR(derived.sqm)} sq.m • {fmtINR(derived.sqft)} sq.ft
        </div>
      </div>

      {error && <div className="p-2 bg-rose-900/30 border border-rose-700 text-rose-200 rounded text-xs">{error}</div>}

      {/* Project Overview */}
      <section className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold p-2">Project Overview</div>
        <div className="grid grid-cols-12 gap-3 p-3">
          <div className="col-span-6">
            <label className="text-xs text-slate-400">Project Name</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.projectName} onChange={(e) => setField("projectName", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Project ID</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.projectId} onChange={(e) => setField("projectId", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Project Type</label>
            <select className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                    value={draft.projectType} onChange={(e) => setField("projectType", e.target.value)}>
              {["RESIDENTIAL","COMMERCIAL","PLOTTING","MIXED"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="col-span-3">
            <label className="text-xs text-slate-400">Application Launch Date</label>
            <input type="date" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={toDateInput(draft.launchDate)} onChange={(e) => setField("launchDate", e.target.value || null)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Planned Completion</label>
            <input type="date" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={toDateInput(draft.completionDate)} onChange={(e) => setField("completionDate", e.target.value || null)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Project Status</label>
            <select className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                    value={draft.status} onChange={(e) => setField("status", e.target.value)}>
              {["ONGOING","COMPLETED","ONHOLD"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Booking Status</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.bookingStatus} onChange={(e) => setField("bookingStatus", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Survey & Legal */}
      <section className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold p-2">Survey & Legal Information</div>
        <div className="grid grid-cols-12 gap-3 p-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Survey Number</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.locationDetails.surveyNo} onChange={(e) => setField("locationDetails.surveyNo", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Mouza</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.locationDetails.mouza} onChange={(e) => setField("locationDetails.mouza", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Warg</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.locationDetails.warg} onChange={(e) => setField("locationDetails.warg", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Tehsil</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.locationDetails.tehsil} onChange={(e) => setField("locationDetails.tehsil", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">District</label>
            <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.locationDetails.district} onChange={(e) => setField("locationDetails.district", e.target.value)} />
          </div>
          <div className="col-span-12">
            <label className="text-xs text-slate-400">Location / Address</label>
            <textarea rows={3} className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                      value={draft.locationDetails.address} onChange={(e) => setField("locationDetails.address", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Flat / Plot */}
      <section className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold p-2 flex items-center justify-between">
          <span>Flat / Plot Information</span>
          <button onClick={addPlot} className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700 text-xs">+ Add Plot</button>
        </div>
        <div className="p-3 space-y-2">
          {(draft.plots || []).map((pl, i) => {
            const sqft = pl.area_sqm != null && pl.area_sqm !== "" ? Number(pl.area_sqm) * 10.76391041671 : null;
            return (
              <div key={i} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <label className="text-xs text-slate-400">Plot No</label>
                  <input className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                         value={pl.plotNo} onChange={(e) => updatePlot(i, "plotNo", e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-400">Area (sq.m)</label>
                  <input type="number" step="0.001" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                         value={pl.area_sqm ?? ""} onChange={(e) => updatePlot(i, "area_sqm", e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-400">Area (sq.ft)</label>
                  <input disabled className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-400"
                         value={sqft == null ? "" : Math.round(sqft * 100) / 100} />
                </div>
                <div className="col-span-3">
                  <button onClick={() => removePlot(i)} className="px-2 py-2 rounded border border-rose-500 text-rose-300 hover:bg-rose-900/30 w-full">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {(!draft.plots || draft.plots.length === 0) && <div className="text-slate-400 text-sm">No plots added yet.</div>}
        </div>
      </section>

      {/* Financials */}
      <section className="border border-slate-700">
        <div className="bg-slate-800 text-slate-100 font-semibold p-2">Financial Metrics</div>
        <div className="grid grid-cols-12 gap-3 p-3">
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Stamp Duty</label>
            <input type="number" step="1" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.financials.stampDuty ?? ""} onChange={(e) => setField("financials.stampDuty", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Registration Fee</label>
            <input type="number" step="1" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.financials.registrationFee ?? ""} onChange={(e) => setField("financials.registrationFee", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Total Agreement Value</label>
            <input type="number" step="1" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.financials.totalAgreementValue ?? ""} onChange={(e) => setField("financials.totalAgreementValue", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Total Registry Value</label>
            <input type="number" step="1" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.financials.totalValue ?? ""} onChange={(e) => setField("financials.totalValue", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-400">Rate per Sq.ft</label>
            <input type="number" step="0.01" className="w-full p-2 rounded bg-slate-900 border border-slate-700"
                   value={draft.financials.ratePerSqft ?? ""} onChange={(e) => setField("financials.ratePerSqft", e.target.value)} />
          </div>

          <div className="col-span-9 self-end text-right text-xs text-slate-400">
            <div>Derived total area: <span className="text-slate-200">{fmtINR(derived.sqm)} sq.m</span> • <span className="text-slate-200">{fmtINR(derived.sqft)} sq.ft</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
