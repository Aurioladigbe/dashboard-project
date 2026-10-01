import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateServiceToken } from "../utils/validators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesPath = path.join(__dirname, "..", "config", "services.json");

function loadServicesCatalog() {
  return JSON.parse(fs.readFileSync(servicesPath, "utf-8"));
}

const subscribeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Trop de requêtes d'abonnement. Veuillez patienter.",
});

const router = Router();

// GET /api/services — catalogue complet (public + description, utilise par le frontend
// pour generer les formulaires de configuration des widgets)
router.get("/", (req, res) => {
  const services = loadServicesCatalog();
  res.json({ services });
});

// GET /api/services/mine — services auxquels l'utilisateur connecte est abonne
router.get("/mine", requireAuth, async (req, res) => {
  const subscriptions = await prisma.serviceSubscription.findMany({
    where: { userId: req.user.id },
    select: { service: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ subscriptions });
});

// POST /api/services/:service/subscribe
// body: { credentials?: {...} } — pour les services necessitant un compte externe
router.post("/:service/subscribe", requireAuth, subscribeLimiter, async (req, res) => {
  const { service } = req.params;
  const { credentials = null } = req.body || {};

  const catalog = loadServicesCatalog();
  const serviceDef = catalog.find((s) => s.name === service);
  if (!serviceDef) {
    return res.status(404).json({ error: `Service inconnu : "${service}"` });
  }

  let sanitizedCredentials = null;

  if (service === "github" || serviceDef.requiresAuth) {
    const tokenError = validateServiceToken(service, credentials?.token);
    if (tokenError) {
      return res.status(400).json({ error: tokenError });
    }
    sanitizedCredentials = { token: credentials.token.trim() };
  }

  const subscription = await prisma.serviceSubscription.upsert({
    where: { userId_service: { userId: req.user.id, service } },
    update: { credentials: sanitizedCredentials },
    create: { userId: req.user.id, service, credentials: sanitizedCredentials },
    select: { id: true, service: true, createdAt: true },
  });

  res.status(201).json({ subscription });
});

// DELETE /api/services/:service/subscribe
router.delete("/:service/subscribe", requireAuth, async (req, res) => {
  const { service } = req.params;

  const catalog = loadServicesCatalog();
  const serviceDef = catalog.find((s) => s.name === service);
  if (!serviceDef) {
    return res.status(404).json({ error: `Service inconnu : "${service}"` });
  }

  await prisma.serviceSubscription.deleteMany({
    where: { userId: req.user.id, service },
  });

  res.status(204).send();
});

export default router;

