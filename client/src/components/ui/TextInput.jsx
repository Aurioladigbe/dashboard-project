import { useId } from "react";

// Étiquette réservée aux lecteurs d'écran : le placeholder sert de libellé visible.
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
        className={`w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-frost placeholder:text-haze transition-colors hover:border-white/20 focus:border-iris/60 ${className}`}
        {...props}
      />
    </div>
  );
}
