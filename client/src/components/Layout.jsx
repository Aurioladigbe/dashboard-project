import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./ui/Icon";
import Logo from "./ui/Logo";

const LINK = "rounded px-3 py-1.5 text-sm font-medium text-mist hover:text-white";
const ACTIVE = "bg-ink-700 !text-white";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>

      <header className="border-b border-ink-700 bg-ink-950">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={26} />
            <span className="font-display text-2xl tracking-wide">Dashboard</span>
          </div>

          <nav aria-label="Navigation principale" className="flex gap-1">
            <NavLink to="/dashboard" className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : ""}`}>
              Mon dashboard
            </NavLink>
            <NavLink to="/services" className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : ""}`}>
              Services
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-mist sm:inline">{user?.username}</span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded border border-ink-600 px-3 py-1.5 font-medium hover:bg-ink-700"
            >
              <Icon name="logout" size={16} />
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
