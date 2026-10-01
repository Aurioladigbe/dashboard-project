import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getCurrentTemperature, getForecast } from "../services/weatherService.js";
import { getRecentCommits, getRepoList } from "../services/githubService.js";
import { getArticleList, getFeedPreview } from "../services/rssService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesPath = path.join(__dirname, "..", "config", "services.json");

function loadServicesCatalog() {
  return JSON.parse(fs.readFileSync(servicesPath, "utf-8"));
}

const WIDGET_SELECT = {
  id: true,
  service: true,
  type: true,
  config: true,
  refreshRate: true,
  x: true,
  y: true,
  w: true,
  h: true,
};

// Registre extensible des sources de donnees par "service:type".
// Pour ajouter un futur service (crypto, github, rss), il suffit d'ajouter
// ses cles "service:type" ici sans toucher a la route GET /:id/data.
const WIDGET_DATA_HANDLERS = {
  "weather:city_temperature": (config) => getCurrentTemperature(config.city),
  "weather:forecast": (config) => getForecast(config.city, config.days),
  "github:recent_commits": (config, widget, context) =>
    getRecentCommits(config.repo, config.count, context?.token),
  "github:repo_list": (config, widget, context) =>
    getRepoList(config.username, config.sort, context?.token),
  "rss:article_list": (config) => getArticleList(config.link, config.number),
  "rss:feed_preview": (config) => getFeedPreview(config.link),
};

function validateWidgetParams(widgetDef, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return "Le champ config doit être un objet JSON valide";
  }

  for (const param of widgetDef.params || []) {
    const value = config[param.name];
    if (value === undefined || value === null || value === "") {
      return `Paramètre requis manquant dans config : "${param.name}"`;
    }
  }

  return null;
}

const router = Router();
router.use(requireAuth);

// GET /api/widgets — tous les widgets du dashboard de l'utilisateur connecte
router.get("/", async (req, res) => {
  const widgets = await prisma.widgetInstance.findMany({
    where: { userId: req.user.id },
    select: WIDGET_SELECT,
    orderBy: { id: "asc" },
  });
  res.json({ widgets });
});

// GET /api/widgets/:id/data — recupere les donnees live d'un widget
router.get("/:id/data", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Identifiant de widget invalide" });
  }

  const widget = await prisma.widgetInstance.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!widget) {
    return res.status(404).json({ error: "Widget introuvable" });
  }

  const handlerKey = `${widget.service}:${widget.type}`;
  const handler = WIDGET_DATA_HANDLERS[handlerKey];

  if (!handler) {
    return res.status(501).json({
      error: "Ce type de widget n'a pas encore de source de données",
    });
  }

  let token = null;
  if (widget.service === "github") {
    const subscription = await prisma.serviceSubscription.findUnique({
      where: { userId_service: { userId: req.user.id, service: "github" } },
    });
    if (!subscription) {
      return res.status(403).json({
        error: "Vous devez d'abord vous abonner au service github avec un token",
      });
    }
    token = subscription.credentials?.token || null;
  }

  try {
    const data = await handler(widget.config, widget, {
      token,
      user: req.user,
    });
    return res.json({ data });
  } catch (err) {
    const status = err.status || 502;
    const message =
      err.message || "Erreur lors de la récupération des données du service externe";
    return res.status(status).json({ error: message });
  }
});

// POST /api/widgets — ajoute une instance de widget
// body: { service, type, config, refreshRate, x, y, w, h }
router.post("/", async (req, res) => {
  const { service, type, config, refreshRate, x, y, w, h } = req.body || {};

  if (!service || !type || config === undefined) {
    return res.status(400).json({ error: "service, type et config sont requis" });
  }

  const catalog = loadServicesCatalog();
  const serviceDef = catalog.find((s) => s.name === service);
  if (!serviceDef) {
    return res.status(404).json({ error: `Service inconnu : "${service}"` });
  }

  const widgetDef = serviceDef.widgets.find((w) => w.name === type);
  if (!widgetDef) {
    return res.status(400).json({
      error: `Type de widget "${type}" inconnu pour le service "${service}"`,
    });
  }

  const paramError = validateWidgetParams(widgetDef, config);
  if (paramError) {
    return res.status(400).json({ error: paramError });
  }

  const widget = await prisma.widgetInstance.create({
    data: {
      userId: req.user.id,
      service,
      type,
      config,
      refreshRate: refreshRate ?? 60,
      x: x ?? 0,
      y: y ?? 0,
      w: w ?? 3,
      h: h ?? 2,
    },
    select: WIDGET_SELECT,
  });

  res.status(201).json({ widget });
});

// PATCH /api/widgets/:id — reconfigure / deplace un widget existant
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Identifiant de widget invalide" });
  }

  const existing = await prisma.widgetInstance.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "Widget introuvable" });
  }

  const { config, refreshRate, x, y, w, h } = req.body || {};

  if (config !== undefined) {
    const catalog = loadServicesCatalog();
    const serviceDef = catalog.find((s) => s.name === existing.service);
    const widgetDef = serviceDef?.widgets.find((wDef) => wDef.name === existing.type);
    if (widgetDef) {
      const paramError = validateWidgetParams(widgetDef, config);
      if (paramError) {
        return res.status(400).json({ error: paramError });
      }
    }
  }

  const data = {};
  if (config !== undefined) data.config = config;
  if (refreshRate !== undefined) data.refreshRate = refreshRate;
  if (x !== undefined) data.x = x;
  if (y !== undefined) data.y = y;
  if (w !== undefined) data.w = w;
  if (h !== undefined) data.h = h;

  const widget = await prisma.widgetInstance.update({
    where: { id },
    data,
    select: WIDGET_SELECT,
  });

  res.json({ widget });
});

// DELETE /api/widgets/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Identifiant de widget invalide" });
  }

  const existing = await prisma.widgetInstance.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "Widget introuvable" });
  }

  await prisma.widgetInstance.delete({ where: { id } });
  res.status(204).send();
});

export default router;

