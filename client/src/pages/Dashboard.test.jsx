import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../context/AuthContext";
import { TimerProvider } from "../context/TimerContext";
import api from "../api";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const catalog = [
  {
    name: "weather",
    requiresAuth: false,
    widgets: [{ name: "city_temperature", description: "", params: [{ name: "city", type: "string" }] }],
  },
];

const weatherWidget = {
  id: 1,
  service: "weather",
  type: "city_temperature",
  config: { city: "Cotonou" },
  refreshRate: 600,
  x: 0,
  y: 0,
  w: 3,
  h: 2,
};

function mockApi({ widgets = [weatherWidget], failWidgets = false } = {}) {
  api.get.mockImplementation(async (url) => {
    if (url === "/auth/me") return { data: { user: { id: 1, username: "MoMo" } } };
    if (url === "/widgets") {
      if (failWidgets) throw new Error("réseau");
      return { data: { widgets } };
    }
    if (url === "/services") return { data: { services: catalog } };
    if (url === "/services/mine") return { data: { subscriptions: [] } };
    if (/^\/widgets\/\d+\/data$/.test(url)) {
      return { data: { data: { city: "Cotonou", temperature: 26.6, unit: "°C" } } };
    }
    throw new Error(`URL non prévue dans le test : ${url}`);
  });
  api.patch.mockResolvedValue({ data: {} });
}

function renderDashboard() {
  localStorage.setItem("token", "fake");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TimerProvider>
          <Dashboard />
        </TimerProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("affiche les widgets de l'utilisateur avec leurs données", async () => {
    mockApi();
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Bonjour, MoMo" })).toBeInTheDocument();
    const card = await screen.findByRole("article", { name: "Température" });
    expect(await within(card).findByText("27")).toBeInTheDocument();
    expect(within(card).getByText("Météo, Cotonou")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/widgets/1/data");
  });

  it("invite à ajouter un premier widget quand le dashboard est vide", async () => {
    mockApi({ widgets: [] });
    renderDashboard();
    expect(await screen.findByText("Votre dashboard est vide")).toBeInTheDocument();
  });

  it("ajoute un widget : choisir, configurer, confirmer", async () => {
    mockApi({ widgets: [] });
    api.post.mockResolvedValue({ data: { widget: { ...weatherWidget, id: 5, config: { city: "Paris" } } } });
    renderDashboard();

    await screen.findByText("Votre dashboard est vide");
    fireEvent.click(screen.getAllByRole("button", { name: "Ajouter un widget" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "Ajouter un widget" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Température/ }));
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au dashboard" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/widgets", {
      service: "weather",
      type: "city_temperature",
      config: { city: "Paris" },
      refreshRate: 600,
      x: 0,
      y: 0,
      w: 3,
      h: 2,
    });

    // la boîte se ferme et le nouveau widget apparaît
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("article", { name: "Température" })).toBeInTheDocument();
  });

  it("supprime un widget après confirmation", async () => {
    mockApi();
    api.delete.mockResolvedValue({});
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer le widget Température" }));
    const dialog = await screen.findByRole("dialog", { name: "Supprimer ce widget ?" });
    expect(api.delete).not.toHaveBeenCalled(); // rien n'est supprimé avant la confirmation

    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/widgets/1"));
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
  });

  it("modifie la configuration d'un widget existant", async () => {
    mockApi();
    api.patch.mockResolvedValue({ data: { widget: { ...weatherWidget, config: { city: "Lyon" } } } });
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: "Modifier le widget Température" }));
    const dialog = await screen.findByRole("dialog", { name: "Modifier le widget" });
    expect(within(dialog).getByLabelText("Ville")).toHaveValue("Cotonou");

    fireEvent.change(within(dialog).getByLabelText("Ville"), { target: { value: "Lyon" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/widgets/1", { config: { city: "Lyon" }, refreshRate: 600 })
    );
    expect(await screen.findByText("Météo, Lyon")).toBeInTheDocument();
  });

  it("affiche l'erreur d'un widget sans casser le reste, avec un bouton pour réessayer", async () => {
    mockApi();
    const base = api.get.getMockImplementation();
    api.get.mockImplementation(async (url) => {
      if (url === "/widgets/1/data") {
        throw { response: { data: { error: "Ville introuvable : \"Cotonou\"" } } };
      }
      return base(url);
    });
    renderDashboard();

    const card = await screen.findByRole("article", { name: "Température" });
    expect(await within(card).findByText(/Ville introuvable/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("propose de réessayer quand le chargement échoue", async () => {
    mockApi({ failWidgets: true });
    renderDashboard();
    expect(await screen.findByText(/Impossible de charger votre dashboard/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
