import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("token", urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = urlToken || localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  }

  // Le serveur renvoie un token même si le compte n'est pas encore confirmé
  // (selon l'état de la confirmation email côté backend) : on ne connecte
  // l'utilisateur QUE si son compte est déjà confirmé. Sinon on garde le
  // token de côté sans l'utiliser : register() renvoie { confirmed } pour
  // que la page Register affiche l'écran adapté, sans deviner la logique ici.
  async function register(email, username, password) {
    const res = await api.post("/auth/register", { email, username, password });
    const confirmed = res.data.user.confirmed !== false;
    if (confirmed) {
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
    }
    return { confirmed };
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
