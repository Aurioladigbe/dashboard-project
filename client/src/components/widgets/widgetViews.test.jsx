import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WIDGET_VIEWS } from "./widgetViews";

// Les données ci-dessous ont la forme EXACTE renvoyée par les services du serveur
// (weatherService, githubService, rssService).
function view(key, data, config = {}) {
  const View = WIDGET_VIEWS[key];
  return render(<View data={data} config={config} />);
}

describe("vues des widgets", () => {
  it("météo : arrondit la température", () => {
    view("weather:city_temperature", { city: "Cotonou", temperature: 26.6, unit: "°C" });
    expect(screen.getByText("Cotonou")).toBeInTheDocument();
    expect(screen.getByText("27")).toBeInTheDocument();
  });

  it("prévisions : une ligne par jour", () => {
    view("weather:forecast", {
      city: "Paris",
      days: [
        { date: "2026-09-28", tempMax: 21.4, tempMin: 12.1 },
        { date: "2026-09-29", tempMax: 19, tempMin: 10 },
        { date: "2026-09-30", tempMax: 23, tempMin: 13 },
      ],
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("12° / 21°")).toBeInTheDocument();
  });

  it("commits : message, auteur et sha court", () => {
    view("github:recent_commits", [
      { sha: "abcdef1234567890", message: "fix: corrige le timer", author: "Ada", date: "2026-09-28T10:00:00Z" },
    ]);
    expect(screen.getByText("fix: corrige le timer")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("abcdef1")).toBeInTheDocument();
  });

  it("dépôts : lien vers GitHub et nombre d'étoiles", () => {
    view("github:repo_list", [
      { name: "Hello-World", description: "Mon premier dépôt", stars: 42, url: "https://github.com/octocat/Hello-World", updatedAt: "2026-09-01T00:00:00Z" },
    ]);
    expect(screen.getByRole("link", { name: /Hello-World/ })).toHaveAttribute("href", "https://github.com/octocat/Hello-World");
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("RSS : les liens s'ouvrent dans un nouvel onglet en toute sécurité", () => {
    view("rss:article_list", [
      { title: "Un article", link: "https://exemple.org/a", publishedAt: "2026-09-28T09:00:00Z", summary: "Résumé" },
    ]);
    const link = screen.getByRole("link", { name: /Un article/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("RSS : un lien javascript: venant d'un flux n'est jamais rendu cliquable", () => {
    view("rss:article_list", [{ title: "Piégé", link: "javascript:alert(1)", publishedAt: null, summary: "" }]);
    expect(screen.getByText("Piégé")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("RSS : le HTML d'un résumé est affiché comme du texte, pas interprété", () => {
    const { container } = view("rss:article_list", [
      { title: "T", link: "https://exemple.org", publishedAt: null, summary: "<img src=x onerror=alert(1)>" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("aperçu de flux : titre du flux et de l'article", () => {
    view("rss:feed_preview", {
      feedTitle: "Le Blog",
      title: "Dernier billet",
      link: "https://exemple.org/billet",
      publishedAt: "2026-09-28T08:00:00Z",
      summary: "Début du billet",
    });
    expect(screen.getByText("Le Blog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dernier billet/ })).toBeInTheDocument();
  });

  it("crypto : prix et variation (contrat proposé)", () => {
    view("crypto:price", { coin: "bitcoin", currency: "usd", price: 64250.5, change24h: -2.5 });
    expect(screen.getByText(/64\s?250,50/)).toBeInTheDocument();
    expect(screen.getByText(/En baisse de 2\.50 %/)).toBeInTheDocument();
  });

  it("crypto : historique = courbe accessible + prix courant (contrat proposé)", () => {
    view("crypto:price_history", {
      coin: "bitcoin",
      currency: "usd",
      points: [
        { date: "2026-09-26", price: 60000 },
        { date: "2026-09-27", price: 63000 },
        { date: "2026-09-28", price: 66000 },
      ],
    });
    expect(screen.getByRole("img", { name: /Évolution du prix de bitcoin/ })).toBeInTheDocument();
    expect(screen.getByText(/\+10\.0 % sur la période/)).toBeInTheDocument();
  });

  it("listes vides : message clair", () => {
    view("github:recent_commits", []);
    expect(screen.getByText("Aucun commit.")).toBeInTheDocument();
  });
});
