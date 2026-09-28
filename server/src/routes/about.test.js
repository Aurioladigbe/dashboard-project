import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("GET /about.json", () => {
  it("returns client host, server time and the list of services", async () => {
    const res = await request(app).get("/about.json");

    expect(res.status).toBe(200);
    expect(res.body.client).toHaveProperty("host");
    expect(typeof res.body.server.current_time).toBe("number");
    expect(Array.isArray(res.body.server.services)).toBe(true);

    const weather = res.body.server.services.find((s) => s.name === "weather");
    expect(weather).toBeDefined();
    expect(weather.widgets[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        params: expect.any(Array),
      })
    );
  });

  it("only exposes name/widgets/params, no extra fields like requiresAuth or description", async () => {
    const res = await request(app).get("/about.json");

    for (const service of res.body.server.services) {
      expect(Object.keys(service).sort()).toEqual(["name", "widgets"]);
      for (const widget of service.widgets) {
        expect(Object.keys(widget).sort()).toEqual(["name", "params"]);
        for (const param of widget.params) {
          expect(Object.keys(param).sort()).toEqual(["name", "type"]);
        }
      }
    }
  });
});
