import { describe, it, expect } from "vitest";
import { clamp, formatMoney, formatRelative, formatWeekday, safeUrl } from "./format";

describe("safeUrl", () => {
  it("accepte http et https", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("refuse les schémas dangereux et les valeurs invalides", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUrl("ftp://example.com")).toBeNull();
    expect(safeUrl("pas une url")).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl(42)).toBeNull();
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-09-28T12:00:00Z").getTime();

  it("décrit un passé récent en langage naturel", () => {
    expect(formatRelative("2026-09-28T11:59:40Z", now)).toBe("à l'instant");
    expect(formatRelative("2026-09-28T11:30:00Z", now)).toBe("il y a 30 minutes");
    expect(formatRelative("2026-09-28T09:00:00Z", now)).toBe("il y a 3 heures");
    expect(formatRelative("2026-09-27T12:00:00Z", now)).toBe("hier");
  });

  it("renvoie une chaîne vide si la date est absente ou invalide", () => {
    expect(formatRelative(null, now)).toBe("");
    expect(formatRelative("n'importe quoi", now)).toBe("");
  });
});

describe("formatMoney", () => {
  it("formate dans la devise demandée", () => {
    expect(formatMoney(1234.5, "usd")).toMatch(/1\s?234,50/);
  });

  it("ne plante pas avec un code de devise inconnu", () => {
    expect(formatMoney(10, "zzzz")).toContain("ZZZZ");
  });

  it("affiche un tiret si le montant n'est pas un nombre", () => {
    expect(formatMoney("abc", "usd")).toBe("–");
  });
});

describe("formatWeekday", () => {
  it("ne décale pas le jour selon le fuseau horaire", () => {
    expect(formatWeekday("2026-09-28")).toMatch(/28/);
  });
});

describe("clamp", () => {
  it("borne une valeur", () => {
    expect(clamp(15, 0, 12)).toBe(12);
    expect(clamp(-3, 0, 12)).toBe(0);
    expect(clamp(5, 0, 12)).toBe(5);
  });
});
