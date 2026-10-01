import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Mock de prisma
vi.mock("../config/db.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../config/db.js";
import adminRouter from "./admin.js";

const JWT_SECRET = "test-admin-secret";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  return app;
}

function makeToken({ id = 1, email = "admin@test.com", role = "ADMIN" } = {}) {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: "1h" });
}

describe("Admin Router (/api/admin)", () => {
  const app = createAdminApp();

  describe("Contrôle d'accès et rôle ADMIN", () => {
    it("rejette les requêtes non authentifiées avec un 401", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("rejette les requêtes d'un utilisateur standard (USER) avec un 403", async () => {
      const userToken = makeToken({ id: 2, role: "USER" });
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/administrateurs/i);
    });

    it("autorise l'accès pour un utilisateur ADMIN", async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 1, email: "admin@test.com", username: "admin", role: "ADMIN", _count: { widgets: 2 } },
      ]);

      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users).toHaveLength(1);
    });
  });

  describe("DELETE /api/admin/users/:id", () => {
    it("bloque la tentative d'auto-suppression d'un admin avec un 400", async () => {
      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .delete("/api/admin/users/1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/propre compte/i);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it("renvoie 404 si l'utilisateur à supprimer n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .delete("/api/admin/users/999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/introuvable/i);
    });

    it("supprime l'utilisateur cible avec succès", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 2, username: "victim" });
      prisma.user.delete.mockResolvedValueOnce({ id: 2 });

      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .delete("/api/admin/users/2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    });
  });

  describe("PATCH /api/admin/users/:id/role", () => {
    it("rejette un rôle invalide avec un 400", async () => {
      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .patch("/api/admin/users/2/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "SUPER_GOD" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalide/i);
    });

    it("empêche un admin de se rétrograder lui-même", async () => {
      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .patch("/api/admin/users/1/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "USER" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/rétrograder/i);
    });

    it("permet de promouvoir un utilisateur en ADMIN", async () => {
      prisma.user.update.mockResolvedValueOnce({ id: 2, role: "ADMIN" });

      const adminToken = makeToken({ id: 1, role: "ADMIN" });
      const res = await request(app)
        .patch("/api/admin/users/2/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "ADMIN" });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("ADMIN");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { role: "ADMIN" },
        })
      );
    });
  });
});
