import { Router } from "express";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/widgets — tous les widgets du dashboard de l'utilisateur connecte
router.get("/", async (req, res) => {
  const widgets = await prisma.widgetInstance.findMany({
    where: { userId: req.user.id },
    orderBy: { id: "asc" },
  });
  res.json({ widgets });
});

// POST /api/widgets — ajoute une instance de widget
// body: { service, type, config, refreshRate, x, y, w, h }
router.post("/", async (req, res) => {
  const { service, type, config, refreshRate, x, y, w, h } = req.body;

  if (!service || !type || !config) {
    return res.status(400).json({ error: "service, type et config sont requis" });
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
  });

  res.status(201).json({ widget });
});

// PATCH /api/widgets/:id — reconfigure / deplace un widget existant
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.widgetInstance.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: "Widget introuvable" });

  const widget = await prisma.widgetInstance.update({
    where: { id },
    data: req.body,
  });

  res.json({ widget });
});

// DELETE /api/widgets/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.widgetInstance.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: "Widget introuvable" });

  await prisma.widgetInstance.delete({ where: { id } });
  res.status(204).send();
});

export default router;
