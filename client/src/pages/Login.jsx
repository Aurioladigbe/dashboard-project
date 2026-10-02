import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(err);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const githubAuthUrl = `${apiUrl}/api/auth/github`;

  return (
    <AuthLayout
      title="Connexion"
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-medium text-frost underline decoration-white/30 underline-offset-4 hover:decoration-white">
            S'inscrire
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <a
          href={githubAuthUrl}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          Continuer avec GitHub
        </a>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-white/10" />
          <span className="bg-[#0b0f17] px-3 text-xs uppercase tracking-wider text-slate-400">
            ou
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextInput
            label="Mot de passe"
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p role="alert" className="rounded-lg border border-alert/25 bg-alert/[0.08] px-3 py-2 text-sm text-alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full py-3">
            Se connecter
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
