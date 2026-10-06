import { NavLink, Outlet, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import Logo from "../common/Logo";
import { useAuth } from "../../hooks/useAuth";
import { truncateAddress } from "../../utils/format";

function currentPageLabel(pathname, navItems, fallback) {
  const exact = navItems.find((item) => item.to === pathname);
  if (exact) return exact.label;

  const bestMatch = navItems
    .filter((item) => pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return bestMatch?.label || fallback;
}

export default function DashboardShell({ title, navItems }) {
  const { user, role, logout } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = currentPageLabel(pathname, navItems, title);

  return (
    <div className="min-h-screen bg-brand-glow">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="glass-card sticky top-6 hidden h-fit w-56 shrink-0 flex-col gap-1 p-3 md:flex">
          <p className="px-3 pb-2 pt-1 text-lg font-bold">
            <Logo />
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                    : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="mt-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-danger-600 hover:bg-danger-50 dark:text-danger-300 dark:hover:bg-danger-500/10"
          >
            Logout
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 md:hidden">
            <p className="text-sm font-semibold">
              <Logo />
            </p>
            <nav className="flex gap-3 overflow-x-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `whitespace-nowrap text-xs font-medium ${
                      isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button onClick={logout} className="text-xs font-medium text-danger-600 dark:text-danger-300">
              Logout
            </button>
          </div>

          <div className="glass-card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {role === "admin" ? user?.name : user?.companyName}
                {role === "manufacturer" && user?.walletAddress ? ` · ${truncateAddress(user.walletAddress)}` : ""}
              </p>
            </div>
            <ThemeToggle />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
