import Parser from "rss-parser";
import { sharedCache } from "./cacheService.js";

const parser = new Parser({
  timeout: 8000,
});

const MAX_SUMMARY_LENGTH = 250;

function createServiceError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Rejette les URLs pointant vers localhost, 127.0.0.1, ::1,
 * les plages IP privées (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16),
 * et les noms d'hôtes internes Docker (db, server, client).
 * @param {string|URL} inputUrl
 * @returns {boolean} true si l'URL est privée ou locale (à bloquer)
 */
export function isPrivateOrLocalUrl(inputUrl) {
  let parsed;
  try {
    parsed = inputUrl instanceof URL ? inputUrl : new URL(inputUrl);
  } catch {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Hostnames locaux et services internes Docker
  const blockedHosts = new Set(["localhost", "db", "server", "client"]);
  if (
    blockedHosts.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }

  // IPv6 loopback / local
  if (
    hostname === "::1" ||
    hostname === "::" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd")
  ) {
    return true;
  }

  // IPv4 validation (plages privées & réservées)
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr, cStr, dStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    const c = Number(cStr);
    const d = Number(dStr);

    if ([a, b, c, d].some((octet) => octet < 0 || octet > 255)) {
      return true;
    }

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 (Loopback)
    if (a === 10) return true; // 10.0.0.0/8 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (Private)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 (Private)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local & cloud metadata)
  }

  return false;
}

function validateFeedUrl(feedUrl) {
  if (!feedUrl || typeof feedUrl !== "string" || !feedUrl.trim()) {
    throw createServiceError("Le paramètre link (URL du flux RSS) est requis", 400);
  }

  let parsed;
  try {
    parsed = new URL(feedUrl.trim());
  } catch {
    throw createServiceError(
      `URL de flux RSS invalide : "${feedUrl}"`,
      400
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw createServiceError(
      "L'URL du flux RSS doit utiliser le protocole http ou https",
      400
    );
  }

  if (isPrivateOrLocalUrl(parsed)) {
    throw createServiceError("URL de flux non autorisée", 400);
  }

  return parsed.toString();
}

function buildSummary(item) {
  const raw = item.contentSnippet || item.summary || item.content || "";
  const cleaned = String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (cleaned.length <= MAX_SUMMARY_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_SUMMARY_LENGTH).trimEnd()}…`;
}

function formatArticle(item) {
  return {
    title: item.title?.trim() || "Sans titre",
    link: item.link?.trim() || "",
    publishedAt: item.isoDate || item.pubDate || null,
    summary: buildSummary(item),
  };
}

async function fetchAndParseFeed(feedUrl) {
  const validUrl = validateFeedUrl(feedUrl);

  const cached = sharedCache.get(validUrl);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(validUrl, {
      headers: {
        "User-Agent": "Dashboard-Epitech/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError" || controller.signal.aborted) {
      throw createServiceError(
        "Le service externe met trop de temps à répondre",
        504
      );
    }
    throw createServiceError(
      `Impossible de joindre le flux RSS : ${err.message}`,
      502
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw createServiceError(`Flux RSS introuvable : "${validUrl}"`, 404);
  }

  if (!response.ok) {
    throw createServiceError(
      `Le serveur du flux RSS a répondu avec une erreur (HTTP ${response.status})`,
      502
    );
  }

  let xmlText;
  try {
    xmlText = await response.text();
  } catch {
    throw createServiceError("Impossible de lire le contenu du flux RSS", 502);
  }

  try {
    const parsedFeed = await parser.parseString(xmlText);
    sharedCache.set(validUrl, parsedFeed, 60);
    return parsedFeed;
  } catch {
    throw createServiceError(
      `L'URL fournie ne pointe pas vers un flux RSS/Atom XML valide : "${validUrl}"`,
      404
    );
  }
}

/**
 * Récupère les N premiers articles d'un flux RSS/Atom.
 * @param {string} feedUrl
 * @param {number|string} number
 * @returns {Promise<Array<{ title: string, link: string, publishedAt: string | null, summary: string }>>}
 */
export async function getArticleList(feedUrl, number) {
  const validUrl = validateFeedUrl(feedUrl);

  const count = Number(number);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw createServiceError(
      "Le paramètre number doit être un entier compris entre 1 et 100",
      400
    );
  }

  const feed = await fetchAndParseFeed(validUrl);
  const items = Array.isArray(feed.items) ? feed.items : [];

  return items.slice(0, count).map(formatArticle);
}

/**
 * Récupère un aperçu du dernier article d'un flux RSS/Atom ainsi que le titre du flux.
 * @param {string} feedUrl
 * @returns {Promise<{ feedTitle: string | null, title: string, link: string, publishedAt: string | null, summary: string }>}
 */
export async function getFeedPreview(feedUrl) {
  const validUrl = validateFeedUrl(feedUrl);
  const feed = await fetchAndParseFeed(validUrl);
  const items = Array.isArray(feed.items) ? feed.items : [];

  if (items.length === 0) {
    throw createServiceError("Aucun article trouvé dans ce flux RSS", 404);
  }

  return {
    feedTitle: feed.title?.trim() || null,
    ...formatArticle(items[0]),
  };
}
