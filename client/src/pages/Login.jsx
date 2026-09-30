import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    </AuthLayout>
  );
}
