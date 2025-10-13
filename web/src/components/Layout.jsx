import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../App";

function LinkItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end
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

export default function Layout() {
  const { me, role = "PUBLIC", logout } = useAuth();
  const isAdmin = role === "ADMIN";
  const isStaff = role === "EDITOR" || isAdmin;
  const isMaster = !!me?.isMaster;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col">
        {/* Logo */}
        <div className="mb-3 rounded-md bg-white/95 p-2 shadow-sm">
          <div className="w-full aspect-[3/1]">
            <img src="/logo.png" alt="Company logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Company info */}
        <div className="mb-3">
          <div className="font-semibold text-[16px] leading-snug">Pawanssiddhi Group of Companies</div>
          <div className="text-slate-300 text-xs">Chandrapur, Maharashtra (India)</div>
        </div>

        {/* Sub-brand */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-600/15 px-3 py-2">
            <span className="uppercase tracking-wide text-[11px] text-sky-300 font-semibold">
              Chandrapur Real Estate
            </span>
          </div>
        </div>

        {/* Auth */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700/70">
              {role.toUpperCase()}
            </span>

            {me ? (
              <>
                <span className="text-xs text-slate-300 truncate" title={me.email || me.name}>
                  {me.name || me.email}
                </span>
                <button
                  onClick={logout}
                  className="ml-auto text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="ml-auto text-xs px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500">
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <LinkItem to="/" label="Properties" />

          {/* Staff/Admin tools */}
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

          {/* Master-only Admin section */}
          {isMaster && (
            <div className="mb-2">
              <div className="px-2 py-1 text-slate-300 text-sm">Admin</div>
              <div className="ml-2 space-y-1">
                <LinkItem to="/admin/users" label="Users" />
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 text-[11px] text-slate-500">
          © {new Date().getFullYear()} Pawanssiddhi Group
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
