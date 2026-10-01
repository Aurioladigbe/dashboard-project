import { describe, it, expect } from "vitest";
import {
  validateRegisterInput,
  validateLoginInput,
  validateWidgetLayout,
  validateWidgetConfig,
  validateServiceToken,
} from "./validators.js";

describe("validators utility", () => {
  describe("validateRegisterInput", () => {
    it("valide un input correct", () => {
      const err = validateRegisterInput({
        email: "test@example.com",
        username: "valid_user",
        password: "secure_password_123",
      });
      expect(err).toBeNull();
    });

    it("rejette les mots de passe trop courts (< 8 caractères)", () => {
      const err = validateRegisterInput({
        email: "test@example.com",
        username: "valid_user",
        password: "short",
      });
      expect(err).toMatch(/au moins 8 caractères/i);
    });

    it("rejette les mots de passe trop longs (> 128 caractères)", () => {
      const err = validateRegisterInput({
        email: "test@example.com",
        username: "valid_user",
        password: "a".repeat(129),
      });
      expect(err).toMatch(/ne doit pas dépasser 128/i);
    });

    it("rejette les pseudos contenant des caractères non autorisés", () => {
      const err = validateRegisterInput({
        email: "test@example.com",
        username: "bad!user$",
        password: "valid_password",
      });
      expect(err).toMatch(/nom d'utilisateur/i);
    });
  });

  describe("validateLoginInput", () => {
    it("valide un identifiant correct", () => {
      expect(
        validateLoginInput({ email: "user@test.com", password: "mypassword" })
      ).toBeNull();
    });

    it("rejette les emails invalides", () => {
      expect(
        validateLoginInput({ email: "invalid-email", password: "mypassword" })
      ).toMatch(/format d'email invalide/i);
    });
  });

  describe("validateWidgetLayout", () => {
    it("valide des coordonnées et dimensions correctes", () => {
      expect(
        validateWidgetLayout({ refreshRate: 60, x: 0, y: 1, w: 4, h: 3 })
      ).toBeNull();
    });

    it("rejette un refreshRate trop court (< 10s)", () => {
      expect(validateWidgetLayout({ refreshRate: 5 })).toMatch(/refreshRate/i);
    });

    it("rejette une largeur w hors limites (> 12 ou < 1)", () => {
      expect(validateWidgetLayout({ w: 0 })).toMatch(/largeur w/i);
      expect(validateWidgetLayout({ w: 15 })).toMatch(/largeur w/i);
    });

    it("rejette des coordonnées x négatives", () => {
      expect(validateWidgetLayout({ x: -2 })).toMatch(/coordonnée x/i);
    });
  });

  describe("validateWidgetConfig", () => {
    const dummyDef = {
      params: [{ name: "city", type: "string" }],
    };

    it("rejette une tentative de pollution de prototype", () => {
      const malformed = JSON.parse('{"city": "Paris", "__proto__": {"polluted": true}}');
      // En JS Object.keys ne liste pas __proto__ directement sauf si présent
      const direct = { city: "Paris", prototype: "bad" };
      expect(validateWidgetConfig("weather", "city_temperature", dummyDef, direct)).toMatch(
        /interdite/i
      );
    });

    it("rejette les paramètres inconnus non déclarés", () => {
      expect(
        validateWidgetConfig("weather", "city_temperature", dummyDef, {
          city: "Paris",
          hackerKey: "injection",
        })
      ).toMatch(/inattendu/i);
    });

    it("valide un dépôt GitHub valide (owner/repo)", () => {
      const ghDef = {
        params: [
          { name: "repo", type: "string" },
          { name: "count", type: "integer" },
        ],
      };
      expect(
        validateWidgetConfig("github", "recent_commits", ghDef, {
          repo: "facebook/react",
          count: 10,
        })
      ).toBeNull();
    });

    it("rejette un dépôt GitHub malformé (ex: tentative de path traversal)", () => {
      const ghDef = {
        params: [
          { name: "repo", type: "string" },
          { name: "count", type: "integer" },
        ],
      };
      expect(
        validateWidgetConfig("github", "recent_commits", ghDef, {
          repo: "../../etc/passwd",
          count: 10,
        })
      ).toMatch(/propriétaire\/nom_du_dépôt/i);
    });

    it("valide une URL RSS bien formée", () => {
      const rssDef = {
        params: [{ name: "link", type: "string" }],
      };
      expect(
        validateWidgetConfig("rss", "feed_preview", rssDef, {
          link: "https://news.ycombinator.com/rss",
        })
      ).toBeNull();
    });

    it("rejette une fausse URL RSS sans http/https", () => {
      const rssDef = {
        params: [{ name: "link", type: "string" }],
      };
      expect(
        validateWidgetConfig("rss", "feed_preview", rssDef, {
          link: "javascript:alert(1)",
        })
      ).toMatch(/URL HTTP ou HTTPS/i);
    });

    it("rejette un forecast avec un nombre de jours invalide", () => {
      const forecastDef = {
        params: [
          { name: "city", type: "string" },
          { name: "days", type: "integer" },
        ],
      };
      expect(
        validateWidgetConfig("weather", "forecast", forecastDef, {
          city: "Lyon",
          days: 45,
        })
      ).toMatch(/entre 1 et 16/i);
    });
  });

  describe("validateServiceToken", () => {
    it("valide un token valide", () => {
      expect(validateServiceToken("github", "ghp_1234567890abcdef1234567890")).toBeNull();
    });

    it("rejette un token avec espaces ou caractères de contrôle", () => {
      expect(validateServiceToken("github", "bad token with spaces")).toMatch(/caractères interdits/i);
    });

    it("rejette un token trop court", () => {
      expect(validateServiceToken("github", "short")).toMatch(/longueur/i);
    });
  });
});
