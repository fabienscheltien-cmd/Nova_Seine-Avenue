import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAdminSiteId } from "@/lib/admin";
import { inviteSiteAccess, listSiteAccess, revokeSiteAccess } from "@/lib/admin.functions";
import { ConfirmButton, FieldShell, btnPrimary, inputCls } from "@/components/admin/fields";
import { EmptyState, Loading, PageHeader, SectionTitle } from "@/components/common";

export const Route = createFileRoute("/admin/acces")({ component: AdminAccess });

const roleLabel = { site_admin: "Gestionnaire du site", super_admin: "Super-admin NOVA", occupant: "Occupant" } as const;

function AdminAccess() {
  const siteId = useAdminSiteId();
  const qc = useQueryClient();
  const list = useServerFn(listSiteAccess);
  const invite = useServerFn(inviteSiteAccess);
  const revoke = useServerFn(revokeSiteAccess);
  const access = useQuery({ queryKey: ["admin", "access", siteId], enabled: !!siteId, queryFn: () => list({ data: { siteId } }) });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "access"] });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const res = await invite({ data: {
        siteId, email: String(f.get("email")), role: f.get("role") === "super_admin" ? "super_admin" : "site_admin",
        redirectTo: `${window.location.origin}/admin`,
      } });
      toast.success(res.pending ? "Invitation envoyée : l'accès sera actif à sa première connexion." : "Accès accordé.");
      form.reset();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invitation impossible");
    } finally { setBusy(false); }
  };

  const remove = async (input: { roleId?: string; invitationId?: string }) => {
    try { await revoke({ data: { siteId, ...input } }); toast.success("Accès retiré"); refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Action impossible"); }
  };

  const data = access.data;
  return (
    <div>
      <PageHeader title="Accès" subtitle="Qui peut gérer ce site. Invitez par exemple une remplaçante pendant vos congés." />
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Inviter un gestionnaire</h2>
        <FieldShell id="a-email" label="Adresse e-mail" required help="La personne reçoit un lien de connexion. Aucun mot de passe n'est nécessaire.">
          <input id="a-email" name="email" type="email" required placeholder="prenom.nom@exemple.fr" className={inputCls} />
        </FieldShell>
        {data?.canManageSuperAdmins && (
          <FieldShell id="a-role" label="Rôle">
            <select id="a-role" name="role" defaultValue="site_admin" className={inputCls}>
              <option value="site_admin">Gestionnaire de ce site</option>
              <option value="super_admin">Super-admin NOVA (tous les sites)</option>
            </select>
          </FieldShell>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden /> {busy ? "Envoi…" : "Inviter"}</button>
      </form>

      <SectionTitle>Personnes ayant accès</SectionTitle>
      {access.isLoading ? <Loading /> : access.isError ? <EmptyState>Impossible de charger la liste des accès.</EmptyState> : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data?.members.map((m) => {
            const canRemove = !m.isMe && (m.role === "site_admin" || data.canManageSuperAdmins);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name || m.email || "Compte sans e-mail"}{m.isMe && <span className="ml-2 text-sm font-normal text-muted-foreground">(vous)</span>}</p>
                  <p className="text-sm text-muted-foreground">{[m.name && m.email, roleLabel[m.role]].filter(Boolean).join(" · ")}</p>
                </div>
                {canRemove && (
                  <ConfirmButton label="Retirer l'accès" title="Retirer cet accès ?" confirmLabel="Retirer"
                    description={`${m.email || "Cette personne"} ne pourra plus gérer ${m.role === "super_admin" ? "aucun site" : "ce site"}. Son compte occupant est conservé.`}
                    onConfirm={() => remove({ roleId: m.id })} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!data?.invitations.length && (
        <>
          <SectionTitle>Invitations en attente</SectionTitle>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {data.invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{i.email}</p>
                  <p className="text-sm text-muted-foreground">{roleLabel[i.role]} · en attente de première connexion</p>
                </div>
                {(i.role === "site_admin" || data.canManageSuperAdmins) && (
                  <ConfirmButton label="Annuler l'invitation" title="Annuler cette invitation ?" confirmLabel="Annuler l'invitation"
                    description={`${i.email} ne recevra pas d'accès de gestion.`} onConfirm={() => remove({ invitationId: i.id })} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
