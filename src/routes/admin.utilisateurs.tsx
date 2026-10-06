import { createFileRoute } from "@tanstack/react-router";
import { useId, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { KeyRound, Pause, Play, Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAdminSite } from "@/lib/admin-site";
import { createUser, deleteUser, grantRole, listUsers, removeRole, resetUserAccess, setUserSuspended } from "@/lib/admin.functions";
import { ConfirmButton, FieldShell, btnPrimary, btnSecondary, inputCls } from "@/components/admin/fields";
import { EmptyState, Loading, PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/utilisateurs")({ component: AdminUsers });

type Role = "occupant" | "site_admin" | "super_admin";
const roleLabel: Record<Role, string> = { occupant: "Occupant", site_admin: "Admin de site", super_admin: "Super-admin" };

function useAction() {
  const qc = useQueryClient();
  return async (run: () => Promise<unknown>, success: string) => {
    try { await run(); toast.success(success); qc.invalidateQueries({ queryKey: ["admin", "users"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Action impossible"); }
  };
}

function RolePicker({ sites, onPick, submitLabel }: { sites: { id: string; name: string }[]; onPick: (role: Role, siteId: string | null) => void; submitLabel: string }) {
  const [role, setRole] = useState<Role>("site_admin");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const uid = useId();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="sr-only" htmlFor={`${uid}-role`}>Rôle</label>
        <select id={`${uid}-role`} value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-11 rounded-full border border-input bg-background px-3 text-sm">
          <option value="site_admin">Admin de site</option>
          <option value="super_admin">Super-admin</option>
          <option value="occupant">Occupant</option>
        </select>
      </div>
      {role === "site_admin" && (
        <div>
          <label className="sr-only" htmlFor={`${uid}-site`}>Site</label>
          <select id={`${uid}-site`} value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-11 rounded-full border border-input bg-background px-3 text-sm">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      <button type="button" onClick={() => onPick(role, role === "site_admin" ? siteId : null)} className={btnSecondary}>
        <Plus className="h-4 w-4" aria-hidden /> {submitLabel}
      </button>
    </div>
  );
}

function AdminUsers() {
  const { isSuperAdmin } = useAuth();
  const { sites } = useAdminSite();
  const fns = {
    list: useServerFn(listUsers), create: useServerFn(createUser), grant: useServerFn(grantRole), remove: useServerFn(removeRole),
    suspend: useServerFn(setUserSuspended), reset: useServerFn(resetUserAccess), del: useServerFn(deleteUser),
  };
  const act = useAction();
  const users = useQuery({ queryKey: ["admin", "users"], enabled: isSuperAdmin, queryFn: () => fns.list() });
  const [q, setQ] = useState("");
  const [newRole, setNewRole] = useState<Role>("occupant");
  const [newSite, setNewSite] = useState(sites[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const siteName = (id: string | null) => sites.find((s) => s.id === id)?.name ?? "site supprimé";
  const redirectTo = typeof window === "undefined" ? "" : `${window.location.origin}/compte`;

  if (!isSuperAdmin) return <EmptyState>Cette page est réservée aux super-admins NOVA.</EmptyState>;

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailValue = String(new FormData(form).get("email"));
    setBusy(true);
    await act(() => fns.create({ data: { email: emailValue, role: newRole, siteId: newRole === "site_admin" ? newSite : null, redirectTo } }),
      "Compte créé : une invitation a été envoyée.");
    setBusy(false);
    form.reset();
  };

  const needle = q.trim().toLowerCase();
  const list = (users.data?.users ?? []).filter((u) => !needle || `${u.email} ${u.name} ${u.company}`.toLowerCase().includes(needle))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Tous les comptes, tous sites confondus. Personne ne voit ni ne définit le mot de passe d'un autre : seule la réinitialisation est possible." />

      <form onSubmit={create} className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Créer un compte</h2>
        <FieldShell id="u-email" label="Adresse e-mail" required help="La personne reçoit une invitation et se connecte par lien magique.">
          <input id="u-email" name="email" type="email" required placeholder="prenom.nom@exemple.fr" className={inputCls} />
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id="u-role" label="Rôle">
            <select id="u-role" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className={inputCls}>
              <option value="occupant">Occupant</option>
              <option value="site_admin">Admin de site</option>
              <option value="super_admin">Super-admin</option>
            </select>
          </FieldShell>
          {newRole === "site_admin" && (
            <FieldShell id="u-site" label="Site confié">
              <select id="u-site" value={newSite} onChange={(e) => setNewSite(e.target.value)} className={inputCls}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FieldShell>
          )}
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden /> {busy ? "Création…" : "Créer et inviter"}</button>
      </form>

      <div className="relative mb-4">
        <label htmlFor="u-q" className="sr-only">Rechercher un compte</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input id="u-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par e-mail, nom ou entreprise…" className="h-11 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm" />
      </div>

      {users.isLoading ? <Loading /> : users.isError ? <EmptyState>Impossible de charger les comptes.</EmptyState> : list.length === 0 ? (
        <EmptyState>{needle ? `Aucun compte pour « ${q} ».` : "Aucun compte."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((u) => (
            <li key={u.id} className={`rounded-2xl border bg-card p-4 ${u.suspended ? "border-warning/50" : "border-border"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {u.name || u.email}{u.isMe && <span className="ml-2 text-sm font-normal text-muted-foreground">(vous)</span>}
                    {u.suspended && <span className="ml-2 rounded-full border border-warning/50 px-2 text-xs text-warning">Suspendu</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[u.name && u.email, u.company, u.last_sign_in_at ? `dernière connexion le ${format(new Date(u.last_sign_in_at), "d MMM yyyy", { locale: fr })}` : "jamais connecté"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {!u.isMe && (
                  <div className="flex flex-wrap gap-1.5">
                    <ConfirmButton label="Réinitialiser l'accès" title="Réinitialiser l'accès ?" confirmLabel="Réinitialiser" destructive={false}
                      description={`Toutes les sessions de ${u.email} seront fermées et un nouveau lien de connexion lui sera envoyé.`}
                      onConfirm={() => act(() => fns.reset({ data: { userId: u.id, redirectTo } }), "Sessions fermées, nouveau lien envoyé")}
                      className={btnSecondary}>
                      <KeyRound className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Nouveau lien</span>
                    </ConfirmButton>
                    <ConfirmButton label={u.suspended ? "Réactiver" : "Suspendre"} title={u.suspended ? "Réactiver ce compte ?" : "Suspendre ce compte ?"}
                      confirmLabel={u.suspended ? "Réactiver" : "Suspendre"} destructive={!u.suspended}
                      description={u.suspended ? `${u.email} pourra de nouveau se connecter.` : `${u.email} sera déconnecté partout et ne pourra plus se connecter jusqu'à sa réactivation.`}
                      onConfirm={() => act(() => fns.suspend({ data: { userId: u.id, suspended: !u.suspended } }), u.suspended ? "Compte réactivé" : "Compte suspendu")}
                      className={btnSecondary}>
                      {u.suspended ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                      <span className="hidden sm:inline">{u.suspended ? "Réactiver" : "Suspendre"}</span>
                    </ConfirmButton>
                    <ConfirmButton label="Supprimer le compte" title="Supprimer ce compte ?"
                      description={`Le compte ${u.email}, son profil et ses inscriptions seront supprimés définitivement.`}
                      onConfirm={() => act(() => fns.del({ data: { userId: u.id } }), "Compte supprimé")} />
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {u.roles.map((r) => (
                  <span key={r.id} className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background pl-3 pr-1 text-sm">
                    {roleLabel[r.role]}{r.role === "site_admin" && ` · ${siteName(r.site_id)}`}
                    <ConfirmButton label={`Retirer le rôle ${roleLabel[r.role]}`} title="Retirer ce rôle ?" confirmLabel="Retirer"
                      description={`${u.email} perdra le rôle « ${roleLabel[r.role]}${r.role === "site_admin" ? ` · ${siteName(r.site_id)}` : ""} ».`}
                      onConfirm={() => act(() => fns.remove({ data: { roleId: r.id } }), "Rôle retiré")}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-high">
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </ConfirmButton>
                  </span>
                ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand-light">Ajouter un rôle</summary>
                <div className="mt-2">
                  <RolePicker sites={sites} submitLabel="Attribuer"
                    onPick={(role, siteId) => act(() => fns.grant({ data: { userId: u.id, role, siteId } }), "Rôle attribué")} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {!!users.data?.invitations.length && (
        <>
          <h2 className="mb-2 mt-8 text-lg font-semibold">Invitations en attente de première connexion</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {users.data.invitations.map((i) => (
              <li key={i.id} className="px-4 py-3 text-sm">
                <span className="font-semibold">{i.email}</span> · {roleLabel[i.role]}{i.role === "site_admin" && ` · ${siteName(i.site_id)}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
