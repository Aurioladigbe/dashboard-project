import { useId, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Modal from "../ui/Modal";
import {
  REFRESH_OPTIONS,
  fieldFor,
  serviceMeta,
  widgetDescription,
  widgetMeta,
} from "../../lib/catalog";

const INPUT =
  "w-full rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-mist/70 aria-[invalid=true]:border-danger";

function initialValues(fields, config) {
  const values = {};
  for (const field of fields) {
    values[field.name] = String(config?.[field.name] ?? field.initial ?? "");
  }
  return values;
}

function validate(fields, values) {
  const errors = {};
  for (const field of fields) {
    const raw = String(values[field.name] ?? "").trim();
    if (!raw) {
      errors[field.name] = "Ce champ est obligatoire.";
      continue;
    }
    if (field.type !== "integer") continue;

    const n = Number(raw);
    if (!Number.isInteger(n)) {
      errors[field.name] = "Saisissez un nombre entier.";
    } else if (field.min !== undefined && field.max !== undefined && (n < field.min || n > field.max)) {
      errors[field.name] = `Saisissez un nombre entre ${field.min} et ${field.max}.`;
    }
  }
  return errors;
}

function buildConfig(fields, values) {
  const config = {};
  for (const field of fields) {
    const raw = String(values[field.name]).trim();
    config[field.name] = field.type === "integer" ? Number(raw) : raw;
  }
  return config;
}

// Retrouve le service, la définition du widget et les champs du formulaire pour un choix.
function resolve(catalog, choice) {
  const serviceDef = catalog.find((s) => s.name === choice?.service);
  const widgetDef = serviceDef?.widgets.find((w) => w.name === choice?.type);
  const fields = widgetDef ? widgetDef.params.map((p) => fieldFor(serviceDef.name, widgetDef.name, p)) : [];
  return { serviceDef, widgetDef, fields };
}

function Field({ field, value, error, onChange, autoFocus }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [field.hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  const common = {
    id,
    name: field.name,
    value,
    autoFocus,
    className: INPUT,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (event) => onChange(field.name, event.target.value),
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {field.label}
      </label>
      {field.options ? (
        <select {...common}>
          {field.options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.type === "integer" ? "number" : "text"}
          min={field.min}
          max={field.max}
          step={field.type === "integer" ? 1 : undefined}
          placeholder={field.placeholder}
        />
      )}
      {field.hint && (
        <p id={hintId} className="mt-1 text-xs text-mist">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Ajoute un widget (widget = null) ou modifie sa configuration (widget = instance).
 * Le formulaire est GÉNÉRÉ depuis les params du catalogue serveur : un nouveau
 * widget côté API apparaît ici sans écrire de formulaire.
 *
 * onSubmit({ service, type, config, refreshRate }) doit renvoyer une promesse ;
 * si elle échoue, le message d'erreur du serveur s'affiche dans la boîte.
 */
export default function WidgetFormModal({ catalog, subscribed, widget = null, onSubmit, onClose }) {
  const editing = Boolean(widget);
  const [choice, setChoice] = useState(widget ? { service: widget.service, type: widget.type } : null);
  // En édition, le formulaire démarre avec la configuration actuelle du widget.
  const [values, setValues] = useState(() =>
    widget ? initialValues(resolve(catalog, widget).fields, widget.config) : {}
  );
  const [refreshRate, setRefreshRate] = useState(String(widget?.refreshRate ?? 60));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);

  const { widgetDef, fields } = resolve(catalog, choice);

  function pick(service, def) {
    setValues(initialValues(resolve(catalog, { service: service.name, type: def.name }).fields, null));
    setRefreshRate(String(serviceMeta(service.name).defaultRefresh));
    setErrors({});
    setSubmitError("");
    setChoice({ service: service.name, type: def.name });
  }

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validate(fields, values);
    setErrors(found);
    const firstInvalid = fields.find((f) => found[f.name]);
    if (firstInvalid) {
      form.elements[firstInvalid.name]?.focus();
      return;
    }

    setBusy(true);
    setSubmitError("");
    try {
      await onSubmit({
        service: choice.service,
        type: choice.type,
        config: buildConfig(fields, values),
        refreshRate: Number(refreshRate),
      });
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Impossible d'enregistrer le widget. Réessayez.");
      setBusy(false);
    }
  }

  const refreshOptions = REFRESH_OPTIONS.some(([seconds]) => String(seconds) === refreshRate)
    ? REFRESH_OPTIONS
    : [...REFRESH_OPTIONS, [Number(refreshRate), `Toutes les ${refreshRate} secondes`]];

  const title = editing ? "Modifier le widget" : choice ? "Configurer le widget" : "Ajouter un widget";

  /* ───── Étape 1 : choisir un type de widget ───── */
  if (!choice) {
    return (
      <Modal title={title} onClose={onClose} wide>
        <div className="space-y-6">
          {catalog.map((service) => {
            const meta = serviceMeta(service.name);
            const available = !service.requiresAuth || subscribed.has(service.name);
            return (
              <section key={service.name} aria-label={meta.label}>
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className={`h-3 w-3 rounded-sm ${meta.band}`} aria-hidden="true" />
                  {meta.label}
                </h3>
                {!available && (
                  <p className="mt-1 text-sm text-mist">
                    Ce service demande un abonnement.{" "}
                    <Link to="/services" className="text-white underline underline-offset-2">
                      Gérer mes services
                    </Link>
                  </p>
                )}
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {service.widgets.map((def) => (
                    <li key={def.name}>
                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => pick(service, def)}
                        className="h-full w-full rounded border border-ink-600 p-3 text-left hover:border-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-600 disabled:hover:bg-transparent"
                      >
                        <span className="block font-medium">{widgetMeta(service.name, def.name).title}</span>
                        <span className="block text-sm text-mist">{widgetDescription(service.name, def)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Modal>
    );
  }

  /* ───── Étape 2 : configurer ───── */
  if (!widgetDef) {
    return (
      <Modal title={title} onClose={onClose}>
        <p className="text-sm text-danger">Ce type de widget n'existe plus dans le catalogue du serveur.</p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  const meta = serviceMeta(choice.service);
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {!editing && (
          <button
            type="button"
            onClick={() => setChoice(null)}
            className="inline-flex items-center gap-1 rounded text-sm text-mist hover:text-white"
          >
            <Icon name="back" size={16} />
            Changer de widget
          </button>
        )}

        <div className="flex items-center gap-3">
          <span className={`h-8 w-8 shrink-0 rounded ${meta.band}`} aria-hidden="true" />
          <div>
            <p className="font-semibold">{widgetMeta(choice.service, choice.type).title}</p>
            <p className="text-sm text-mist">{meta.label}</p>
          </div>
        </div>

        {fields.map((field, index) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            onChange={setValue}
            autoFocus={index === 0}
          />
        ))}

        <div>
          <label htmlFor="widget-refresh" className="mb-1 block text-sm font-medium">
            Actualisation
          </label>
          <select
            id="widget-refresh"
            value={refreshRate}
            onChange={(event) => setRefreshRate(event.target.value)}
            className={INPUT}
            aria-describedby={choice.service === "github" ? "widget-refresh-hint" : undefined}
          >
            {refreshOptions.map(([seconds, label]) => (
              <option key={seconds} value={seconds}>
                {label}
              </option>
            ))}
          </select>
          {choice.service === "github" && (
            <p id="widget-refresh-hint" className="mt-1 text-xs text-mist">
              L'API GitHub limite le nombre de requêtes : gardez 5 minutes ou plus.
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger">
            <Icon name="alert" className="mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {editing ? "Enregistrer" : "Ajouter au dashboard"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
