import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/**
 * Fait glisser un nombre vers sa nouvelle valeur quand une donnée est rafraîchie.
 * Au premier affichage, la valeur est donnée telle quelle : on n'anime que ce qui
 * CHANGE, pour montrer la mise à jour (pas de compteur qui part de zéro).
 */
export function useAnimatedNumber(target, duration = 700) {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const canAnimate =
      Number.isFinite(target) &&
      Number.isFinite(from) &&
      from !== target &&
      !prefersReducedMotion() &&
      typeof requestAnimationFrame === "function";

    if (!canAnimate) {
      current.current = target;
      setValue(target);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
