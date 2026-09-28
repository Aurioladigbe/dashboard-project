import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Logo from "../components/ui/Logo";
import Modal from "../components/ui/Modal";
import WidgetCard from "../components/widgets/WidgetCard";
import WidgetFormModal from "../components/widgets/WidgetFormModal";
import { widgetMeta } from "../lib/catalog";
import { clamp } from "../lib/format";

// Grille de 12 colonnes sur grand écran (positions enregistrées en base),
// une seule colonne empilée en dessous de 900 px (non modifiable).
const WIDE_MIN_WIDTH = 900;
const BREAKPOINTS = { lg: WIDE_MIN_WIDTH, sm: 0 };
const COLS = { lg: 12, sm: 1 };
const FALLBACK_WIDTH = 1280; // environnement sans mesure possible (tests)

function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => setWidth(element.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width || FALLBACK_WIDTH];
}

function ConfirmDelete({ widget, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const meta = widgetMeta(widget.service, widget.type);
  return (
    <Modal title="Supprimer ce widget ?" onClose={onCancel}>
      <p className="text-mist">
        Le widget « {meta.title} » sera retiré de votre dashboard. Vous pourrez toujours le recréer.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onConfirm();
          }}
        >
          Supprimer
        </Button>
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [subscribed, setSubscribed] = useState(new Set());
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [modal, setModal] = useState(null); // { mode: "add" | "edit" | "delete", widget? }
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [containerRef, width] = useContainerWidth();

  const wide = width >= WIDE_MIN_WIDTH;
  const wideRef = useRef(wide);
  wideRef.current = wide;
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [mine, services, subscriptions] = await Promise.all([
        api.get("/widgets"),
        api.get("/services"),
        api.get("/services/mine"),
      ]);
      setWidgets(mine.data.widgets);
      setCatalog(services.data.services);
      setSubscribed(new Set(subscriptions.data.subscriptions.map((s) => s.service)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ───── Positions : une seule fonction enregistre tout changement de disposition ───── */

  const commitPositions = useCallback((positions) => {
    const changed = [];
    const merged = widgetsRef.current.map((widget) => {
      const p = positions.find((item) => item.id === widget.id);
      if (!p || (p.x === widget.x && p.y === widget.y && p.w === widget.w && p.h === widget.h)) return widget;
      changed.push(p);
      return { ...widget, x: p.x, y: p.y, w: p.w, h: p.h };
    });
    if (changed.length === 0) return;

    widgetsRef.current = merged;
    setWidgets(merged);
    Promise.all(
      changed.map((p) => api.patch(`/widgets/${p.id}`, { x: p.x, y: p.y, w: p.w, h: p.h }))
    ).catch(() => setNotice("La nouvelle disposition n'a pas pu être enregistrée."));
  }, []);

  // Appelé par la grille après un glisser, un redimensionnement ou un tassement
  // (par exemple quand un widget est supprimé). Ignoré en mode empilé : ces
  // positions-là ne sont pas celles du grand écran.
  const onLayoutChange = useCallback(
    (layout) => {
      if (!wideRef.current) return;
      commitPositions(layout.map((l) => ({ id: Number(l.i), x: l.x, y: l.y, w: l.w, h: l.h })));
    },
    [commitPositions]
  );

  // Même chose au clavier : flèches pour déplacer, Maj + flèches pour redimensionner.
  const moveWidget = useCallback(
    (id, { dx = 0, dy = 0, dw = 0, dh = 0 }) => {
      const widget = widgetsRef.current.find((item) => item.id === id);
      if (!widget) return;
      const w = clamp(widget.w + dw, 2, COLS.lg);
      const h = clamp(widget.h + dh, 2, 12);
      const x = clamp(widget.x + dx, 0, COLS.lg - w);
      const y = Math.max(0, widget.y + dy);
      commitPositions([{ id, x, y, w, h }]);

      const title = widgetMeta(widget.service, widget.type).title;
      setAnnouncement(dw || dh ? `${title} : ${w} colonnes sur ${h} lignes.` : `${title} déplacé.`);
    },
    [commitPositions]
  );

  const layouts = useMemo(
    () => ({
      lg: widgets.map((w) => ({ i: String(w.id), x: w.x, y: w.y, w: w.w, h: w.h, minW: 2, minH: 2 })),
    }),
    [widgets]
  );

  /* ───── Ajouter / modifier / supprimer ───── */

  async function addWidget(payload) {
    const size = widgetMeta(payload.service, payload.type).size;
    const bottom = widgetsRef.current.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    const res = await api.post("/widgets", { ...payload, x: 0, y: bottom, w: size.w, h: size.h });
    setWidgets((current) => [...current, res.data.widget]);
    setModal(null);
    setAnnouncement("Widget ajouté au dashboard.");
  }

  async function editWidget(widget, payload) {
    const res = await api.patch(`/widgets/${widget.id}`, {
      config: payload.config,
      refreshRate: payload.refreshRate,
    });
    setWidgets((current) => current.map((w) => (w.id === widget.id ? res.data.widget : w)));
    setModal(null);
    setAnnouncement("Widget modifié.");
  }

  async function deleteWidget(widget) {
    try {
      await api.delete(`/widgets/${widget.id}`);
      setWidgets((current) => current.filter((w) => w.id !== widget.id));
      setAnnouncement("Widget supprimé.");
    } catch {
      setNotice("Le widget n'a pas pu être supprimé. Réessayez.");
    }
    setModal(null);
  }

  const count = widgets.length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Bonjour, {user?.username}</h1>
          {status === "ready" && count > 0 && (
            <p className="mt-1 text-mist">
              {count} widget{count > 1 ? "s" : ""} sur votre dashboard
              {!wide && ". La disposition se modifie sur un écran plus large."}
            </p>
          )}
        </div>
        <Button onClick={() => setModal({ mode: "add" })} disabled={status !== "ready"}>
          <Icon name="plus" />
          Ajouter un widget
        </Button>
      </div>

      {notice && (
        <p
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded border border-danger/50 px-4 py-3 text-sm text-danger"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Fermer le message" className="rounded p-0.5">
            <Icon name="x" size={16} />
          </button>
        </p>
      )}

      {/* Annonces pour les lecteurs d'écran (déplacement, ajout, suppression) */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div ref={containerRef}>
        {status === "loading" && (
          <p role="status" className="text-mist">
            Chargement de votre dashboard…
          </p>
        )}

        {status === "error" && (
          <div role="alert" className="rounded border border-danger/50 px-4 py-6">
            <p className="text-danger">Impossible de charger votre dashboard. Vérifiez votre connexion.</p>
            <Button variant="secondary" className="mt-4" onClick={load}>
              Réessayer
            </Button>
          </div>
        )}

        {status === "ready" && count === 0 && (
          <div className="rounded-lg border-2 border-dashed border-ink-600 px-6 py-16 text-center">
            <Logo size={64} className="mx-auto mb-4" />
            <p className="font-display text-3xl tracking-wide">Votre dashboard est vide</p>
            <p className="mx-auto mt-2 max-w-md text-mist">
              Ajoutez un premier widget : la météo de votre ville, le prix du bitcoin, les derniers articles d'un
              flux…
            </p>
            <Button className="mt-6" onClick={() => setModal({ mode: "add" })}>
              <Icon name="plus" />
              Ajouter un widget
            </Button>
          </div>
        )}

        {status === "ready" && count > 0 && (
          <Responsive
            width={width}
            layouts={layouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={80}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            draggableHandle=".widget-handle"
            draggableCancel=".no-drag"
            isDraggable={wide}
            isResizable={wide}
            onLayoutChange={onLayoutChange}
          >
            {widgets.map((widget) => (
              <div key={widget.id}>
                <WidgetCard
                  widget={widget}
                  draggable={wide}
                  onMove={moveWidget}
                  onEdit={(w) => setModal({ mode: "edit", widget: w })}
                  onDelete={(w) => setModal({ mode: "delete", widget: w })}
                />
              </div>
            ))}
          </Responsive>
        )}
      </div>

      {modal?.mode === "add" && (
        <WidgetFormModal catalog={catalog} subscribed={subscribed} onSubmit={addWidget} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <WidgetFormModal
          catalog={catalog}
          subscribed={subscribed}
          widget={modal.widget}
          onSubmit={(payload) => editWidget(modal.widget, payload)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "delete" && (
        <ConfirmDelete widget={modal.widget} onCancel={() => setModal(null)} onConfirm={() => deleteWidget(modal.widget)} />
      )}
    </div>
  );
}
