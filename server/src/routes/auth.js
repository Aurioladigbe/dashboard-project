import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendConfirmationEmail } from "../services/emailService.js";

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

function validateRegisterInput(body) {
  const { email, username, password } = body || {};

  if (!email || !username || !password) {
    return "email, username et password sont requis";
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return "Format d'email invalide";
  }

  if (typeof username !== "string" || !USERNAME_REGEX.test(username.trim())) {
    return "Le nom d'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, - ou _)";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères";
  }

  return null;
}

function validateLoginInput(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    return "email et password sont requis";
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return "Format d'email invalide";
  }

  if (typeof password !== "string") {
    return "Format de mot de passe invalide";
  }

  return null;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function signConfirmationToken(user) {
  return jwt.sign(
    { id: user.id, purpose: "email_confirm" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const validationError = validateRegisterInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const email = req.body.email.trim();
  const username = req.body.username.trim();
  const { password } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    if (existing.email === email) {
      return res.status(409).json({ error: "Cet email est deja utilise" });
    }
    return res.status(409).json({ error: "Ce nom d'utilisateur est deja utilise" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, password: hashed, confirmed: false },
  });

  const confirmToken = signConfirmationToken(user);
  const confirmUrl = `${process.env.APP_BASE_URL}/api/auth/confirm/${confirmToken}`;

  try {
    await sendConfirmationEmail(user.email, confirmUrl);
  } catch (err) {
    // On ne bloque jamais la création de compte si l'email échoue
    console.error("Echec envoi email de confirmation:", err.message);
  }

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

// GET /api/auth/confirm/:token
router.get("/confirm/:token", async (req, res) => {
  const { token } = req.params;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: "Lien de confirmation invalide ou expire" });
  }

  if (payload.purpose !== "email_confirm") {
    return res.status(400).json({ error: "Token invalide" });
  }

  const user = await prisma.user.update({
    where: { id: payload.id },
    data: { confirmed: true },
  });

  res.json({ user: toPublicUser(user) });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const validationError = validateLoginInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const email = req.body.email.trim();
  const { password } = req.body;

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

// GET /api/auth/github
// ?token=<jwt existant> optionnel : si present, on lie le compte GitHub
// a l'utilisateur deja connecte plutot que d'en creer/chercher un autre
router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.APP_BASE_URL}/api/auth/github/callback`,
    scope: "user:email",
    state: req.query.token || "",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback
router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ error: "Code OAuth manquant" });

  try {
    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.APP_BASE_URL}/api/auth/github/callback`,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Echange du code OAuth echoue" });
    }

    const profileResp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResp.json();
    const providerId = String(profile.id);

    let emailsResp = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const emails = await emailsResp.json();
    const primaryEmail = Array.isArray(emails)
      ? emails.find((e) => e.primary)?.email || emails[0]?.email
      : null;

    // 1. Le compte GitHub est-il deja lie a quelqu'un ?
    let account = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: "github", providerId } },
      include: { user: true },
    });

    if (account) {
      return res.json({ token: signToken(account.user), user: toPublicUser(account.user) });
    }

    // 2. Un utilisateur est-il deja connecte (state = son JWT) ? -> on lie
    let targetUser = null;
    if (state) {
      try {
        const payload = jwt.verify(state, process.env.JWT_SECRET);
        targetUser = await prisma.user.findUnique({ where: { id: payload.id } });
      } catch {
        // state absent/invalide -> on continue sans utilisateur cible
      }
    }

    // 3. Sinon, un compte avec le meme email existe deja (cree via register) ? -> on lie
    if (!targetUser && primaryEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: primaryEmail } });
    }

    // 4. Sinon, on cree un nouvel utilisateur (email verifie par GitHub -> confirmed direct)
    if (!targetUser) {
      if (!primaryEmail) {
        return res.status(400).json({ error: "GitHub n'a fourni aucun email" });
      }
      targetUser = await prisma.user.create({
        data: {
          email: primaryEmail,
          username: profile.login,
          confirmed: true,
        },
      });
    } else if (!targetUser.confirmed) {
      // Lier un GitHub verifie a un compte existant confirme aussi ce compte
      targetUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { confirmed: true },
      });
    }

    await prisma.oAuthAccount.create({
      data: { provider: "github", providerId, userId: targetUser.id },
    });

    res.json({ token: signToken(targetUser), user: toPublicUser(targetUser) });
  } catch (err) {
    console.error("Erreur OAuth GitHub:", err);
    res.status(500).json({ error: "Erreur lors de l'authentification GitHub" });
  }
});

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

export default router;