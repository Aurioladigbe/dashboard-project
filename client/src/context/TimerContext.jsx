import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

const TimerContext = createContext(null);

const TICK_MS = 1000;

/**
 * Le "Timer" du sujet.
 * Chaque widget s'enregistre avec son intervalle et une fonction de rafraîchissement ;
 * un SEUL setInterval (1 tick par seconde) décide qui doit être rafraîchi.
 * - pas de dizaines de timers indépendants à nettoyer ;
 * - rien ne se rafraîchit quand l'onglet est caché (économise l'API et le quota GitHub).
 */
export function TimerProvider({ children }) {
  const entries = useRef(new Map());

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      entries.current.forEach((entry) => {
        if (now - entry.last >= entry.intervalMs) {
          entry.last = now;
          entry.callback();
        }
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // register renvoie la fonction de désinscription (utilisable directement dans useEffect)
  const register = useCallback((key, intervalMs, callback) => {
    entries.current.set(key, { intervalMs, callback, last: Date.now() });
    return () => entries.current.delete(key);
  }, []);

  const value = useMemo(() => ({ register }), [register]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer doit être utilisé dans un <TimerProvider>");
  return ctx;
}
