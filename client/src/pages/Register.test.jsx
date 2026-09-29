import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import { AuthProvider } from "../context/AuthContext";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(() => Promise.reject(new Error("no session"))),
    post: vi.fn(),
  },
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), { target: { value: "MoMo" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "momo@exemple.org" } });
  fireEvent.change(screen.getByPlaceholderText("Mot de passe"), { target: { value: "secret123" } });
}

describe("Register page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockImplementation(() => Promise.reject(new Error("no session")));
  });

  it("connecte directement l'utilisateur quand le compte est déjà confirmé", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "fake-jwt", user: { id: 1, username: "MoMo", confirmed: true } },
    });
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("fake-jwt");
  });

  it("affiche un écran d'attente et NE connecte PAS l'utilisateur si le compte n'est pas confirmé", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "fake-jwt", user: { id: 1, username: "MoMo", confirmed: false } },
    });
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByText(/Vérifiez vos emails/)).toBeInTheDocument();
    expect(screen.getByText("momo@exemple.org")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("affiche l'erreur du serveur sans planter", async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: "Cet email est déjà utilisé" } } });
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByText("Cet email est déjà utilisé")).toBeInTheDocument();
  });
});
