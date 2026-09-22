import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
// TODO (jour 3-4, Dev A): envoyer un vrai email de confirmation au lieu de confirmed:true direct
router.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "email, username et password sont requis" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Cet email est deja utilise" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, password: hashed, confirmed: true }, // TODO: false + email de confirmation
  });

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  res.json({ user: toPublicUser(user) });
});

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

export default router;
