import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Garde de route pour protéger les pages réservées aux administrateurs.
 * Redirige vers /dashboard si l'utilisateur n'a pas le rôle ADMIN.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-haze">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  return children;
}
