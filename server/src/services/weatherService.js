import { sharedCache } from "./cacheService.js";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";

function createServiceError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function fetchOpenMeteo(url) {
  const cached = sharedCache.get(url);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError" || controller.signal.aborted) {
      throw createServiceError(
        "Le service externe met trop de temps à répondre",
        504
      );
    }
    throw createServiceError(
      `Service météo Open-Meteo injoignable : ${err.message}`,
      502
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw createServiceError(
      `Erreur du service météo Open-Meteo (HTTP ${response.status})`,
      502
    );
  }

  try {
    const data = await response.json();
    sharedCache.set(url, data, 60);
    return data;
  } catch {
    throw createServiceError(
      "Réponse invalide reçue depuis le service météo Open-Meteo",
      502
    );
  }
}

/**
 * Géocode un nom de ville via Open-Meteo Geocoding API.
 * @param {string} cityName
 * @returns {Promise<{ latitude: number, longitude: number, name: string }>}
 */
export async function geocodeCity(cityName) {
  if (!cityName || typeof cityName !== "string" || !cityName.trim()) {
    throw createServiceError("Le nom de la ville est requis", 400);
  }

  const params = new URLSearchParams({
    name: cityName.trim(),
    count: "1",
    language: "fr",
    format: "json",
  });

  const data = await fetchOpenMeteo(`${GEOCODING_BASE_URL}?${params.toString()}`);

  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw createServiceError(`Ville introuvable : "${cityName}"`, 404);
  }

  const { latitude, longitude, name } = data.results[0];
  return { latitude, longitude, name };
}

/**
 * Récupère la température actuelle à 2m pour une ville donnée.
 * @param {string} cityName
 * @returns {Promise<{ city: string, temperature: number, unit: string }>}
 */
export async function getCurrentTemperature(cityName) {
  const { latitude, longitude, name } = await geocodeCity(cityName);

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m",
  });

  const data = await fetchOpenMeteo(`${FORECAST_BASE_URL}?${params.toString()}`);

  if (typeof data?.current?.temperature_2m !== "number") {
    throw createServiceError(
      "Données de température actuelle manquantes dans la réponse Open-Meteo",
      502
    );
  }

  return {
    city: name || cityName,
    temperature: data.current.temperature_2m,
    unit: "°C",
  };
}

/**
 * Récupère les prévisions (min/max) sur N jours pour une ville donnée.
 * @param {string} cityName
 * @param {number|string} days
 * @returns {Promise<{ city: string, days: Array<{ date: string, tempMax: number, tempMin: number }> }>}
 */
export async function getForecast(cityName, days) {
  const numDays = Number(days);
  if (!Number.isInteger(numDays) || numDays < 1 || numDays > 16) {
    throw createServiceError(
      "Le paramètre days doit être un entier compris entre 1 et 16",
      400
    );
  }

  const { latitude, longitude, name } = await geocodeCity(cityName);

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "temperature_2m_max,temperature_2m_min",
    forecast_days: String(numDays),
  });

  const data = await fetchOpenMeteo(`${FORECAST_BASE_URL}?${params.toString()}`);

  if (
    !Array.isArray(data?.daily?.time) ||
    !Array.isArray(data?.daily?.temperature_2m_max) ||
    !Array.isArray(data?.daily?.temperature_2m_min)
  ) {
    throw createServiceError(
      "Données de prévisions manquantes dans la réponse Open-Meteo",
      502
    );
  }

  const forecastDays = data.daily.time.map((date, index) => ({
    date,
    tempMax: data.daily.temperature_2m_max[index],
    tempMin: data.daily.temperature_2m_min[index],
  }));

  return {
    city: name || cityName,
    days: forecastDays,
  };
}
