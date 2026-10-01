import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter } from "./rateLimiter.js";

describe("createRateLimiter", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("autorise les requêtes sous la limite et bloque à 429 au dépassement", async () => {
    process.env.NODE_ENV = "production";
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 2,
      message: "Trop de requêtes",
    });

    const app = express();
    app.get("/test", limiter, (req, res) => res.json({ ok: true }));

    const res1 = await request(app).get("/test");
    expect(res1.status).toBe(200);
    expect(res1.headers["x-ratelimit-remaining"]).toBe("1");

    const res2 = await request(app).get("/test");
    expect(res2.status).toBe(200);
    expect(res2.headers["x-ratelimit-remaining"]).toBe("0");

    const res3 = await request(app).get("/test");
    expect(res3.status).toBe(429);
    expect(res3.body.error).toBe("Trop de requêtes");
    expect(res3.headers).toHaveProperty("retry-after");
  });
});
