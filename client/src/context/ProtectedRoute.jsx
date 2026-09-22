import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-slate-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
