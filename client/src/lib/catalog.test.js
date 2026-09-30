import { describe, it, expect } from "vitest";
import { formatInterval, serviceMeta } from "./catalog";

describe("formatInterval", () => {
  it("écrit l'intervalle de rafraîchissement en français", () => {
    expect(formatInterval(10)).toBe("Toutes les 10 s");
    expect(formatInterval(60)).toBe("Toutes les minutes");
    expect(formatInterval(600)).toBe("Toutes les 10 min");
    expect(formatInterval(3600)).toBe("Toutes les heures");
  });
});

describe("serviceMeta", () => {
  it("donne à un service inconnu une lumière et un glyphe par défaut", () => {
    const meta = serviceMeta("inconnu");
    expect(meta.label).toBe("inconnu");
    expect(meta.light).toMatch(/^#/);
    expect(meta.icon).toBe("grid");
  });
});
