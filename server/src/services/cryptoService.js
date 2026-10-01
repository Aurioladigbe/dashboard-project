import { sharedCache } from "./cacheService.js";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

function createServiceError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function fetchCoinGecko(url) {
  const cached = sharedCache.get(url);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "DashboardApp/1.0",
      },
    });
  } catch (err) {
    if (err.name === "AbortError" || controller.signal.aborted) {
      throw createServiceError(
        "Le service externe CoinGecko met trop de temps à répondre",
        504
      );
    }
    throw createServiceError(
      `Service crypto CoinGecko injoignable : ${err.message}`,
      502
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw createServiceError(
      "Limite de requêtes CoinGecko atteinte. Veuillez patienter une minute.",
      429
    );
  }

  if (response.status === 404) {
    throw createServiceError("Ressource crypto introuvable sur CoinGecko", 404);
  }

  if (!response.ok) {
    throw createServiceError(
      `Erreur du service CoinGecko (HTTP ${response.status})`,
      502
    );
  }

  try {
    const data = await response.json();
    sharedCache.set(url, data, 60);
    return data;
  } catch {
    throw createServiceError(
      "Réponse invalide reçue depuis le service CoinGecko",
      502
    );
  }
}

/**
 * Récupère le prix actuel et la variation sur 24h d'une crypto-monnaie.
 * @param {string} coin Identifiant (ex: bitcoin, ethereum)
 * @param {string} currency Devise (ex: usd, eur)
 * @returns {Promise<{ coin: string, currency: string, price: number, change24h: number|null }>}
 */
export async function getCryptoPrice(coin, currency = "usd") {
  if (!coin || typeof coin !== "string" || !coin.trim()) {
    throw createServiceError("L'identifiant de la crypto-monnaie est requis", 400);
  }

  const cleanCoin = coin.trim().toLowerCase();
  const cleanCurrency = String(currency || "usd").trim().toLowerCase();

  const url = `${COINGECKO_BASE_URL}/simple/price?ids=${encodeURIComponent(
    cleanCoin
  )}&vs_currencies=${encodeURIComponent(cleanCurrency)}&include_24hr_change=true`;

  const data = await fetchCoinGecko(url);

  const coinData = data[cleanCoin];
  if (!coinData || typeof coinData[cleanCurrency] !== "number") {
    throw createServiceError(
      `Cryptomonnaie ou devise introuvable : "${cleanCoin}" (${cleanCurrency})`,
      404
    );
  }

  const price = coinData[cleanCurrency];
  const changeKey = `${cleanCurrency}_24h_change`;
  const change24h =
    typeof coinData[changeKey] === "number" ? coinData[changeKey] : null;

  return {
    coin: cleanCoin,
    currency: cleanCurrency,
    price,
    change24h,
  };
}

/**
 * Récupère l'historique des prix d'une crypto-monnaie sur N jours.
 * @param {string} coin Identifiant (ex: bitcoin, ethereum)
 * @param {number|string} days Nombre de jours (1 à 365)
 * @param {string} [currency="usd"] Devise (ex: usd, eur)
 * @returns {Promise<{ coin: string, currency: string, points: Array<{ date: string, price: number }> }>}
 */
export async function getCryptoHistory(coin, days, currency = "usd") {
  if (!coin || typeof coin !== "string" || !coin.trim()) {
    throw createServiceError("L'identifiant de la crypto-monnaie est requis", 400);
  }

  const numDays = Number(days);
  if (!Number.isInteger(numDays) || numDays < 1 || numDays > 365) {
    throw createServiceError(
      "Le paramètre days doit être un entier compris entre 1 et 365",
      400
    );
  }

  const cleanCoin = coin.trim().toLowerCase();
  const cleanCurrency = String(currency || "usd").trim().toLowerCase();

  const url = `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(
    cleanCoin
  )}/market_chart?vs_currency=${encodeURIComponent(cleanCurrency)}&days=${numDays}`;

  const data = await fetchCoinGecko(url);

  if (!Array.isArray(data?.prices) || data.prices.length === 0) {
    throw createServiceError(
      `Historique indisponible pour la cryptomonnaie : "${cleanCoin}"`,
      404
    );
  }

  const points = data.prices.map(([timestamp, price]) => ({
    date: new Date(timestamp).toISOString(),
    price: Number(price),
  }));

  return {
    coin: cleanCoin,
    currency: cleanCurrency,
    points,
  };
}
