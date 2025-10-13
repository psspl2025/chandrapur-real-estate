import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import { useAuth } from "../App";

export default function AdminUsers() {
  const { me } = useAuth();
  const isMaster = !!me?.isMaster;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Create form
  const [form, setForm] = useState({ email: "", name: "", role: "CLIENT", password: "" });
  const [createdTemp, setCreatedTemp] = useState(null); // show temp pw if API generated one

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/users`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setList(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(String(e.message || e));
      setList([]);
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // If you didn't provide a password, API returns { tempPassword }
      const temp = data?.tempPassword || null;
      setCreatedTemp(temp);
      if (temp) {
        try { await navigator.clipboard.writeText(temp); } catch {}
      }

      setForm({ email: "", name: "", role: "CLIENT", password: "" });
      await load();
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  async function setRole(id, newRole) {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      alert(String(e.message || e));
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
      const temp = data?.tempPassword || "";
      if (temp) {
        try { await navigator.clipboard.writeText(temp); } catch {}
        alert(`Temp password generated and copied:\n\n${temp}`);
      } else {
        alert("No temp password returned");
      }
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  if (!isMaster) return <div className="p-6">Unauthorized</div>;

  return (
    <div className="p-6 text-slate-200">
      <h2 className="text-xl font-semibold mb-4">User Management (Master)</h2>

      {/* Create user */}
      <form onSubmit={createUser} className="mb-6 grid grid-cols-12 gap-2">
        <input
          className="col-span-3 p-2 rounded bg-slate-800"
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="col-span-3 p-2 rounded bg-slate-800"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="col-span-2 p-2 rounded bg-slate-800"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="CLIENT">CLIENT (view-only)</option>
          <option value="EDITOR">EDITOR (staff)</option>
          <option value="ADMIN">ADMIN (management)</option>
        </select>
        <input
          className="col-span-3 p-2 rounded bg-slate-800"
          placeholder="(optional) Set password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="col-span-1 px-3 py-2 rounded bg-sky-600 hover:bg-sky-500">Create</button>
      </form>

      {createdTemp && createdTemp.length > 0 && (
        <div className="p-2 mb-4 bg-amber-900/30 border border-amber-700 rounded text-sm">
          Temp password generated: <span className="font-mono">{createdTemp}</span>
          <button
            className="ml-2 text-sky-300 underline"
            onClick={() => navigator.clipboard.writeText(createdTemp)}
          >
            Copy
          </button>
        </div>
      )}

      {err && <div className="mb-3 text-rose-300">Error: {err}</div>}
      <div className="text-slate-400 mb-2">{loading ? "Loading…" : `Total ${list.length}`}</div>

      {/* List + actions */}
      <div className="space-y-2">
        {list.map((u) => (
          <div key={u._id} className="p-3 bg-slate-800 rounded flex items-center justify-between">
            <div>
              <div className="font-semibold">
                {u.name || "(no name)"} <span className="text-xs text-slate-400">&lt;{u.email}&gt;</span>
              </div>
              <div className="text-xs text-slate-400">Role: {u.role} • Status: {u.status}</div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-2 py-1 rounded bg-slate-700"
                value={u.role}
                onChange={(e) => setRole(u._id, e.target.value)}
                title="Change role"
              >
                {["CLIENT", "EDITOR", "ADMIN"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                onClick={() => resetPwd(u._id)}
                title="Generate a new temporary password"
              >
                Reset PW
              </button>
            </div>
          </div>
        ))}
        {!loading && list.length === 0 && <div className="text-slate-400">No users</div>}
      </div>
    </div>
  );
}
