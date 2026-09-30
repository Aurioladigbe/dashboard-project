import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { requireAuth } from "./auth.js";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
});

function buildApp() {
  const app = express();
  app.get("/protected", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
  return app;
}

describe("requireAuth", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed Authorization header", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "not-a-bearer-token");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid/expired token", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer invalid.token.value");
    expect(res.status).toBe(401);
  });

  it("rejects a special-purpose token (e.g. email confirmation)", async () => {
    const token = jwt.sign({ id: 1, purpose: "email_confirm" }, process.env.JWT_SECRET);
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("accepts a valid session token and exposes req.user", async () => {
    const token = jwt.sign(
      { id: 42, email: "a@b.com", role: "USER" },
      process.env.JWT_SECRET
    );
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 42, email: "a@b.com", role: "USER" });
  });
});
