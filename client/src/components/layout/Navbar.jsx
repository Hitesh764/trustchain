import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import Logo from "../common/Logo";
import { useAuth } from "../../hooks/useAuth";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${
    isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300 hover:text-brand-600"
  }`;

export default function Navbar() {
  const { isAuthenticated, role } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="text-lg font-bold">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          {/* <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink> */}
          <NavLink to="/scan" className={navLinkClass}>
            Verify a Product
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to={role === "admin" ? "/admin/dashboard" : "/dashboard"} className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary hidden sm:inline-flex">
                Manufacturer Login
              </Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
