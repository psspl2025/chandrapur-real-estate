import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../App";
import { useState } from "react";

function LinkItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        [
          "block rounded px-3 py-2 text-sm",
          isActive ? "bg-slate-700/70 text-white" : "text-slate-200 hover:bg-slate-700/40",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

function TopRightAuth() {
  const { me, role = "PUBLIC", logout } = useAuth();
  return (
    <div className="flex items-center gap-2 min-w-0">{/* min-w-0 ensures truncation works */}
      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700/70">
        {role.toUpperCase()}
      </span>
      {me ? (
        <>
          <span
            className="text-xs text-slate-300 truncate max-w-[40vw]"
            title={me.email || me.name}
          >
            {me.name || me.email}
          </span>
          <button
            onClick={logout}
            className="ml-1 text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
          >
            Logout
          </button>
        </>
      ) : (
        <Link to="/login" className="ml-1 text-xs px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500">
          Login
        </Link>
      )}
    </div>
  );
}

export default function Layout() {
  const { me, role = "PUBLIC" } = useAuth();
  const isAdmin = role === "ADMIN";
  const isStaff = role === "EDITOR" || isAdmin;
  const isMaster = !!me?.isMaster;

  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded p-2 bg-slate-800 hover:bg-slate-700"
          >
            <div className="w-5 h-0.5 bg-slate-200 mb-1" />
            <div className="w-5 h-0.5 bg-slate-200 mb-1" />
            <div className="w-5 h-0.5 bg-slate-200" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8" />
          </div>
          <TopRightAuth />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="bg-slate-900 border-t border-slate-800 px-3 pb-3">
            <nav className="space-y-1 pt-2">
              <LinkItem to="/" label="Properties" onClick={closeMobile} />
              {isStaff && (
                <>
                  <LinkItem to="/projects" label="Projects" onClick={closeMobile} />
                  <LinkItem to="/pois" label="POIs" onClick={closeMobile} />
                  <LinkItem to="/import" label="Import Properties" onClick={closeMobile} />
                </>
              )}
              {isMaster && <LinkItem to="/admin/users" label="Users" onClick={closeMobile} />}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 bg-slate-900 border-r border-slate-800 p-4 flex-col">
        <div className="mb-3 rounded-md bg-white/95 p-2 shadow-sm">
          <div className="w-full aspect-[3/1]">
            <img src="/logo.png" alt="Company logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="mb-3">
          <div className="font-semibold text-[16px] leading-snug">Pawanssiddhi Group of Companies</div>
          <div className="text-slate-300 text-xs">Chandrapur, Maharashtra (India)</div>
        </div>

        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-600/15 px-3 py-2">
            <span className="uppercase tracking-wide text-[11px] text-sky-300 font-semibold">
              Chandrapur Real Estate
            </span>
          </div>
        </div>

        <div className="mb-3">
          <TopRightAuth />
        </div>

        <nav className="space-y-1">
          <LinkItem to="/" label="Properties" />
          {isStaff && (
            <>
              <LinkItem to="/projects" label="Projects" />
              <LinkItem to="/pois" label="POIs" />
              <div className="mb-2">
                <div className="px-2 py-1 text-slate-300 text-sm">Bulk Import</div>
                <div className="ml-2 space-y-1">
                  <LinkItem to="/import" label="Import Properties" />
                </div>
              </div>
            </>
          )}
          {isMaster && (
            <div className="mb-2">
              <div className="px-2 py-1 text-slate-300 text-sm">Admin</div>
              <div className="ml-2 space-y-1">
                <LinkItem to="/admin/users" label="Users" />
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 text-[11px] text-slate-500">© {new Date().getFullYear()} Pawanssiddhi Group</div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
