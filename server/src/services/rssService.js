import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
});

const MAX_SUMMARY_LENGTH = 250;

function createServiceError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
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

  let response;
  try {
    response = await fetch(validUrl, {
      headers: {
        "User-Agent": "Dashboard-Epitech/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw createServiceError(
      `Impossible de joindre le flux RSS : ${err.message}`,
      502
    );
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
    return await parser.parseString(xmlText);
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
