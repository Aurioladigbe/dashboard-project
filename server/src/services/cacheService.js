/**
 * Cache en mémoire simple (Map avec TTL en secondes).
 * Partagé entre les services pour éviter les requêtes redondantes
 * et préserver les quotas d'API externes (ex: GitHub limité à 60 req/h).
 */
class MemoryCache {
  constructor(defaultTtlSeconds = 60) {
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlSeconds = this.defaultTtlSeconds) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const sharedCache = new MemoryCache(60);
