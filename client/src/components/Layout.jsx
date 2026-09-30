import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./ui/Icon";
import Logo from "./ui/Logo";

const NAV = [
  { to: "/dashboard", icon: "grid", label: "Mon dashboard" },
  { to: "/services", icon: "layers", label: "Services" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={24} />
      <span className="type-display text-lg">Dashboard</span>
    </div>
  );
}

function navClass({ isActive }) {
  return `flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-white/[0.08] text-frost shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-haze hover:bg-white/[0.04] hover:text-frost"
  }`;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const initial = String(user?.username ?? "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>

      {/* Grand écran : panneau latéral en verre */}
      <aside className="glass-chrome fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>

        <nav aria-label="Navigation principale" className="mt-10 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-light-sky to-light-orchid text-sm font-semibold text-night"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{user?.username}</span>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-haze transition-colors hover:bg-white/[0.08] hover:text-frost"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      {/* Petit écran : barre en haut */}
      <header className="glass-chrome sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 lg:hidden">
        <Brand />
        <nav aria-label="Navigation principale" className="ml-auto flex gap-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass} aria-label={item.label}>
              <Icon name={item.icon} size={17} />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={logout}
          aria-label="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-haze transition-colors hover:bg-white/[0.08] hover:text-frost"
        >
          <Icon name="logout" size={17} />
        </button>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
