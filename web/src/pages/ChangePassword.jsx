import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function ChangePassword() {
  const [search] = useSearchParams();
  const email = search.get("email") || "";
  const nav = useNavigate();

  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (newPassword !== confirm) { setErr("Passwords do not match"); return; }
    if (newPassword.length < 8) { setErr("New password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        let t = await res.text(); try { t = JSON.parse(t)?.error || t; } catch {}
        throw new Error(t);
      }
      setMsg("Password changed. Redirecting…");
      setTimeout(() => nav("/"), 800);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 text-slate-200 max-w-md">
      <h2 className="text-xl font-semibold mb-4">Set a new password</h2>
      <div className="text-slate-400 text-sm mb-3">
        {email ? <>Signed in as <span className="text-slate-200">{email}</span>.</> : null} Please enter your temp password and choose a new one.
      </div>

      {err && <div className="mb-3 text-rose-300 text-sm break-words">Error: {err}</div>}
      {msg && <div className="mb-3 text-emerald-300 text-sm">{msg}</div>}

      <form onSubmit={onSubmit} className="bg-slate-800 p-4 rounded border border-slate-700">
        <label className="block text-sm text-slate-300 mb-1">Current (temp) password</label>
        <input
          type="password"
          className="w-full p-2 rounded bg-slate-900 mb-3"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          placeholder="PSSPL@1234"
          required
        />

        <label className="block text-sm text-slate-300 mb-1">New password</label>
        <input
          type="password"
          className="w-full p-2 rounded bg-slate-900 mb-3"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <label className="block text-sm text-slate-300 mb-1">Confirm new password</label>
        <input
          type="password"
          className="w-full p-2 rounded bg-slate-900 mb-4"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={busy}
          className={`px-4 py-2 rounded ${busy ? "bg-slate-700" : "bg-emerald-600 hover:bg-emerald-500"}`}
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
