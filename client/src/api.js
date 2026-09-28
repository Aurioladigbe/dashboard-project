import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Session expirée (401) : on oublie le token et on renvoie vers la connexion.
// Sans ça, chaque widget afficherait une erreur à chaque rafraîchissement.
// La route de connexion est exclue : un 401 y signifie "identifiants invalides".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url?.startsWith("/auth/login");
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
