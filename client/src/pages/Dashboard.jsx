import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [widgets, setWidgets] = useState([]);

  useEffect(() => {
    api.get("/widgets").then((res) => setWidgets(res.data.widgets));
  }, []);

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bonjour, {user?.username}</h1>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-200">
          Se déconnecter
        </button>
      </header>

      {/* TODO (jour 5-6, Dev B): remplacer par une grille react-grid-layout
          + bouton "Ajouter un widget" (modal: type -> config -> refreshRate -> confirmer) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.length === 0 && (
          <p className="text-slate-500">Aucun widget pour l'instant. Ajoutez-en un.</p>
        )}
        {widgets.map((w) => (
          <div key={w.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{w.service} / {w.type}</p>
            <pre className="mt-2 text-xs text-slate-500">{JSON.stringify(w.config)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
