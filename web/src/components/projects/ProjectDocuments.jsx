import React, { useMemo, useRef, useState } from "react";
import { DOC_ROWS, Check, removeDoc } from "./common";
import { API_BASE } from "../../config";

/** Find a document row on the raw project by label (case-insensitive). */
function getDoc(detail, label) {
  const docs = Array.isArray(detail?.documents) ? detail.documents : [];
  return docs.find(
    (d) => String(d?.name || "").toLowerCase() === String(label).toLowerCase()
  );
}

/** Make a single A4 PDF from an array of {data: dataURL, label?:string} pages. */
async function makePdf(pages) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const A4_W = 595, A4_H = 842;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    // convert dataURL -> Uint8Array
    const bytes = Uint8Array.from(atob(p.data.split(",")[1]), (c) => c.charCodeAt(0));
    const img = await pdfDoc.embedJpg(bytes).catch(async () => pdfDoc.embedPng(bytes));
    const page = pdfDoc.addPage([A4_W, A4_H]);

    // Fit image inside A4 while preserving aspect ratio
    const iw = img.width, ih = img.height;
    const scale = Math.min(A4_W / iw, A4_H / ih);
    const w = iw * scale, h = ih * scale;
    const x = (A4_W - w) / 2, y = (A4_H - h) / 2;

    page.drawImage(img, { x, y, width: w, height: h });

    // small footer with index
    page.drawText(`${i + 1} / ${pages.length}`, {
      x: A4_W - 60,
      y: 12,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export default function ProjectDocuments({
  detail,
  pendingOnly,
  setPendingOnly,
  reloadDetail,
  reloadList,
}) {
  // Derive a boolean checklist from raw documents (file present = approved)
  const checklist = useMemo(
    () =>
      Object.fromEntries(
        DOC_ROWS.map(([label, key]) => {
          const d = getDoc(detail, label);
          const ok = !!d?.file?.viewLink || !!d?.file?.url;
          return [key, ok];
        })
      ),
    [detail]
  );

  // ---- Scan panel state ----
  const [scanLabel, setScanLabel] = useState(null); // which document label is open for scanning
  const [pages, setPages] = useState([]); // [{data: dataURL}]
  const filePickerRef = useRef(null);

  function openScan(label) {
    setScanLabel(label);
    setPages([]); // fresh
  }
  function closeScan() {
    setScanLabel(null);
    setPages([]);
  }
  function addImages(files) {
    if (!files?.length) return;
    const readers = Array.from(files).map(
      (f) =>
        new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve({ data: r.result });
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((arr) => setPages((prev) => prev.concat(arr)));
  }
  function removePage(idx) {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  }

  // common handler for 428 Drive-not-connected
  async function handleGDriveAuthIfNeeded(res) {
    if (res.status === 428) {
      let payload = null;
      try { payload = await res.json(); } catch {}
      const url = payload?.url;
      if (payload?.error === "gdrive_not_connected" && url) {
        const go = confirm(
          "Google authorization is required once.\n\nOpen the Google permission page now?"
        );
        if (go) {
          window.open(url, "_blank", "noopener");
          alert("After finishing the Google screen, return here and repeat the upload.");
        }
        return true; // handled
      }
    }
    return false;
  }

  async function createPdfAndUpload(label, refId, dateId) {
    if (!pages.length) {
      alert("Add at least one page.");
      return;
    }
    try {
      const pdfBlob = await makePdf(pages);
      const refNo = document.getElementById(refId)?.value || "";
      const date = document.getElementById(dateId)?.value || "";

      const fd = new FormData();
      // name the pdf nicely
      const filename = `${label.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      fd.append("file", new File([pdfBlob], filename, { type: "application/pdf" }));
      fd.append("name", label);
      if (refNo) fd.append("refNo", refNo);
      if (date) fd.append("date", date);

      const res = await fetch(
        `${API_BASE}/projects/${detail._id}/documents/upload`,
        { method: "POST", body: fd }
      );

      // special case: Drive auth not connected
      if (await handleGDriveAuthIfNeeded(res)) return;

      if (!res.ok) {
        let msg;
        try { msg = (await res.json())?.error; } catch { msg = await res.text(); }
        throw new Error(msg || "Upload failed");
      }

      await reloadDetail();
      await reloadList();
      closeScan();
    } catch (err) {
      alert(`Upload failed: ${err?.message || err}`);
      console.error(err);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs">
          <input
            type="checkbox"
            className="mr-2"
            checked={pendingOnly}
            onChange={() => setPendingOnly((v) => !v)}
          />
          Show pending only
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full border border-slate-700 text-xs">
          <thead>
            <tr>
              {["Document", "Status", "File", "Ref No", "Date", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="border border-slate-700 p-2 text-left text-slate-200"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {DOC_ROWS.filter(([, key]) => !pendingOnly || !checklist[key]).map(
              ([label, key]) => {
                const d = getDoc(detail, label);
                const ok = !!d?.file?.viewLink || !!d?.file?.url;
                const url = d?.file?.viewLink || d?.file?.url || null;

                const inputId = `${detail._id}-${key}-file`;
                const refId = `${detail._id}-${key}-ref`;
                const dateId = `${detail._id}-${key}-date`;

                const rowIsOpen = scanLabel === label;

                return (
                  <React.Fragment key={key}>
                    <tr>
                      <td className="border border-slate-700 p-2 align-top">
                        {label}
                      </td>

                      <td className="border border-slate-700 p-2 align-top">
                        <Check ok={ok} />
                      </td>

                      <td className="border border-slate-700 p-2 align-top">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="border border-slate-700 p-2 align-top">
                        <input
                          id={refId}
                          placeholder="Ref No"
                          defaultValue={d?.refNo || ""}
                          className="px-2 py-1 w-32 bg-slate-900 border border-slate-700 rounded text-slate-100"
                        />
                      </td>

                      <td className="border border-slate-700 p-2 align-top">
                        <input
                          id={dateId}
                          type="date"
                          defaultValue={
                            d?.date
                              ? new Date(d.date).toISOString().slice(0, 10)
                              : ""
                          }
                          className="px-2 py-1 w-36 bg-slate-900 border border-slate-700 rounded text-slate-100"
                        />
                      </td>

                      <td className="border border-slate-700 p-2 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Regular upload/replace */}
                          <label
                            htmlFor={inputId}
                            className="px-2 py-1 rounded border border-slate-600 cursor-pointer bg-slate-800 hover:bg-slate-700"
                          >
                            {url ? "Replace" : "Upload"}
                          </label>
                          <input
                            id={inputId}
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                const refNo =
                                  document.getElementById(refId)?.value || "";
                                const date =
                                  document.getElementById(dateId)?.value || "";

                                const fd = new FormData();
                                fd.append("file", f);
                                fd.append("name", label);
                                if (refNo) fd.append("refNo", refNo);
                                if (date) fd.append("date", date);

                                const res = await fetch(
                                  `${API_BASE}/projects/${detail._id}/documents/upload`,
                                  { method: "POST", body: fd }
                                );

                                // special case: Drive auth not connected
                                if (await handleGDriveAuthIfNeeded(res)) return;

                                if (!res.ok) {
                                  let msg;
                                  try { msg = (await res.json())?.error; } catch { msg = await res.text(); }
                                  throw new Error(msg || "Upload failed");
                                }

                                await reloadDetail();
                                await reloadList();
                              } catch (err) {
                                const msg = err?.message || "Upload failed";
                                alert(`Upload failed: ${msg}`);
                                console.error(err);
                              } finally {
                                e.target.value = "";
                              }
                            }}
                          />

                          {/* New: Scan flow */}
                          <button
                            className="px-2 py-1 rounded border border-sky-500 text-sky-300 hover:bg-sky-900/20"
                            onClick={() =>
                              rowIsOpen ? closeScan() : openScan(label)
                            }
                          >
                            {rowIsOpen ? "Close Scan" : "Scan"}
                          </button>

                          {url && (
                            <button
                              className="px-2 py-1 rounded border border-rose-500 text-rose-300 hover:bg-rose-900/30"
                              onClick={async () => {
                                if (!confirm("Remove uploaded file?")) return;
                                try {
                                  await removeDoc(detail._id, label);
                                  await reloadDetail();
                                  await reloadList();
                                } catch (err) {
                                  const msg = err?.message || "Remove failed";
                                  alert(`Remove failed: ${msg}`);
                                  console.error(err);
                                }
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline scan panel */}
                    {rowIsOpen && (
                      <tr>
                        <td
                          className="border border-slate-700 p-0"
                          colSpan={6}
                        >
                          <div className="p-3 bg-slate-900/60 space-y-2">
                            <div className="font-semibold text-slate-200">
                              Scan & Upload: {label}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="px-3 py-1.5 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700"
                                onClick={() => filePickerRef.current?.click()}
                              >
                                Add Page(s) from Camera / Gallery
                              </button>
                              <input
                                ref={filePickerRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  addImages(e.target.files);
                                  e.target.value = "";
                                }}
                              />
                              <button
                                className="px-3 py-1.5 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700"
                                onClick={() => setPages([])}
                              >
                                Clear Pages
                              </button>
                              <button
                                className="px-3 py-1.5 rounded border border-emerald-600 text-emerald-200 bg-emerald-900/20 hover:bg-emerald-900/30"
                                onClick={() =>
                                  createPdfAndUpload(label, refId, dateId)
                                }
                              >
                                Create PDF & Upload
                              </button>
                            </div>

                            {/* Thumbnails */}
                            <div className="flex flex-wrap gap-3">
                              {pages.length === 0 ? (
                                <div className="text-slate-400 text-sm">
                                  No pages yet. Click “Add Page(s)” to open the
                                  camera or pick from gallery.
                                </div>
                              ) : (
                                pages.map((p, i) => (
                                  <div
                                    key={i}
                                    className="relative border border-slate-700 rounded overflow-hidden"
                                  >
                                    <img
                                      src={p.data}
                                      alt={`p${i + 1}`}
                                      className="w-40 h-56 object-cover block"
                                    />
                                    <button
                                      className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-rose-800/80 rounded"
                                      onClick={() => removePage(i)}
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 text-center text-[11px] bg-black/60 py-0.5">
                                      Page {i + 1}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
