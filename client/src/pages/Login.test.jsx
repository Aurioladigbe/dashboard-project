import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { AuthProvider } from "../context/AuthContext";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(() => Promise.reject(new Error("no session"))),
    post: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockImplementation(() => Promise.reject(new Error("no session")));
  });

  it("renders the login form", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("logs the user in and stores the token on success", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "fake-jwt", user: { id: 1, email: "a@b.com" } },
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        email: "a@b.com",
        password: "secret",
      });
    });
    expect(localStorage.getItem("token")).toBe("fake-jwt");
  });

  it("shows an error message when login fails", async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: "Identifiants invalides" } },
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Identifiants invalides")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
