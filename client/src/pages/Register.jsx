import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import TextInput from "../components/ui/TextInput";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { confirmed } = await register(email, username, password);
      if (confirmed) navigate("/dashboard");
      else setAwaitingConfirmation(true);
    } catch (err) {
      setError(err.response?.data?.error || "Inscription impossible");
    } finally {
      setBusy(false);
    }
  }

  // Compte créé, mais confirmation email requise avant de se connecter.
  if (awaitingConfirmation) {
    return (
      <AuthLayout
        title="Vérifiez vos emails"
        footer={
          <>
            Déjà confirmé ?{" "}
            <Link to="/login" className="font-medium text-frost underline decoration-white/30 underline-offset-4 hover:decoration-white">
              Se connecter
            </Link>
          </>
        }
      >
        <div role="status" className="flex items-start gap-3 rounded-xl border border-light-aurora/25 bg-light-aurora/[0.07] p-4">
          <Icon name="check" className="mt-0.5 shrink-0 text-light-aurora" />
          <p className="text-sm">
            Un email de confirmation a été envoyé à <strong>{email}</strong>. Ouvrez-le et cliquez sur le lien pour
            activer votre compte.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Créer un compte"
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-medium text-frost underline decoration-white/30 underline-offset-4 hover:decoration-white">
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
          <p role="alert" className="rounded-lg border border-alert/25 bg-alert/[0.08] px-3 py-2 text-sm text-alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full py-3">
          S'inscrire
        </Button>
      </form>
    </AuthLayout>
  );
}
