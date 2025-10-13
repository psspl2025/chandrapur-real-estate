// web/src/components/projects/RowActionMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { API_BASE } from "../../config";

export default function RowActionsMenu({ open, onOpen, onClose, onView, projectId }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  const excelOne = `${API_BASE}/projects/export.xlsx?q=${encodeURIComponent(projectId)}`;

  return (
    <div ref={ref} className="relative">
      <button className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600" onClick={open ? onClose : onOpen}>⋮</button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded shadow-lg text-sm z-20">
          <button onClick={onView} className="block w-full text-left px-3 py-2 hover:bg-slate-800">View</button>
          <a href="#" onClick={(e)=>{e.preventDefault(); onView();}} className="block px-3 py-2 hover:bg-slate-800">Edit</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); onView();}} className="block px-3 py-2 hover:bg-slate-800">Documents</a>
          <a className="block px-3 py-2 hover:bg-slate-800" href={excelOne}>Export (Excel)</a>
          <button className="block w-full text-left px-3 py-2 hover:bg-rose-900/40 text-rose-300">Delete</button>
        </div>
      )}
    </div>
  );
}
