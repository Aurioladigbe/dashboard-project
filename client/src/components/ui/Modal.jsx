import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Boîte de dialogue accessible :
 * - role="dialog" + aria-modal + titre relié (aria-labelledby) ;
 * - le focus entre dans la boîte, reste piégé dedans (Tab), revient au bouton d'origine à la fermeture ;
 * - Échap ou clic sur le fond ferme.
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  // Le parent peut recréer onClose à chaque rendu : on le lit via une ref pour
  // que l'effet ci-dessous ne se relance pas (et ne déplace pas le focus).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog.querySelectorAll(FOCUSABLE));

    // Si un champ a déjà pris le focus (autoFocus), on n'y touche pas.
    if (!dialog.contains(document.activeElement)) {
      (focusables()[0] ?? dialog).focus();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/85 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg border border-ink-600 bg-ink-800 shadow-2xl sm:rounded-lg ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <h2 id={titleId} className="font-display text-2xl tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded p-1.5 text-mist hover:bg-ink-700 hover:text-white"
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
