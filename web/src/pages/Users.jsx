import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import { toast } from "../components/useToast.js";

export default function Users() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // server expects: { name, email, role, password? }
  const [form, setForm] = useState({ name: "", email: "", role: "CLIENT", password: "" });
  const [createdTemp, setCreatedTemp] = useState(null); // show/copy temp password once

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/users`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast("User created");
      setForm({ name: "", email: "", role: "CLIENT", password: "" });
      setCreatedTemp(data.tempPassword || "");
      await load();
    } catch (e) {
      toast("Create failed");
      console.error(e);
    }
  }

  async function updateRole(id, role) {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Role updated");
      load();
    } catch (e) {
      toast("Update failed");
      console.error(e);
    }
  }

  async function toggleStatus(id, status) {
    const next = status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Status updated");
      load();
    } catch (e) {
      toast("Update failed");
      console.error(e);
    }
  }

  async function resetPwd(id) {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const temp = data.tempPassword || "";
      if (temp) {
        await navigator.clipboard.writeText(temp);
        toast("Temp password copied");
      } else {
        toast("No temp password returned");
      }
    } catch (e) {
      toast("Reset failed");
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>

      {/* Create */}
      <form onSubmit={createUser} className="grid grid-cols-12 gap-2 bg-slate-800 p-3 rounded">
        <input
          className="col-span-3 p-2 rounded bg-slate-900"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <input
          className="col-span-3 p-2 rounded bg-slate-900"
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <select
          className="col-span-2 p-2 rounded bg-slate-900"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        >
          <option value="CLIENT">CLIENT (view-only)</option>
          <option value="EDITOR">EDITOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input
          className="col-span-3 p-2 rounded bg-slate-900"
          placeholder="(optional) Set password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <button className="col-span-1 px-3 py-2 rounded bg-sky-600 hover:bg-sky-500">Create</button>
      </form>

      {createdTemp && createdTemp.length > 0 && (
        <div className="p-2 bg-amber-900/30 border border-amber-700 rounded text-sm">
          Temp password (copy & share): <span className="font-mono">{createdTemp}</span>
          <button
            className="ml-2 text-sky-300 underline"
            onClick={() => { navigator.clipboard.writeText(createdTemp); toast("Copied"); }}
          >
            Copy
          </button>
        </div>
      )}

      {/* List */}
      {err && <div className="text-rose-400 text-sm">Error: {err}</div>}
      <div className="bg-slate-800 rounded">
        <div className="grid grid-cols-12 gap-2 p-2 border-b border-slate-700 text-slate-300 text-xs">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>
        {loading ? (
          <div className="p-3 text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-3 text-slate-400">No users</div>
        ) : (
          items.map((u) => (
            <div key={u._id} className="grid grid-cols-12 gap-2 p-2 border-b border-slate-800">
              <div className="col-span-3">{u.name || "—"}</div>
              <div className="col-span-3">{u.email}</div>
              <div className="col-span-2">
                <select
                  className="bg-slate-900 p-1 rounded"
                  value={u.role}
                  onChange={(e) => updateRole(u._id, e.target.value)}
                >
                  {["CLIENT", "EDITOR", "ADMIN"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <button
                  className={`px-2 py-1 rounded ${u.status === "ACTIVE" ? "bg-emerald-700" : "bg-slate-700"}`}
                  onClick={() => toggleStatus(u._id, u.status)}
                  title="Toggle active/disabled"
                >
                  {u.status}
                </button>
              </div>
              <div className="col-span-2 flex gap-2">
                <button
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                  onClick={() => resetPwd(u._id)}
                >
                  Reset PW
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
