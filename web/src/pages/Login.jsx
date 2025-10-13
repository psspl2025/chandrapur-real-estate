import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e) setError(e);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let msg = await res.text();
        try { msg = JSON.parse(msg)?.error || msg; } catch {}
        throw new Error(msg || "Login failed");
      }

      const data = await res.json();

      if (data.requirePasswordChange) {
        // go to change-password screen
        const p = new URLSearchParams({ email });
        window.location.href = `/change-password?${p.toString()}`;
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError(String(err.message || "Login failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 text-slate-200 max-w-md">
      <h2 className="text-xl font-semibold mb-4">Sign in</h2>

      {error && <div className="mb-3 text-rose-300 text-sm break-words">{error}</div>}

      <form onSubmit={onSubmit} className="bg-slate-800 p-4 rounded border border-slate-700">
        <label className="block text-sm text-slate-300 mb-1">Email</label>
        <input
          type="email"
          className="w-full p-2 rounded bg-slate-900 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          required
        />

        <label className="block text-sm text-slate-300 mb-1">Password</label>
        <input
          type="password"
          className="w-full p-2 rounded bg-slate-900 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className={`px-4 py-2 rounded ${busy ? "bg-slate-700" : "bg-emerald-600 hover:bg-emerald-500"}`}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="text-xs text-slate-400 mt-3">Temp password (first login): <span className="font-mono">PSSPL@1234</span></div>
    </div>
  );
}
