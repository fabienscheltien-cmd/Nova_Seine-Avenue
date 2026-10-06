import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSiteId } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/journal")({ component: AdminLog });

const entityLabel: Record<string, string> = {
  news: "Actualité", events: "Événement", event_categories: "Catégorie", event_locations: "Lieu", event_templates: "Modèle",
  faq_themes: "Thème FAQ", faq_items: "Question FAQ", contacts: "Contact", services: "Service", building_info: "Page « Vie dans les bureaux »",
  contact_messages: "Message", sites: "Configuration", user_roles: "Accès", role_invitations: "Invitation", profiles: "Compte",
};
const verbLabel: Record<string, string> = {
  create: "création", update: "modification", delete: "suppression", duplicate: "duplication", hide: "masquage", show: "affichage",
  cancel: "annulation", create_series: "création d'une série", update_series: "modification d'une série", delete_series: "suppression d'une série",
  new: "remis à traiter", handled: "traité", grant: "accès accordé", revoke: "accès retiré", accepted: "rôle activé",
  invitation_cancelled: "invitation annulée", deleted: "suppression",
};

function describe(action: string, entity: string | null) {
  const verb = action.split(".").pop() ?? action;
  return `${entityLabel[entity ?? ""] ?? entity ?? ""} — ${verbLabel[verb] ?? verb}`;
}

function AdminLog() {
  const siteId = useAdminSiteId();
  const { isSuperAdmin } = useAuth();
  const log = useQuery({
    queryKey: ["admin", "log", siteId, isSuperAdmin],
    enabled: !!siteId,
    queryFn: async () => {
      let q = supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(300);
      if (!isSuperAdmin) q = q.eq("site_id", siteId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Journal d'activité" subtitle={isSuperAdmin ? "Les 300 dernières actions, tous sites confondus." : "Les 300 dernières actions sur ce site."} />
      {log.isLoading ? <Loading /> : !log.data?.length ? <EmptyState>Aucune action enregistrée pour l'instant.</EmptyState> : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {log.data.map((l) => {
            const details = (l.details ?? {}) as Record<string, unknown>;
            const subject = details["title"] ?? details["email"];
            return (
              <li key={l.id} className="flex flex-wrap gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
                <time dateTime={l.created_at} className="w-36 shrink-0 text-muted-foreground">{format(new Date(l.created_at), "d MMM yyyy HH:mm", { locale: fr })}</time>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{describe(l.action, l.entity)}</span>
                  {subject != null && <span className="text-muted-foreground"> · {String(subject)}</span>}
                </span>
                <span className="text-muted-foreground">{l.actor_email ?? "Système"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
