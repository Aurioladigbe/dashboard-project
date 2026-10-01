import { Router } from "express";
import { prisma } from "../config/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Toutes les routes admin nécessitent d'être connecté ET d'avoir le rôle ADMIN
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Liste tous les utilisateurs enregistrés avec leurs compteurs de widgets/abonnements
 */
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        confirmed: true,
        createdAt: true,
        _count: {
          select: {
            widgets: true,
            subscriptions: true,
            oauthAccounts: true,
          },
        },
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    res.json({ users });
  } catch (err) {
    console.error("Erreur récupération utilisateurs admin:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Supprime un utilisateur et supprime en cascade ses widgets, abonnements et comptes OAuth
 */
router.delete("/users/:id", async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ error: "Identifiant utilisateur invalide" });
  }

  // Protection anti-auto-suppression : l'administrateur ne peut pas supprimer son propre compte
  if (req.user.id === targetId) {
    return res.status(400).json({
      error: "Vous ne pouvez pas supprimer votre propre compte administrateur",
    });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Grâce à onDelete: Cascade configuré dans schema.prisma, cette suppression
    // retire automatiquement les widgets, abonnements et comptes OAuth de l'utilisateur.
    await prisma.user.delete({
      where: { id: targetId },
    });

    res.json({
      message: "Utilisateur supprimé avec succès",
      id: targetId,
    });
  } catch (err) {
    console.error("Erreur suppression utilisateur admin:", err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur" });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Permet de promouvoir ou rétrograder le rôle d'un utilisateur (USER <-> ADMIN)
 */
router.patch("/users/:id/role", async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { role } = req.body || {};

  if (isNaN(targetId)) {
    return res.status(400).json({ error: "Identifiant utilisateur invalide" });
  }

  if (!role || !["USER", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide (USER ou ADMIN requis)" });
  }

  if (req.user.id === targetId && role !== "ADMIN") {
    return res.status(400).json({
      error: "Vous ne pouvez pas rétrograder votre propre compte administrateur",
    });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        confirmed: true,
        createdAt: true,
      },
    });

    res.json({
      message: `Rôle mis à jour en ${role}`,
      user: updated,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    console.error("Erreur modification rôle admin:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du rôle" });
  }
});

export default router;
