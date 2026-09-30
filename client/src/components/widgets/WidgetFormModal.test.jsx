import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WidgetFormModal from "./WidgetFormModal";

const catalog = [
  {
    name: "weather",
    requiresAuth: false,
    widgets: [
      { name: "city_temperature", description: "", params: [{ name: "city", type: "string" }] },
      {
        name: "forecast",
        description: "",
        params: [
          { name: "city", type: "string" },
          { name: "days", type: "integer" },
        ],
      },
    ],
  },
  {
    name: "github",
    requiresAuth: true,
    widgets: [
      {
        name: "recent_commits",
        description: "",
        params: [
          { name: "repo", type: "string" },
          { name: "count", type: "integer" },
        ],
      },
    ],
  },
];

function renderModal(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  const onClose = props.onClose ?? vi.fn();
  render(
    <MemoryRouter>
      <WidgetFormModal catalog={catalog} subscribed={new Set()} onSubmit={onSubmit} onClose={onClose} {...props} />
    </MemoryRouter>
  );
  return { onSubmit, onClose };
}

describe("WidgetFormModal — ajout", () => {
  it("liste les widgets du catalogue et verrouille ceux d'un service non souscrit", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Ajouter un widget" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Température/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Prévisions/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Derniers commits/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Gérer mes services" })).toHaveAttribute("href", "/services");
  });

  it("déverrouille un service auquel l'utilisateur est abonné", () => {
    renderModal({ subscribed: new Set(["github"]) });
    expect(screen.getByRole("button", { name: /Derniers commits/ })).toBeEnabled();
  });

  it("génère le formulaire depuis les paramètres et envoie une config typée", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Prévisions/ }));

    // un champ par paramètre du catalogue, "days" est un nombre prérempli
    const city = screen.getByLabelText("Ville");
    const days = screen.getByLabelText("Nombre de jours");
    expect(days).toHaveAttribute("type", "number");
    expect(days).toHaveValue(5);

    fireEvent.change(city, { target: { value: "  Cotonou " } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au dashboard" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      service: "weather",
      type: "forecast",
      config: { city: "Cotonou", days: 5 }, // texte nettoyé, entier converti en nombre
      refreshRate: 600,
    });
  });

  it("refuse un formulaire incomplet ou hors bornes", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Prévisions/ }));

    fireEvent.click(screen.getByRole("button", { name: "Ajouter au dashboard" }));
    expect(await screen.findByText("Ce champ est obligatoire.")).toBeInTheDocument();
    expect(screen.getByLabelText("Ville")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Paris" } });
    fireEvent.change(screen.getByLabelText("Nombre de jours"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au dashboard" }));
    expect(await screen.findByText("Saisissez un nombre entre 1 et 16.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("affiche le message d'erreur renvoyé par le serveur", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { data: { error: "Paramètre requis manquant" } } });
    renderModal({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /^Température/ }));
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au dashboard" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Paramètre requis manquant");
  });

  it("se ferme avec Échap", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("filtre les widgets par recherche, sans tenir compte des accents", () => {
    renderModal();
    const search = screen.getByLabelText("Rechercher un widget");
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "previsions" } });
    expect(screen.getByRole("button", { name: /^Prévisions/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Température/ })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(/Aucun widget ne correspond/)).toBeInTheDocument();
  });

  it("permet de revenir au choix du widget", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /^Température/ }));
    fireEvent.click(screen.getByRole("button", { name: "Changer de widget" }));
    expect(screen.getByRole("dialog", { name: "Ajouter un widget" })).toBeInTheDocument();
  });
});

describe("WidgetFormModal — modification", () => {
  const widget = { id: 7, service: "weather", type: "forecast", config: { city: "Paris", days: 3 }, refreshRate: 60 };

  it("préremplit la configuration actuelle et propose « Enregistrer »", async () => {
    const { onSubmit } = renderModal({ widget });
    const dialog = screen.getByRole("dialog", { name: "Modifier le widget" });

    expect(within(dialog).getByLabelText("Ville")).toHaveValue("Paris");
    expect(within(dialog).getByLabelText("Nombre de jours")).toHaveValue(3);
    expect(within(dialog).getByLabelText("Actualisation")).toHaveValue("60");
    expect(within(dialog).queryByRole("button", { name: "Changer de widget" })).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Ville"), { target: { value: "Lyon" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      service: "weather",
      type: "forecast",
      config: { city: "Lyon", days: 3 },
      refreshRate: 60,
    });
  });
});
