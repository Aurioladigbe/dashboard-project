import express from "express";
import cors from "cors";
import "dotenv/config";

import aboutRouter from "./routes/about.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import widgetsRouter from "./routes/widgets.js";

export const app = express();

// Masquer l'empreinte logicielle d'Express
app.disable("x-powered-by");

// En-têtes de sécurité HTTP standards (OWASP)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  next();
});

app.use(cors());
app.use(express.json());

// Route exigee par le sujet : GET /about.json
app.use("/about.json", aboutRouter);

app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
app.use("/api/widgets", widgetsRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Dashboard API" });
});

// Middleware global de gestion d'erreurs Express
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number(err.status || err.statusCode) || 500;
  const message = err.message || "Erreur interne du serveur";

  if (status >= 500) {
    console.error("Unhandled error:", err);
  }

  res.status(status).json({ error: message });
});

