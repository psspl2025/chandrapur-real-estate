// web/src/components/projects/ProjectDetailDrawer.jsx
import React from "react";
import { chip, progressOf } from "./common.jsx";
import ProjectOverview from "./ProjectOverview.jsx";
import ProjectDocuments from "./ProjectDocuments.jsx";
import ProjectEditor from "./ProjectEditor.jsx";

export default function ProjectDetailDrawer({
  detail, isNew, tab, setTab,
  pendingOnly, setPendingOnly,
  onClose, onPrev, onNext,
  reloadDetail, reloadList,
  onCreate, onUpdate, onDelete,
}) {
  const { done, total } = progressOf(detail);

  function handlePrint() {
    // simple print view for the drawer
    window.print();
  }

  async function handleSave(payload) {
    try {
      if (isNew) {
        await onCreate(payload);
      } else {
        await onUpdate(detail._id, payload);
      }
    } catch (e) {
      alert(typeof e === "string" ? e : e.message || "Save failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full md:w-[1100px] bg-slate-900 border-l border-slate-700 overflow-auto print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="space-x-2">
              <span className="font-semibold text-slate-100">{detail.projectName || "New Project"}</span>
              {detail.projectId && <span className="text-slate-400">({detail.projectId})</span>}
              {!isNew && detail.status && chip(
                detail.status,
                detail.status === "COMPLETED" ? "emerald" : detail.status === "ONGOING" ? "sky" : "amber"
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <>
                  <button onClick={() => setTab("edit")}
                          className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">Edit</button>
                  <button onClick={() => onDelete(detail._id)}
                          className="px-2 py-1 rounded border border-rose-500 text-rose-300 hover:bg-rose-900/30">Delete</button>
                  <button onClick={handlePrint}
                          className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">Export / Print</button>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                          className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">Share</button>
                </>
              )}
              <button onClick={onPrev} className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">◂ Prev</button>
              <button onClick={onNext} className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">Next ▸</button>
              <button onClick={onClose} className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">Close ✕</button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {["overview","documents","edit"].map((t) => (
              <button key={t}
                      onClick={() => setTab(t)}
                      className={`px-2 py-1 rounded border ${tab === t ? "bg-slate-700 border-slate-600" : "bg-slate-800 border-slate-700 text-slate-300"}`}
                      disabled={isNew && t !== "edit"}>
                {t === "overview" ? "View" : t === "documents" ? "Documents" : "Edit"}
              </button>
            ))}
            {!isNew && <span className="ml-auto text-slate-300">Docs: {done}/{total}</span>}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6" id="printable">
          {tab === "overview" && !isNew && <ProjectOverview detail={detail} />}
          {tab === "documents" && !isNew && (
            <ProjectDocuments
              detail={detail}
              pendingOnly={pendingOnly}
              setPendingOnly={setPendingOnly}
              reloadDetail={reloadDetail}
              reloadList={reloadList}
            />
          )}
          {tab === "edit" && (
            <ProjectEditor
              initial={detail}
              isNew={isNew}
              onCancel={() => (isNew ? onClose() : setTab("overview"))}
              onSave={handleSave}
            />
          )}
          {tab !== "edit" && isNew && (
            <div className="text-slate-300">Start by filling the **Edit** form to create a project.</div>
          )}
        </div>
      </div>
    </div>
  );
}
