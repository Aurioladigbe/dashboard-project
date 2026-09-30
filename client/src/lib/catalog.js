// Le serveur décrit QUOI configurer (services.json -> /api/services).
// Ce fichier décrit COMMENT l'afficher : libellés, couleurs, tailles, bornes.
// Tout est optionnel : un service ou widget inconnu s'affiche quand même
// (avec ses noms techniques), donc ajouter un widget côté serveur ne casse rien.

export const SERVICE_META = {
  weather: { label: "Météo", light: "#6CB8FF", text: "text-light-sky", icon: "sun", defaultRefresh: 600 },
  crypto: { label: "Crypto", light: "#FFA657", text: "text-light-ember", icon: "coin", defaultRefresh: 60 },
  github: { label: "GitHub", light: "#C58CFF", text: "text-light-orchid", icon: "branch", defaultRefresh: 300 },
  rss: { label: "Flux RSS", light: "#4FE3B0", text: "text-light-aurora", icon: "rss", defaultRefresh: 300 },
};

export function serviceMeta(name) {
  return (
    SERVICE_META[name] ?? {
      label: name,
      light: "#A3ACCF",
      text: "text-haze",
      icon: "grid",
      defaultRefresh: 60,
    }
  );
}

/** "Toutes les 10 min", "Toutes les 30 s", "Toutes les heures" */
export function formatInterval(seconds) {
  const s = Number(seconds);
  if (s >= 3600) return s === 3600 ? "Toutes les heures" : `Toutes les ${Math.round(s / 3600)} h`;
  if (s >= 60) return s === 60 ? "Toutes les minutes" : `Toutes les ${Math.round(s / 60)} min`;
  return `Toutes les ${s} s`;
}

function hostOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return String(link ?? "");
  }
}

// size = taille par défaut dans la grille (12 colonnes, lignes de 80px).
// Attention : h=2 ne laisse que ~72px de contenu, h=3 ~168px, h=4 ~264px.
// params = surcharges des bornes d'un paramètre pour CE widget
export const WIDGET_META = {
  "weather:city_temperature": {
    title: "Température",
    description: "Température actuelle d'une ville.",
    size: { w: 3, h: 3 },
    summary: (c) => c.city,
  },
  "weather:forecast": {
    title: "Prévisions",
    description: "Températures minimales et maximales des prochains jours.",
    size: { w: 3, h: 4 },
    summary: (c) => `${c.city}, ${c.days} jours`,
    params: { days: { min: 1, max: 16, initial: 5 } },
  },
  "crypto:price": {
    title: "Prix",
    description: "Prix actuel d'une cryptomonnaie.",
    size: { w: 3, h: 3 },
    summary: (c) => `${c.coin} en ${String(c.currency).toUpperCase()}`,
  },
  "crypto:price_history": {
    title: "Historique des prix",
    description: "Courbe du prix d'une cryptomonnaie sur plusieurs jours.",
    size: { w: 4, h: 4 },
    summary: (c) => `${c.coin}, ${c.days} jours`,
    params: { days: { min: 1, max: 365, initial: 7 } },
  },
  "github:recent_commits": {
    title: "Derniers commits",
    description: "Derniers commits d'un dépôt : message, auteur et date.",
    size: { w: 4, h: 4 },
    summary: (c) => c.repo,
  },
  "github:repo_list": {
    title: "Dépôts",
    description: "Dépôts publics d'un utilisateur GitHub.",
    size: { w: 4, h: 4 },
    summary: (c) => c.username,
  },
  "rss:article_list": {
    title: "Articles",
    description: "Derniers articles d'un flux RSS.",
    size: { w: 4, h: 4 },
    summary: (c) => hostOf(c.link),
  },
  "rss:feed_preview": {
    title: "Aperçu du flux",
    description: "Le dernier article d'un flux RSS, avec son résumé.",
    size: { w: 4, h: 4 },
    summary: (c) => hostOf(c.link),
  },
};

// Description affichée dans le sélecteur : notre texte, sinon celui du serveur.
export function widgetDescription(service, widgetDef) {
  return widgetMeta(service, widgetDef.name).description ?? widgetDef.description ?? "";
}

export function widgetMeta(service, type) {
  return (
    WIDGET_META[`${service}:${type}`] ?? {
      title: type,
      size: { w: 3, h: 2 },
      summary: () => "",
    }
  );
}

// Libellés et contraintes des paramètres, par nom de paramètre.
export const PARAM_META = {
  city: { label: "Ville", placeholder: "Cotonou" },
  days: { label: "Nombre de jours", min: 1, max: 16, initial: 5 },
  coin: {
    label: "Cryptomonnaie",
    placeholder: "bitcoin",
    hint: "Identifiant CoinGecko, par exemple bitcoin ou ethereum.",
  },
  currency: {
    label: "Devise",
    initial: "usd",
    options: [
      ["usd", "Dollar (USD)"],
      ["eur", "Euro (EUR)"],
      ["gbp", "Livre sterling (GBP)"],
    ],
  },
  repo: {
    label: "Dépôt",
    placeholder: "octocat/Hello-World",
    hint: "Au format propriétaire/dépôt.",
  },
  count: { label: "Nombre de commits", min: 1, max: 100, initial: 5 },
  username: { label: "Utilisateur GitHub", placeholder: "octocat" },
  sort: {
    label: "Tri",
    initial: "updated",
    options: [
      ["updated", "Dernière mise à jour"],
      ["created", "Date de création"],
      ["pushed", "Dernier push"],
      ["full_name", "Nom"],
    ],
  },
  link: {
    label: "Adresse du flux RSS",
    placeholder: "https://feeds.bbci.co.uk/news/rss.xml",
    hint: "L'adresse doit commencer par http:// ou https://.",
  },
  number: { label: "Nombre d'articles", min: 1, max: 100, initial: 5 },
};

/**
 * Construit la description d'un champ de formulaire à partir d'un paramètre
 * du catalogue serveur ({ name, type }) et du widget concerné.
 */
export function fieldFor(service, widgetName, param) {
  const base = PARAM_META[param.name] ?? {};
  const override = widgetMeta(service, widgetName).params?.[param.name] ?? {};
  const meta = { ...base, ...override };
  return {
    name: param.name,
    type: param.type === "integer" ? "integer" : "string",
    label: meta.label ?? param.name,
    placeholder: meta.placeholder,
    hint: meta.hint,
    min: meta.min,
    max: meta.max,
    options: meta.options,
    initial: meta.initial,
  };
}

export const REFRESH_OPTIONS = [
  [10, "Toutes les 10 secondes"],
  [30, "Toutes les 30 secondes"],
  [60, "Toutes les minutes"],
  [300, "Toutes les 5 minutes"],
  [900, "Toutes les 15 minutes"],
  [3600, "Toutes les heures"],
];
