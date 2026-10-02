import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRegisterInput, validateLoginInput } from "../utils/validators.js";
import { sendConfirmationEmail } from "../services/emailService.js";

const router = Router();

// Limiteurs de débit (Rate Limiters) pour contrer les attaques par brute-force
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Trop de requêtes d'authentification. Veuillez patienter 15 minutes.",
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de tentatives de connexion infructueuses. Veuillez patienter 15 minutes.",
});

const confirmLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Trop de tentatives de confirmation d'email. Veuillez patienter 15 minutes.",
});

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
router.post("/register", authLimiter, async (req, res) => {
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

  const appBaseUrl = (
    process.env.APP_BASE_URL ||
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
  const confirmUrl = `${appBaseUrl}/api/auth/confirm/${confirmToken}`;

  try {
    await sendConfirmationEmail(user.email, confirmUrl);
  } catch (err) {
    // On ne bloque jamais la création de compte si l'email échoue
    console.error("Echec envoi email de confirmation:", err.message);
  }

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

// GET /api/auth/confirm/:token
router.get("/confirm/:token", confirmLimiter, async (req, res) => {
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

// Hash factice pour neutraliser les attaques par analyse de temps (Timing Attacks)
const DUMMY_HASH = "$2a$10$e846V6L7P7L2m3wR5iU8Q.K5g5p5j5o5n5m5l5k5j5i5h5g5f5e5d";

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  const validationError = validateLoginInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const email = req.body.email.trim();
  const { password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  // Protection contre le timing attack : compare toujours le hash même si le compte n'existe pas
  const hashToCompare = user?.password || DUMMY_HASH;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !user.password || !valid) {
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

function respondOAuthError(req, res, clientUrl, status, message) {
  if (
    req.headers.accept?.includes("text/html") ||
    !req.headers.accept?.includes("application/json")
  ) {
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(message)}`);
  }
  return res.status(status).json({ error: message });
}

// GET /api/auth/github
// ?token=<jwt existant> optionnel : si present, on lie le compte GitHub
// a l'utilisateur deja connecte plutot que d'en creer/chercher un autre
router.get("/github", authLimiter, (req, res) => {
  // Generation d'un state cryptographique anti-CSRF valable 10 minutes
  const signedState = jwt.sign(
    {
      purpose: "oauth_github_csrf",
      userToken: req.query.token || null,
      nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  const appBaseUrl = (
    process.env.APP_BASE_URL ||
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${appBaseUrl}/api/auth/github/callback`,
    scope: "user:email,repo",
    state: signedState,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback
router.get("/github/callback", authLimiter, async (req, res) => {
  const { code, state, error: ghError, error_description } = req.query;
  const clientUrl = (
    process.env.CLIENT_URL ||
    process.env.CLIENT_BASE_URL ||
    "http://localhost:8081"
  ).replace(/\/+$/, "");

  const appBaseUrl = (
    process.env.APP_BASE_URL ||
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");

  // Si l'utilisateur annule ou refuse l'autorisation sur GitHub
  if (ghError) {
    return respondOAuthError(
      req,
      res,
      clientUrl,
      400,
      error_description || "Connexion via GitHub annulée"
    );
  }

  if (!code || !state) {
    return respondOAuthError(
      req,
      res,
      clientUrl,
      400,
      "Code OAuth ou paramètre state manquant"
    );
  }

  // 1. Validation cryptographique stricte du state (Protection anti-CSRF)
  let statePayload;
  try {
    statePayload = jwt.verify(state, process.env.JWT_SECRET);
    if (statePayload.purpose !== "oauth_github_csrf") {
      throw new Error("Invalid state purpose");
    }
  } catch {
    return respondOAuthError(
      req,
      res,
      clientUrl,
      400,
      "Session OAuth expirée ou tentative CSRF détectée. Veuillez recommencer."
    );
  }

  try {
    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${appBaseUrl}/api/auth/github/callback`,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return respondOAuthError(
        req,
        res,
        clientUrl,
        400,
        "Échange du code OAuth échoué auprès de GitHub"
      );
    }

    const profileResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Dashboard-Epitech",
      },
    });
    const profile = await profileResp.json();
    const providerId = String(profile.id);

    let emailsResp = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Dashboard-Epitech",
      },
    });
    const emails = await emailsResp.json();

    // 2. Vérification stricte : l'email doit impérativement être VÉRIFIÉ chez GitHub
    const verifiedEmail = Array.isArray(emails)
      ? emails.find((e) => e.primary && e.verified)?.email ||
        emails.find((e) => e.verified)?.email ||
        null
      : null;

    if (!verifiedEmail) {
      return respondOAuthError(
        req,
        res,
        clientUrl,
        400,
        "Votre compte GitHub ne possède aucun email vérifié. Veuillez vérifier votre adresse sur GitHub."
      );
    }

    // 3. Le compte GitHub est-il déjà lié à quelqu'un ?
    let account = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: "github", providerId } },
      include: { user: true },
    });

    let targetUser = account ? account.user : null;

    // 4. Si un utilisateur était déjà connecté (statePayload.userToken) -> on lie son compte
    if (!targetUser && statePayload.userToken) {
      try {
        const payload = jwt.verify(statePayload.userToken, process.env.JWT_SECRET);
        targetUser = await prisma.user.findUnique({ where: { id: payload.id } });
      } catch {
        // userToken expiré ou invalide -> on continue sans utilisateur cible
      }
    }

    // 5. Sinon, un compte avec le même email vérifié existe déjà (créé via register) ? -> on lie
    if (!targetUser) {
      targetUser = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    }

    // 6. Sinon, on crée un nouvel utilisateur avec garantie d'unicité sur le username
    if (!targetUser) {
      const baseUsername = (profile.login || "github_user")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 15);
      let uniqueUsername = baseUsername;

      // Boucle sécurisée pour éviter les collisions avec la contrainte @unique de schema.prisma
      let tries = 0;
      while (
        (await prisma.user.findUnique({ where: { username: uniqueUsername } })) &&
        tries < 5
      ) {
        uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
        tries++;
      }

      targetUser = await prisma.user.create({
        data: {
          email: verifiedEmail,
          username: uniqueUsername,
          confirmed: true,
        },
      });
    } else if (!targetUser.confirmed) {
      // Lier un GitHub avec email vérifié confirme aussi ce compte
      targetUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { confirmed: true },
      });
    }

    // Lie le compte OAuth si ce n'était pas déjà fait
    if (!account) {
      await prisma.oAuthAccount.create({
        data: { provider: "github", providerId, userId: targetUser.id },
      });
    }

    const activeUser = targetUser;

    // 7. Enregistre automatiquement le token GitHub dans les abonnements
    // pour que les widgets GitHub de l'utilisateur fonctionnent immédiatement
    try {
      await prisma.serviceSubscription.upsert({
        where: { userId_service: { userId: activeUser.id, service: "github" } },
        update: { credentials: { token: tokenData.access_token } },
        create: {
          userId: activeUser.id,
          service: "github",
          credentials: { token: tokenData.access_token },
        },
      });
    } catch (subErr) {
      console.error("Avertissement: liaison ServiceSubscription github échouée:", subErr.message);
    }

    const sessionToken = signToken(activeUser);

    // Redirige vers le frontend avec le token de session
    if (
      req.headers.accept?.includes("text/html") ||
      !req.headers.accept?.includes("application/json")
    ) {
      return res.redirect(`${clientUrl}/login?token=${sessionToken}`);
    }

    res.json({ token: sessionToken, user: toPublicUser(activeUser) });
  } catch (err) {
    console.error("Erreur OAuth GitHub:", err);
    return respondOAuthError(
      req,
      res,
      clientUrl,
      500,
      "Erreur lors de l'authentification GitHub"
    );
  }
});

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

export default router;