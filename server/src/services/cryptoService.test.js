import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCryptoPrice, getCryptoHistory } from "./cryptoService.js";
import { sharedCache } from "./cacheService.js";

describe("cryptoService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sharedCache.clear();
  });

  describe("getCryptoPrice", () => {
    it("valide et renvoie le prix actuel et le change24h", async () => {
      const mockResponse = {
        bitcoin: {
          usd: 84000.5,
          usd_24h_change: 2.35,
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const res = await getCryptoPrice("bitcoin", "usd");
      expect(res).toEqual({
        coin: "bitcoin",
        currency: "usd",
        price: 84000.5,
        change24h: 2.35,
      });
    });

    it("rejette si le paramètre coin est manquant ou vide", async () => {
      await expect(getCryptoPrice("")).rejects.toThrow("L'identifiant de la crypto-monnaie est requis");
      await expect(getCryptoPrice(null)).rejects.toThrow("L'identifiant de la crypto-monnaie est requis");
    });

    it("lance une erreur 404 si la cryptomonnaie est introuvable", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await expect(getCryptoPrice("unknowncoin", "usd")).rejects.toThrow(
        'Cryptomonnaie ou devise introuvable : "unknowncoin" (usd)'
      );
    });

    it("gère les limites de requêtes CoinGecko 429", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(getCryptoPrice("bitcoin", "usd")).rejects.toMatchObject({
        status: 429,
        message: expect.stringContaining("Limite de requêtes CoinGecko atteinte"),
      });
    });
  });

  describe("getCryptoHistory", () => {
    it("renvoie les points d'historique avec dates ISO", async () => {
      const mockResponse = {
        prices: [
          [1609459200000, 29000.0],
          [1609545600000, 30500.5],
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const res = await getCryptoHistory("bitcoin", 7, "usd");
      expect(res.coin).toBe("bitcoin");
      expect(res.currency).toBe("usd");
      expect(res.points).toHaveLength(2);
      expect(res.points[0]).toEqual({
        date: "2021-01-01T00:00:00.000Z",
        price: 29000.0,
      });
      expect(res.points[1]).toEqual({
        date: "2021-01-02T00:00:00.000Z",
        price: 30500.5,
      });
    });

    it("rejette les jours invalides (< 1 ou > 365 ou non entier)", async () => {
      await expect(getCryptoHistory("bitcoin", 0)).rejects.toThrow("Le paramètre days doit être un entier");
      await expect(getCryptoHistory("bitcoin", 500)).rejects.toThrow("Le paramètre days doit être un entier");
      await expect(getCryptoHistory("bitcoin", "invalid")).rejects.toThrow("Le paramètre days doit être un entier");
    });
  });
});
