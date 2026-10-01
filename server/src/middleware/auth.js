import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.purpose) {
      // Un token special (ex: confirmation d'email) n'est pas une session valide.
      return res.status(401).json({ error: "Token invalide" });
    }

    req.user = payload; // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expire" });
  }
}

export async function requireAdmin(req, res, next) {
  if (req.user?.role === "ADMIN") {
    return next();
  }

  // Si le token JWT de session a été généré avant une promotion en base de données,
  // on vérifie en direct le rôle actuel de l'utilisateur dans PostgreSQL.
  if (req.user?.id) {
    try {
      const freshUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });
      if (freshUser?.role === "ADMIN") {
        req.user.role = "ADMIN";
        return next();
      }
    } catch {
      // Erreur de connexion DB éventuelle -> rejet sécurisé par défaut
    }
  }

  return res.status(403).json({ error: "Réservé aux administrateurs" });
}
