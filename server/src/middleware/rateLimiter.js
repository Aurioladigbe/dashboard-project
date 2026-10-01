/**
 * Middleware de limitation de débit (Rate Limiting) en mémoire.
 * Protège les routes sensibles contre le brute-force et le déni de service (DoS).
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 15,                   // 15 tentatives max par fenêtre
  message = "Trop de requêtes. Veuillez patienter avant de réessayer.",
} = {}) {
  const hits = new Map();

  // Nettoyage régulier pour éviter l'accumulation en mémoire
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.resetTime > windowMs) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));

  // Permet à Node.js de quitter proprement sans attendre ce timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    // Ne pas bloquer la suite de tests automatisée
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const forwarded = req.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
               req.socket?.remoteAddress ||
               "unknown";

    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now - record.resetTime > windowMs) {
      hits.set(ip, { count: 1, resetTime: now });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);

    if (record.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - record.resetTime)) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: message });
    }

    next();
  };
}
