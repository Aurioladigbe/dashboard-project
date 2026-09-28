import { useId } from "react";
import Icon from "../ui/Icon";
import { serviceMeta, widgetMeta } from "../../lib/catalog";
import { formatTime } from "../../lib/format";
import { useWidgetData } from "../../hooks/useWidgetData";
import { WIDGET_VIEWS } from "./widgetViews";

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-4 w-2/3 animate-pulse rounded bg-ink-700" />
      <div className="h-4 w-full animate-pulse rounded bg-ink-700" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-ink-700" />
    </div>
  );
}

const ACTION =
  "no-drag rounded p-1.5 hover:bg-ink-950/15 disabled:cursor-wait";

/**
 * Un widget sur le dashboard.
 * - la bande colorée est la poignée de déplacement à la souris ;
 * - le bouton "Déplacer" permet la même chose au clavier (flèches, Maj + flèches pour redimensionner).
 */
export default function WidgetCard({ widget, draggable, onEdit, onDelete, onMove }) {
  const titleId = useId();
  const hintId = useId();
  const service = serviceMeta(widget.service);
  const meta = widgetMeta(widget.service, widget.type);
  const summary = meta.summary(widget.config ?? {});
  const { status, data, error, updatedAt, refresh } = useWidgetData(widget);
  const View = WIDGET_VIEWS[`${widget.service}:${widget.type}`];
  const loading = status === "loading";

  function onMoveKeyDown(event) {
    const arrow = ARROWS[event.key];
    if (!arrow) return;
    event.preventDefault();
    const [dx, dy] = arrow;
    onMove(widget.id, event.shiftKey ? { dw: dx, dh: dy } : { dx, dy });
  }

  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col overflow-hidden rounded-md border border-ink-700 bg-ink-800"
    >
      <header
        className={`widget-handle flex items-center gap-1 px-2 py-2 text-ink-950 ${service.band} ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {draggable && (
          <>
            <button
              type="button"
              onKeyDown={onMoveKeyDown}
              aria-label={`Déplacer le widget ${meta.title}`}
              aria-describedby={hintId}
              className="rounded p-1.5 hover:bg-ink-950/15"
            >
              <Icon name="move" />
            </button>
            <span id={hintId} className="sr-only">
              Flèches : déplacer. Maj et flèches : redimensionner.
            </span>
          </>
        )}

        <div className="min-w-0 flex-1 px-1">
          <h3 id={titleId} className="truncate text-sm font-semibold leading-tight">
            {meta.title}
          </h3>
          <p className="truncate text-xs leading-tight">
            {summary ? `${service.label}, ${summary}` : service.label}
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label={`Actualiser le widget ${meta.title}`}
          className={ACTION}
        >
          <Icon name="refresh" className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
        </button>
        <button type="button" onClick={() => onEdit(widget)} aria-label={`Modifier le widget ${meta.title}`} className={ACTION}>
          <Icon name="pencil" />
        </button>
        <button type="button" onClick={() => onDelete(widget)} aria-label={`Supprimer le widget ${meta.title}`} className={ACTION}>
          <Icon name="trash" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {!data && loading && <Skeleton />}

        {error && (
          <div role="status" className="mb-3 space-y-2 text-sm">
            <p className="flex items-start gap-2 text-danger">
              <Icon name="alert" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
            <button type="button" onClick={refresh} className="no-drag font-medium underline underline-offset-2">
              Réessayer
            </button>
          </div>
        )}

        {data &&
          (View ? (
            <View data={data} config={widget.config} />
          ) : (
            <p className="text-sm text-mist">Ce type de widget n'a pas encore d'affichage.</p>
          ))}
      </div>

      <footer className="border-t border-ink-700 px-3 py-1.5 text-xs text-mist">
        {updatedAt ? `Mis à jour à ${formatTime(updatedAt)}` : loading ? "Chargement…" : "Pas encore de données"}
      </footer>
    </article>
  );
}
