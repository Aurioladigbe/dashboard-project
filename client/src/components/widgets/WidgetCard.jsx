import { useEffect, useId, useState } from "react";
import Icon from "../ui/Icon";
import Pane from "../ui/Pane";
import ServiceGlyph from "../ui/ServiceGlyph";
import { formatInterval, serviceMeta, widgetMeta } from "../../lib/catalog";
import { formatTime } from "../../lib/format";
import { useWidgetData } from "../../hooks/useWidgetData";
import { WIDGET_VIEWS } from "./widgetViews";

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const PULSE_MS = 1400;

// Actions discrètes au repos, pleinement visibles au survol ou au clavier ;
// toujours visibles sur écran tactile (pas de survol possible).
const ACTION =
  "no-drag flex h-7 w-7 items-center justify-center rounded-md text-haze transition-colors hover:bg-white/[0.08] hover:text-frost disabled:cursor-wait";

function Skeleton() {
  return (
    <div className="space-y-3 pt-1" aria-hidden="true">
      <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/[0.07]" />
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/[0.07]" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/[0.07]" />
    </div>
  );
}

/**
 * Un widget : une vitre éclairée par la lumière de son service.
 * - la lumière pulse une fois à chaque donnée reçue, baisse pendant le chargement,
 *   vire au rouge en cas d'erreur ;
 * - l'en-tête sert de poignée pour le déplacer à la souris ; le bouton à gauche
 *   permet la même chose au clavier (flèches, Maj + flèches pour redimensionner).
 */
export default function WidgetCard({ widget, index = 0, draggable, onEdit, onDelete, onMove }) {
  const titleId = useId();
  const hintId = useId();
  const service = serviceMeta(widget.service);
  const meta = widgetMeta(widget.service, widget.type);
  const summary = meta.summary(widget.config ?? {});
  const { status, data, error, updatedAt, refresh } = useWidgetData(widget);
  const View = WIDGET_VIEWS[`${widget.service}:${widget.type}`];
  const loading = status === "loading";

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!updatedAt) return undefined;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), PULSE_MS);
    return () => clearTimeout(timer);
  }, [updatedAt]);

  const paneState = error ? "error" : loading ? "loading" : "ready";

  function onMoveKeyDown(event) {
    const arrow = ARROWS[event.key];
    if (!arrow) return;
    event.preventDefault();
    const [dx, dy] = arrow;
    onMove(widget.id, event.shiftKey ? { dw: dx, dh: dy } : { dx, dy });
  }

  return (
    <Pane
      as="article"
      aria-labelledby={titleId}
      light={service.light}
      state={paneState}
      pulse={pulse}
      index={index}
      className="h-full"
      glassClassName="group/pane"
    >
      <header className={`widget-handle px-3.5 pb-2 pt-3 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}>
        <div className="flex items-center gap-2">
          {draggable && (
            <>
              <button
                type="button"
                onKeyDown={onMoveKeyDown}
                aria-label={`Déplacer le widget ${meta.title}`}
                aria-describedby={hintId}
                className="-ml-1 flex h-7 w-5 items-center justify-center rounded text-haze/70 transition-colors hover:text-frost"
              >
                <Icon name="grip" size={16} />
              </button>
              <span id={hintId} className="sr-only">
                Flèches : déplacer. Maj et flèches : redimensionner.
              </span>
            </>
          )}

          <ServiceGlyph service={widget.service} />

          <div className="ml-auto flex items-center opacity-60 transition-opacity duration-200 focus-within:opacity-100 group-hover/pane:opacity-100 [@media(hover:none)]:opacity-100">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              aria-label={`Actualiser le widget ${meta.title}`}
              className={ACTION}
            >
              <Icon name="refresh" size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(widget)}
              aria-label={`Modifier le widget ${meta.title}`}
              className={ACTION}
            >
              <Icon name="pencil" size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(widget)}
              aria-label={`Supprimer le widget ${meta.title}`}
              className={`${ACTION} hover:!text-alert`}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>

        <div className="mt-2.5 min-w-0">
          <h3 id={titleId} className="truncate text-sm font-semibold leading-tight">
            {meta.title}
          </h3>
          <p className="truncate text-xs leading-snug text-haze">
            {summary ? `${service.label}, ${summary}` : service.label}
          </p>
        </div>
      </header>

      <div className="widget-body min-h-0 flex-1 overflow-auto px-3.5 pb-3 pt-1">
        {!data && loading && <Skeleton />}

        {error && (
          <div role="status" className="mb-3 rounded-lg border border-alert/25 bg-alert/[0.08] p-3 text-sm">
            <p className="flex items-start gap-2 text-alert">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
            <button
              type="button"
              onClick={refresh}
              className="no-drag mt-2 font-medium text-frost underline decoration-white/30 underline-offset-4 hover:decoration-white"
            >
              Réessayer
            </button>
          </div>
        )}

        {data &&
          (View ? (
            <View data={data} config={widget.config} />
          ) : (
            <p className="text-sm text-haze">Ce type de widget n'a pas encore d'affichage.</p>
          ))}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3.5 py-2 text-xs text-haze">
        <span className="truncate">
          {updatedAt ? `Mis à jour à ${formatTime(updatedAt)}` : loading ? "Chargement…" : "Pas encore de données"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: service.light }} />
          {formatInterval(widget.refreshRate)}
        </span>
      </footer>
    </Pane>
  );
}
