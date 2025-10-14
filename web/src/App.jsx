// web/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
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

  useEffect(() => { refreshMe(); }, []);

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

            {/* MASTER-only user management */}
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
