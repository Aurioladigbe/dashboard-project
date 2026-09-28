import { useId } from "react";

// Champ de saisie avec une étiquette réservée aux lecteurs d'écran (sr-only) :
// le placeholder reste le libellé visible, l'étiquette assure l'accessibilité.
export default function TextInput({ label, id, className = "", ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded border border-ink-600 bg-ink-900 px-3 py-2.5 text-white placeholder:text-mist/70 ${className}`}
        {...props}
      />
    </div>
  );
}
