/**
 * Utilitaires de validation stricte des entrées utilisateurs (Input Validation).
 * Protège l'application contre les injections, dépassements de mémoire tampon,
 * dénis de service (DoS) et pollutions d'objets.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,39}$/;
const CRYPTO_COIN_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;
const CRYPTO_CURRENCY_REGEX = /^[a-zA-Z0-9]{2,10}$/;

export function validateRegisterInput(body) {
  const { email, username, password } = body || {};

  if (!email || !username || !password) {
    return "email, username et password sont requis";
  }

  if (typeof email !== "string" || email.length > 255 || !EMAIL_REGEX.test(email.trim())) {
    return "Format d'email invalide ou trop long (max 255 caractères)";
  }

  if (typeof username !== "string" || !USERNAME_REGEX.test(username.trim())) {
    return "Le nom d'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, - ou _)";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères";
  }

  if (password.length > 128) {
    return "Le mot de passe ne doit pas dépasser 128 caractères";
  }

  return null;
}

export function validateLoginInput(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    return "email et password sont requis";
  }

  if (typeof email !== "string" || email.length > 255 || !EMAIL_REGEX.test(email.trim())) {
    return "Format d'email invalide";
  }

  if (typeof password !== "string" || password.length > 128) {
    return "Format de mot de passe invalide";
  }

  return null;
}

/**
 * Validation des dimensions et de la position d'un widget sur la grille
 */
export function validateWidgetLayout({ refreshRate, x, y, w, h } = {}) {
  if (refreshRate !== undefined) {
    const rate = Number(refreshRate);
    if (!Number.isInteger(rate) || rate < 10 || rate > 86400) {
      return "Le taux de rafraîchissement (refreshRate) doit être un entier entre 10 et 86400 secondes";
    }
  }

  if (x !== undefined) {
    const nx = Number(x);
    if (!Number.isInteger(nx) || nx < 0 || nx > 50) {
      return "La coordonnée x doit être un entier positif (0-50)";
    }
  }

  if (y !== undefined) {
    const ny = Number(y);
    if (!Number.isInteger(ny) || ny < 0 || ny > 200) {
      return "La coordonnée y doit être un entier positif (0-200)";
    }
  }

  if (w !== undefined) {
    const nw = Number(w);
    if (!Number.isInteger(nw) || nw < 1 || nw > 12) {
      return "La largeur w doit être un entier compris entre 1 et 12";
    }
  }

  if (h !== undefined) {
    const nh = Number(h);
    if (!Number.isInteger(nh) || nh < 1 || nh > 12) {
      return "La hauteur h doit être un entier compris entre 1 et 12";
    }
  }

  return null;
}

/**
 * Validation approfondie de la configuration d'un widget selon son type
 */
export function validateWidgetConfig(serviceName, typeName, widgetDef, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return "Le champ config doit être un objet JSON valide";
  }

  // Protection anti-prototype pollution
  const keys = Object.keys(config);
  for (const key of keys) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return "Clé de configuration interdite détectée";
    }
  }

  // Vérification de la présence de tous les paramètres obligatoires définis dans le catalogue
  const expectedParams = widgetDef.params || [];
  for (const param of expectedParams) {
    const value = config[param.name];
    if (value === undefined || value === null || value === "") {
      return `Paramètre requis manquant dans config : "${param.name}"`;
    }
  }

  // Rejet des clés inattendues injectées dans config
  const allowedParamNames = new Set(expectedParams.map((p) => p.name));
  for (const key of keys) {
    if (!allowedParamNames.has(key)) {
      return `Paramètre inattendu non autorisé dans config : "${key}"`;
    }
  }

  // Validations sémantiques ciblées par service et type
  if (serviceName === "weather") {
    const city = String(config.city || "").trim();
    if (!city || city.length > 100 || /[\x00-\x1F\x7F]/.test(city)) {
      return "Le nom de la ville (city) doit contenir entre 1 et 100 caractères valides";
    }

    if (typeName === "forecast") {
      const days = Number(config.days);
      if (!Number.isInteger(days) || days < 1 || days > 16) {
        return "Le paramètre days doit être un nombre entier entre 1 et 16 jours";
      }
    }
  }

  if (serviceName === "github") {
    if (typeName === "recent_commits") {
      const repo = String(config.repo || "").trim();
      if (!GITHUB_REPO_REGEX.test(repo) || repo.length > 100) {
        return 'Le dépôt GitHub (repo) doit respecter le format "propriétaire/nom_du_dépôt" (ex: expressjs/express)';
      }
      const count = Number(config.count);
      if (!Number.isInteger(count) || count < 1 || count > 50) {
        return "Le nombre de commits (count) doit être un entier compris entre 1 et 50";
      }
    }

    if (typeName === "repo_list") {
      const username = String(config.username || "").trim();
      if (!GITHUB_USERNAME_REGEX.test(username)) {
        return "Le nom d'utilisateur GitHub (username) est invalide (1-39 caractères alphanumériques)";
      }
      const allowedSorts = ["created", "updated", "pushed", "full_name"];
      const sort = String(config.sort || "").trim().toLowerCase();
      if (!allowedSorts.includes(sort)) {
        return `Le tri (sort) doit être l'une des valeurs suivantes : ${allowedSorts.join(", ")}`;
      }
    }
  }

  if (serviceName === "rss") {
    const link = String(config.link || "").trim();
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      return "Le lien RSS (link) doit être une URL HTTP ou HTTPS valide";
    }
    if (link.length > 2048) {
      return "L'URL du flux RSS ne doit pas dépasser 2048 caractères";
    }

    if (typeName === "article_list") {
      const number = Number(config.number);
      if (!Number.isInteger(number) || number < 1 || number > 50) {
        return "Le nombre d'articles (number) doit être un entier compris entre 1 et 50";
      }
    }
  }

  if (serviceName === "crypto") {
    const coin = String(config.coin || "").trim();
    if (!CRYPTO_COIN_REGEX.test(coin)) {
      return "L'identifiant de la cryptomonnaie (coin) est invalide (ex: bitcoin, ethereum)";
    }

    if (typeName === "price") {
      const currency = String(config.currency || "").trim();
      if (!CRYPTO_CURRENCY_REGEX.test(currency)) {
        return "La devise (currency) est invalide (ex: usd, eur, gbp)";
      }
    }

    if (typeName === "price_history") {
      const days = Number(config.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return "L'historique en jours (days) doit être un entier compris entre 1 et 365";
      }
    }
  }

  return null;
}

/**
 * Validation des tokens de services tiers
 */
export function validateServiceToken(service, token) {
  if (typeof token !== "string" || !token.trim()) {
    return "Le jeton d'authentification (token) est requis";
  }

  const clean = token.trim();
  if (clean.length < 10 || clean.length > 255) {
    return "La longueur du token est invalide (entre 10 et 255 caractères requis)";
  }

  // Pas de caractères de contrôle ou d'espaces
  if (/\s/.test(clean) || /[\x00-\x1F\x7F]/.test(clean)) {
    return "Le token contient des caractères interdits";
  }

  return null;
}
