import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Inscription impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Créer un compte"
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-medium text-white underline underline-offset-2">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput
          label="Nom d'utilisateur"
          type="text"
          placeholder="Nom d'utilisateur"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full py-2.5">
          S'inscrire
        </Button>
      </form>
    </AuthLayout>
  );
}
