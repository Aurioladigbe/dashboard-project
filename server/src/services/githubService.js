const GITHUB_API_BASE_URL = "https://api.github.com";
const VALID_REPO_SORTS = ["updated", "created", "pushed", "full_name"];

function createServiceError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function fetchGitHub(url, notFoundMessage) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Dashboard-Epitech",
      },
    });
  } catch (err) {
    throw createServiceError(
      `Service GitHub injoignable : ${err.message}`,
      502
    );
  }

  if (response.status === 404) {
    throw createServiceError(notFoundMessage, 404);
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    let apiMessage = "";
    try {
      const errBody = await response.json();
      apiMessage = errBody?.message || "";
    } catch {
      // ignore JSON parse error on error body
    }

    if (remaining === "0" || apiMessage.toLowerCase().includes("rate limit")) {
      throw createServiceError(
        "Limite de requêtes de l'API GitHub dépassée (rate limit)",
        403
      );
    }

    throw createServiceError(
      apiMessage
        ? `Accès refusé par l'API GitHub : ${apiMessage}`
        : "Accès refusé par l'API GitHub",
      403
    );
  }

  if (!response.ok) {
    throw createServiceError(
      `Erreur de l'API GitHub (HTTP ${response.status})`,
      502
    );
  }

  try {
    return await response.json();
  } catch {
    throw createServiceError(
      "Réponse invalide reçue depuis l'API GitHub",
      502
    );
  }
}

/**
 * Récupère les N derniers commits d'un dépôt GitHub ("owner/repo").
 * @param {string} repoFullName
 * @param {number|string} count
 * @returns {Promise<Array<{ sha: string, message: string, author: string, date: string | null }>>}
 */
export async function getRecentCommits(repoFullName, count) {
  if (!repoFullName || typeof repoFullName !== "string") {
    throw createServiceError(
      'Le paramètre repo est requis (format "owner/repo")',
      400
    );
  }

  const parts = repoFullName.trim().split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw createServiceError(
      'Le paramètre repo doit être au format "owner/repo"',
      400
    );
  }
  const [owner, repo] = parts;

  const numCount = Number(count);
  if (!Number.isInteger(numCount) || numCount < 1 || numCount > 100) {
    throw createServiceError(
      "Le paramètre count doit être un entier compris entre 1 et 100",
      400
    );
  }

  const params = new URLSearchParams({ per_page: String(numCount) });
  const url = `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params.toString()}`;

  const data = await fetchGitHub(
    url,
    `Dépôt GitHub introuvable : "${owner}/${repo}"`
  );

  if (!Array.isArray(data)) {
    throw createServiceError(
      "Format de commits inattendu reçu depuis l'API GitHub",
      502
    );
  }

  return data.slice(0, numCount).map((item) => ({
    sha: item.sha,
    message: (item.commit?.message || "").split(/\r?\n/)[0].trim(),
    author: item.commit?.author?.name || item.author?.login || "Inconnu",
    date: item.commit?.author?.date || null,
  }));
}

/**
 * Récupère la liste des dépôts publics d'un utilisateur GitHub.
 * @param {string} username
 * @param {string} sort
 * @returns {Promise<Array<{ name: string, description: string | null, stars: number, url: string, updatedAt: string }>>}
 */
export async function getRepoList(username, sort = "updated") {
  if (!username || typeof username !== "string" || !username.trim()) {
    throw createServiceError("Le paramètre username est requis", 400);
  }

  const normalizedSort = typeof sort === "string" ? sort.trim() : "";
  if (!VALID_REPO_SORTS.includes(normalizedSort)) {
    throw createServiceError(
      `Le paramètre sort doit être l'une des valeurs suivantes : ${VALID_REPO_SORTS.join(", ")}`,
      400
    );
  }

  const cleanUsername = username.trim();
  const params = new URLSearchParams({
    sort: normalizedSort,
    per_page: "20",
  });
  const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(cleanUsername)}/repos?${params.toString()}`;

  const data = await fetchGitHub(
    url,
    `Utilisateur GitHub introuvable : "${cleanUsername}"`
  );

  if (!Array.isArray(data)) {
    throw createServiceError(
      "Format de dépôts inattendu reçu depuis l'API GitHub",
      502
    );
  }

  return data.map((repo) => ({
    name: repo.name,
    description: repo.description ?? null,
    stars: repo.stargazers_count ?? 0,
    url: repo.html_url,
    updatedAt: repo.updated_at,
  }));
}
