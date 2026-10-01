import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Pane from "../components/ui/Pane";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Icon from "../components/ui/Icon";

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); // "ALL" | "ADMIN" | "USER"
  const [busyId, setBusyId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [notification, setNotification] = useState(null);

  // Charger la liste des utilisateurs depuis l'API Admin
  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // Notification temporaire (auto-dismiss après 4s)
  function showNotification(type, message) {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Suppression d'un utilisateur
  async function handleDelete() {
    if (!userToDelete) return;
    setBusyId(userToDelete.id);
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showNotification("success", `Utilisateur "${userToDelete.username}" supprimé avec succès.`);
      setUserToDelete(null);
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.error || "Erreur lors de la suppression de l'utilisateur."
      );
    } finally {
      setBusyId(null);
    }
  }

  // Modification du rôle d'un utilisateur
  async function handleToggleRole(targetUser) {
    const newRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    setBusyId(targetUser.id);
    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: res.data.user.role } : u))
      );
      showNotification(
        "success",
        `Rôle de "${targetUser.username}" mis à jour en ${newRole}.`
      );
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.error || "Impossible de modifier le rôle."
      );
    } finally {
      setBusyId(null);
    }
  }

  // Filtrage combiné recherche + rôle
  const filteredUsers = useMemo(() => {
    let result = users;

    if (roleFilter !== "ALL") {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [users, search, roleFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === "ADMIN").length;
    const totalStandard = users.filter((u) => u.role === "USER").length;
    const totalWidgets = users.reduce((acc, u) => acc + (u._count?.widgets || 0), 0);
    return { totalUsers, totalAdmins, totalStandard, totalWidgets };
  }, [users]);

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto">
      {/* En-tête de la page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-light-sky/20 to-light-orchid/20 text-light-sky border border-white/10 shadow-[0_0_20px_rgba(108,184,255,0.15)]">
              <Icon name="shield" size={22} />
            </span>
            <h1 className="type-display text-2xl sm:text-3xl font-semibold text-frost tracking-tight">
              Administration
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-haze">
            Gestion globale des utilisateurs, permissions et contrôle d'accès.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={fetchUsers}
          disabled={loading}
          className="self-start sm:self-auto gap-2 px-4 py-2.5"
        >
          <Icon name="refresh" size={16} className={loading ? "animate-spin text-iris" : ""} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* Notifications toast */}
      {notification && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-medium transition shadow-lg backdrop-blur-md ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-alert/30 bg-alert/10 text-alert"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon name={notification.type === "success" ? "check" : "alert"} size={18} />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-haze hover:text-frost p-1"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Cartes de statistiques (avec padding interne sur glassClassName) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Pane light="#6CB8FF" index={0} className="h-full" glassClassName="p-6 justify-between">
          <div className="flex items-center justify-between text-haze">
            <span className="text-xs font-semibold uppercase tracking-wider text-haze">
              Utilisateurs
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-light-sky/10 text-light-sky border border-light-sky/20">
              <Icon name="users" size={16} />
            </span>
          </div>
          <div className="my-2">
            <p className="type-numeral text-4xl font-light text-frost leading-none">
              {stats.totalUsers}
            </p>
            <p className="mt-2 text-xs text-haze">Inscrits sur la plateforme</p>
          </div>
        </Pane>

        <Pane light="#C58CFF" index={1} className="h-full" glassClassName="p-6 justify-between">
          <div className="flex items-center justify-between text-haze">
            <span className="text-xs font-semibold uppercase tracking-wider text-haze">
              Administrateurs
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-light-orchid/10 text-light-orchid border border-light-orchid/20">
              <Icon name="shield" size={16} />
            </span>
          </div>
          <div className="my-2">
            <p className="type-numeral text-4xl font-light text-light-orchid leading-none">
              {stats.totalAdmins}
            </p>
            <p className="mt-2 text-xs text-haze">Privilèges d'administration accordés</p>
          </div>
        </Pane>

        <Pane light="#4FE3B0" index={2} className="h-full" glassClassName="p-6 justify-between">
          <div className="flex items-center justify-between text-haze">
            <span className="text-xs font-semibold uppercase tracking-wider text-haze">
              Widgets Actifs
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-light-aurora/10 text-light-aurora border border-light-aurora/20">
              <Icon name="grid" size={16} />
            </span>
          </div>
          <div className="my-2">
            <p className="type-numeral text-4xl font-light text-teal-300 leading-none">
              {stats.totalWidgets}
            </p>
            <p className="mt-2 text-xs text-haze">Déployés sur les dashboards</p>
          </div>
        </Pane>
      </div>

      {/* Barre d'outils : Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Champ de recherche avec icône intégrée */}
        <div className="relative flex-1 max-w-lg">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-haze">
            <Icon name="search" size={17} />
          </span>
          <input
            type="text"
            placeholder="Rechercher par pseudo ou adresse email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-frost placeholder:text-haze/70 transition-colors focus:border-iris/60 focus:bg-white/[0.06] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-haze hover:text-frost"
            >
              <Icon name="x" size={15} />
            </button>
          )}
        </div>

        {/* Filtres par rôle rapides */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === "ALL"
                ? "bg-white/10 text-frost shadow-sm"
                : "text-haze hover:text-frost"
            }`}
          >
            Tous ({stats.totalUsers})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("ADMIN")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === "ADMIN"
                ? "bg-light-orchid/20 text-light-orchid shadow-sm"
                : "text-haze hover:text-frost"
            }`}
          >
            Admins ({stats.totalAdmins})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("USER")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === "USER"
                ? "bg-white/10 text-frost shadow-sm"
                : "text-haze hover:text-frost"
            }`}
          >
            Membres ({stats.totalStandard})
          </button>
        </div>
      </div>

      {/* Erreur de chargement */}
      {error && (
        <div className="rounded-xl border border-alert/30 bg-alert/10 p-4 text-sm text-alert">
          {error}
        </div>
      )}

      {/* Table des utilisateurs */}
      <div className="glass overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-haze">
              <tr>
                <th scope="col" className="px-6 py-4">Utilisateur</th>
                <th scope="col" className="px-6 py-4">Email</th>
                <th scope="col" className="px-6 py-4">Rôle</th>
                <th scope="col" className="px-6 py-4">Services & Widgets</th>
                <th scope="col" className="px-6 py-4">Inscription</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-haze">
                    <div className="flex items-center justify-center gap-3">
                      <Icon name="refresh" size={20} className="animate-spin text-light-sky" />
                      <span className="text-sm">Chargement des utilisateurs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-haze">
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const initial = String(u.username || "?").charAt(0).toUpperCase();
                  const isGithubUser = u.oauthAccounts?.some((a) => a.provider === "github");
                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.025]"
                    >
                      {/* Utilisateur */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-light-sky/80 to-light-orchid/80 text-sm font-bold text-night shadow-md"
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-frost truncate">
                                {u.username}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-iris/20 border border-iris/30 px-2 py-0.5 text-[10px] font-semibold text-iris uppercase tracking-wide">
                                  Vous
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-haze/80">
                              ID #{u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email + OAuth badge */}
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-frost font-mono text-xs">{u.email}</span>
                          <div className="flex items-center gap-2">
                            {u.confirmed ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                <Icon name="check" size={11} /> Confirmé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                                En attente
                              </span>
                            )}
                            {isGithubUser && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                                <Icon name="branch" size={11} />
                                GitHub
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="px-6 py-4.5">
                        {u.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-light-orchid/35 bg-light-orchid/15 px-3 py-1 text-xs font-semibold text-light-orchid shadow-[0_0_12px_rgba(197,140,255,0.15)]">
                            <Icon name="shield" size={13} />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-haze">
                            USER
                          </span>
                        )}
                      </td>

                      {/* Compteurs */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            title={`${u._count?.widgets || 0} widgets actifs`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-300"
                          >
                            <Icon name="grid" size={13} />
                            {u._count?.widgets || 0}
                          </span>
                          <span
                            title={`${u._count?.subscriptions || 0} services souscrits`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-light-sky/20 bg-light-sky/10 px-2.5 py-1 text-xs font-medium text-light-sky"
                          >
                            <Icon name="layers" size={13} />
                            {u._count?.subscriptions || 0}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4.5 text-xs text-haze whitespace-nowrap">
                        {createdDate}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-xs text-haze/60 italic px-2 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
                              <Icon name="lock" size={12} />
                              Protégé
                            </span>
                          ) : (
                            <>
                              {/* Bouton Rôle */}
                              <button
                                type="button"
                                disabled={busyId === u.id}
                                onClick={() => handleToggleRole(u)}
                                title={
                                  u.role === "ADMIN"
                                    ? "Rétrograder cet utilisateur en simple membre"
                                    : "Promouvoir cet utilisateur comme administrateur"
                                }
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                  u.role === "ADMIN"
                                    ? "border-white/10 bg-white/[0.04] text-haze hover:border-white/20 hover:bg-white/[0.08] hover:text-frost"
                                    : "border-light-orchid/30 bg-light-orchid/10 text-light-orchid hover:bg-light-orchid/20"
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                              >
                                {u.role === "ADMIN" ? "Rétrograder" : "Promouvoir"}
                              </button>

                              {/* Bouton Supprimer */}
                              <button
                                type="button"
                                disabled={busyId === u.id}
                                onClick={() => setUserToDelete(u)}
                                title={`Supprimer définitivement ${u.username}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-alert/30 bg-alert/[0.08] text-alert transition hover:bg-alert hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boîte modale de confirmation de suppression */}
      {userToDelete && (
        <Modal
          title="Confirmer la suppression"
          onClose={() => setUserToDelete(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-haze">
              Êtes-vous sûr de vouloir supprimer définitivement le compte de{" "}
              <strong className="text-frost">{userToDelete.username}</strong> ({userToDelete.email}) ?
            </p>

            <div className="rounded-xl border border-alert/30 bg-alert/[0.08] p-4 text-xs text-alert space-y-1.5">
              <p className="font-semibold flex items-center gap-2">
                <Icon name="alert" size={16} />
                Suppression en cascade irréversible
              </p>
              <p className="opacity-90 leading-relaxed">
                Tous les widgets créés par cet utilisateur ({userToDelete._count?.widgets || 0}), ses abonnements de services ({userToDelete._count?.subscriptions || 0}) et ses liaisons OAuth seront supprimés définitivement de la base de données.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setUserToDelete(null)}
                disabled={busyId === userToDelete.id}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={busyId === userToDelete.id}
              >
                {busyId === userToDelete.id ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
