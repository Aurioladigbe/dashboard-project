import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Mock de prisma
vi.mock("../config/db.js", () => ({
  prisma: {
    widgetInstance: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    serviceSubscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../config/db.js";
import widgetsRouter from "./widgets.js";

const JWT_SECRET = "test-widgets-secret";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function createWidgetsApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/widgets", widgetsRouter);
  return app;
}

function makeToken({ id = 1, email = "user@test.com", role = "USER" } = {}) {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: "1h" });
}

describe("Widgets Router - Validation renforcée", () => {
  const app = createWidgetsApp();
  const token = makeToken();

  describe("POST /api/widgets - Validation des entrées", () => {
    it("rejette si service ou type ou config sont absents", async () => {
      const res = await request(app)
        .post("/api/widgets")
        .set("Authorization", `Bearer ${token}`)
        .send({ service: "weather" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/requis/i);
    });

    it("rejette des dimensions layout invalides (ex: w > 12 ou refreshRate < 10)", async () => {
      const res = await request(app)
        .post("/api/widgets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          service: "weather",
          type: "city_temperature",
          config: { city: "Paris" },
          w: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/largeur w/i);
    });

    it("rejette l'injection de paramètres inattendus dans config", async () => {
      const res = await request(app)
        .post("/api/widgets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          service: "weather",
          type: "city_temperature",
          config: { city: "Paris", injectedKey: "hack" },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inattendu/i);
    });

    it("rejette un repo GitHub malveillant / invalide (ex: path traversal)", async () => {
      const res = await request(app)
        .post("/api/widgets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          service: "github",
          type: "recent_commits",
          config: { repo: "../../malicious", count: 5 },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/propriétaire\/nom_du_dépôt/i);
    });

    it("accepte un widget valide avec config et dimensions conformes", async () => {
      prisma.widgetInstance.create.mockResolvedValueOnce({
        id: 10,
        service: "weather",
        type: "city_temperature",
        config: { city: "Paris" },
        refreshRate: 60,
        x: 0,
        y: 0,
        w: 3,
        h: 2,
      });

      const res = await request(app)
        .post("/api/widgets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          service: "weather",
          type: "city_temperature",
          config: { city: "Paris" },
          refreshRate: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.widget.id).toBe(10);
    });
  });

  describe("PATCH /api/widgets/:id - Validation", () => {
    it("rejette un identifiant de widget invalide", async () => {
      const res = await request(app)
        .patch("/api/widgets/abc")
        .set("Authorization", `Bearer ${token}`)
        .send({ refreshRate: 120 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalide/i);
    });

    it("rejette une reconfiguration avec des dimensions invalides", async () => {
      const res = await request(app)
        .patch("/api/widgets/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ refreshRate: 2 }); // < 10 secondes

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/refreshRate/i);
    });
  });
});
