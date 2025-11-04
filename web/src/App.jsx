import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import React, { createContext, useContext, useEffect, useState } from "react";

import Layout from "./components/Layout";
import Properties from "./pages/Properties";
import Projects from "./pages/Projects";
import POIs from "./pages/POIs";
import ImportPage from "./pages/Import";
import PropertyDetail from "./pages/PropertyDetail";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import { API_BASE } from "./config";

/* ================== Auth Context ================== */
const AuthCtx = createContext({
  role: "PUBLIC",
  me: null,
  loading: true,
  refreshMe: () => {},
  logout: async () => {},
});
export function useAuth() {
  return useContext(AuthCtx);
}

function AuthProvider({ children }) {
  const [role, setRole] = useState("PUBLIC");
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const res = await fetch(`${API_BASE}/auth/me?ts=${ts}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMe(data || null);
        setRole(data?.role || "PUBLIC");
      } else {
        setMe(null);
        setRole("PUBLIC");
      }
    } catch {
      setMe(null);
      setRole("PUBLIC");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    setMe(null);
    setRole("PUBLIC");
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const value = { role, me, loading, refreshMe, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/* ================== Route Guards ================== */
function ProtectedRoute({ allowed = ["EDITOR", "ADMIN"], children }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (allowed.includes(role)) return children;
  return <Navigate to="/unauthorized" replace />;
}

function MasterRoute({ children }) {
  const { me, loading } = useAuth();
  if (loading) return null;
  if (me?.isMaster) return children;
  return <Navigate to="/unauthorized" replace />;
}

/* =========== Google Drive OAuth exchange pages =========== */
function GDriveCallback() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  useEffect(() => {
    const hashQ = window.location.hash.split("?")[1] || "";
    const params = new URLSearchParams(hashQ);
    const token = params.get("token");
    if (!token) {
      navigate("/properties?gdrive_error=missing_token", { replace: true });
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/auth/finalize`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!resp.ok) throw new Error("finalize_failed");
        await refreshMe();
        navigate("/gdrive-connected", { replace: true });
      } catch {
        navigate("/properties?gdrive_error=exchange_failed", { replace: true });
      }
    })();
  }, [navigate, refreshMe]);
  return <div className="p-8 text-center text-slate-200">Finishing Google Drive connection…</div>;
}
function GDriveConnected() {
  return (
    <div className="p-6 text-slate-200">
      <h2 className="text-xl font-semibold mb-2">✅ Google Drive Connected</h2>
      <p className="text-slate-400 mb-4">Your Google Drive is linked.</p>
      <a href="/import" className="text-sky-400 hover:underline">Go to Import</a>
      <span className="mx-2 text-slate-500">|</span>
      <a href="/projects" className="text-sky-400 hover:underline">Go to Projects</a>
    </div>
  );
}

/* ================== Utility pages ================== */
function Unauthorized() {
  return (
    <div className="p-6 text-slate-200">
      <h2 className="text-xl font-semibold mb-2">Unauthorized</h2>
      <p className="text-slate-400 mb-4">You don’t have access to this page.</p>
      <a href="/" className="text-sky-400 hover:underline">Go to Properties</a>
    </div>
  );
}
function NotFound() {
  return (
    <div className="p-6 text-slate-200">
      <h2 className="text-xl font-semibold mb-2">Page not found</h2>
      <a href="/" className="text-sky-400 hover:underline">Back to Home</a>
    </div>
  );
}

/* ================== App Router ================== */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* PUBLIC */}
            <Route index element={<Properties />} />
            <Route path="property/:id" element={<PropertyDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="change-password" element={<ChangePassword />} />

            {/* Google Drive */}
            <Route path="gdrive-callback" element={<GDriveCallback />} />
            <Route path="gdrive-connected" element={<GDriveConnected />} />

            {/* EDITOR/ADMIN */}
            <Route
              path="projects"
              element={
                <ProtectedRoute allowed={["EDITOR", "ADMIN"]}>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="pois"
              element={
                <ProtectedRoute allowed={["EDITOR", "ADMIN"]}>
                  <POIs />
                </ProtectedRoute>
              }
            />
            <Route
              path="import"
              element={
                <ProtectedRoute allowed={["EDITOR", "ADMIN"]}>
                  <ImportPage />
                </ProtectedRoute>
              }
            />

            {/* MASTER-only */}
            <Route
              path="admin/users"
              element={
                <MasterRoute>
                  <AdminUsers />
                </MasterRoute>
              }
            />

            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
