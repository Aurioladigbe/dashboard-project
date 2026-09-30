/**
 * Ne renvoie l'URL que si elle est en http(s).
 * Les liens des flux RSS ou des dépôts viennent de l'extérieur : sans ce filtre,
 * un flux malveillant pourrait fournir un lien "javascript:..." cliquable.
 */
export function safeUrl(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const relativeFormat = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** "il y a 3 heures", "hier", ou la date courte au-delà d'un mois. */
export function formatRelative(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (!iso || Number.isNaN(time)) return "";

  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return "à l'instant";
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86400) return relativeFormat.format(Math.round(seconds / 86400), "day");
  return shortDate.format(time);
}

/** "2026-09-28" -> "lun. 28" (date locale, sans décalage de fuseau). */
export function formatWeekday(isoDay) {
  const [y, m, d] = String(isoDay).split("-").map(Number);
  if (!y || !m || !d) return String(isoDay);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(new Date(y, m - 1, d));
}

export function formatTime(date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Montant dans une devise ; retombe sur "12 345 USD" si le code est inconnu. */
export function formatMoney(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "–";
  const digits = Math.abs(amount) < 1 ? 4 : 2;
  try {
    // narrowSymbol : "$" plutôt que "$US". L'espace fine insécable du français
    // (U+202F) n'existe pas dans toutes les polices : on la remplace par une
    // espace insécable classique, sinon "64 250" s'affiche "64250".
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: String(currency).toUpperCase(),
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(amount)
      .replace(/\u202f/g, "\u00a0");
  } catch {
    return `${amount.toLocaleString("fr-FR")} ${String(currency).toUpperCase()}`;
  }
}

/** 2.5 -> "2,50" (virgule française), pour les pourcentages. */
export function formatPercent(value, digits = 2) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
