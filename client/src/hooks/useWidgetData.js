import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { useTimer } from "../context/TimerContext";

const EMPTY = { status: "loading", data: null, error: "", updatedAt: null };

/**
 * Charge GET /api/widgets/:id/data et le rafraîchit selon widget.refreshRate.
 * - la config change (widget modifié) -> les anciennes données sont jetées ;
 * - en cas d'échec d'un rafraîchissement, les dernières données restent affichées.
 */
export function useWidgetData(widget) {
  const { register } = useTimer();
  const [state, setState] = useState(EMPTY);
  const latest = useRef(0);
  const configKey = JSON.stringify(widget.config);

  const refresh = useCallback(async () => {
    const request = ++latest.current;
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await api.get(`/widgets/${widget.id}/data`);
      if (request !== latest.current) return; // réponse périmée
      setState({ status: "ready", data: res.data.data, error: "", updatedAt: new Date() });
    } catch (err) {
      if (request !== latest.current) return;
      const error = err.response?.data?.error || "Impossible de récupérer les données.";
      setState((s) => ({ ...s, status: "error", error }));
    }
  }, [widget.id, configKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setState(EMPTY);
    refresh();
    return () => {
      latest.current++; // ignore une réponse qui arriverait après le démontage / la reconfiguration
    };
  }, [refresh]);

  useEffect(
    () => register(widget.id, widget.refreshRate * 1000, refresh),
    [register, widget.id, widget.refreshRate, refresh]
  );

  return { ...state, refresh };
}
