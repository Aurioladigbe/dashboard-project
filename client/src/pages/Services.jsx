import { useCallback, useEffect, useState } from "react";
import api from "../api";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Pane from "../components/ui/Pane";
import ServiceGlyph from "../components/ui/ServiceGlyph";
import { serviceMeta, widgetDescription, widgetMeta } from "../lib/catalog";

export default function Services() {
  const [catalog, setCatalog] = useState([]);
  const [subscribed, setSubscribed] = useState(new Set());
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [busy, setBusy] = useState(null); // nom du service en cours de modification
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [services, mine] = await Promise.all([api.get("/services"), api.get("/services/mine")]);
      setCatalog(services.data.services);
      setSubscribed(new Set(mine.data.subscriptions.map((s) => s.service)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(name) {
    const isSubscribed = subscribed.has(name);
    const label = serviceMeta(name).label;
    setBusy(name);
    setError("");
    try {
      // TODO (liaison OAuth GitHub, côté Dev A) : pour un service qui demande un compte,
      // l'abonnement enverra ici les identifiants / lancera le flux OAuth.
      if (isSubscribed) await api.delete(`/services/${name}/subscribe`);
      else await api.post(`/services/${name}/subscribe`, {});
      setSubscribed((current) => {
        const next = new Set(current);
        if (isSubscribed) next.delete(name);
        else next.add(name);
        return next;
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          `Impossible de ${isSubscribed ? "vous désabonner de" : "vous abonner à"} ${label}. Réessayez.`
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="type-display text-4xl sm:text-5xl">Services</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-haze">
        Les services sans compte sont disponibles tout de suite. Abonnez-vous aux autres pour utiliser leurs widgets sur
        votre dashboard.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-alert/25 bg-alert/[0.08] px-4 py-3 text-sm text-alert">
          {error}
        </p>
      )}

      {status === "loading" && (
        <p role="status" className="mt-8 text-haze">
          Chargement des services…
        </p>
      )}

      {status === "error" && (
        <div role="alert" className="mt-8 rounded-2xl border border-alert/25 bg-alert/[0.06] px-5 py-6">
          <p className="text-alert">Impossible de charger les services.</p>
          <Button variant="secondary" className="mt-4" onClick={load}>
            Réessayer
          </Button>
        </div>
      )}

      {status === "ready" && (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.map((service, index) => {
            const meta = serviceMeta(service.name);
            const isSubscribed = subscribed.has(service.name);
            const count = service.widgets.length;
            return (
              <li key={service.name}>
                <Pane light={meta.light} index={index} className="h-full" glassClassName="p-5">
                  <div className="flex items-center gap-3">
                    <ServiceGlyph service={service.name} size="lg" />
                    <div>
                      <h2 className="type-display text-xl leading-tight">{meta.label}</h2>
                      <p className="text-sm text-haze">
                        {count} widget{count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-5 flex-1 space-y-3 text-sm">
                    {service.widgets.map((widget) => (
                      <li key={widget.name}>
                        <p className="font-medium">{widgetMeta(service.name, widget.name).title}</p>
                        <p className="text-haze">{widgetDescription(service.name, widget)}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-t border-white/[0.07] pt-4">
                    {service.requiresAuth ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm">
                          <Icon name={isSubscribed ? "check" : "lock"} size={15} className={isSubscribed ? meta.text : "text-haze"} />
                          {isSubscribed ? "Abonné" : `Demande un compte ${meta.label}`}
                        </p>
                        <Button
                          variant={isSubscribed ? "secondary" : "primary"}
                          disabled={busy === service.name}
                          onClick={() => toggle(service.name)}
                          aria-label={`${isSubscribed ? "Se désabonner de" : "S'abonner à"} ${meta.label}`}
                        >
                          {isSubscribed ? "Se désabonner" : "S'abonner"}
                        </Button>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-sm">
                        <Icon name="check" size={15} className={meta.text} />
                        Disponible sans compte
                      </p>
                    )}
                  </div>
                </Pane>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
