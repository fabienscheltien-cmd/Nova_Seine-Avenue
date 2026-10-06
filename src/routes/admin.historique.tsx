import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, useAdminSiteId } from "@/lib/admin";
import { ConfirmButton, btnSecondary } from "@/components/admin/fields";
import { EmptyState, Loading, PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/historique")({ component: AdminHistory });

const entityLabel: Record<string, string> = {
  news: "Actualité", events: "Événement", event_templates: "Modèle d'événement", faq_themes: "Thème FAQ", faq_items: "Question FAQ",
  contacts: "Contact", services: "Service", building_info: "Vie dans les bureaux", sites: "Configuration du site",
};
// Colonnes gérées par la base, jamais réécrites lors d'une restauration.
const SYSTEM_COLUMNS = ["created_at", "updated_at", "registered_count"];

type Entry = { id: string; table_name: string; row_id: string; operation: string; old_data: Record<string, unknown>; changed_by_email: string | null; created_at: string };

function titleOf(d: Record<string, unknown>) {
  return String(d["title"] ?? d["name"] ?? d["question"] ?? d["role_label"] ?? "Sans titre");
}

/** Résumé lisible des champs principaux de la version enregistrée. */
function summary(d: Record<string, unknown>) {
  const fields: [string, string][] = [
    ["summary", "Résumé"], ["answer", "Réponse"], ["description", "Description"], ["phone", "Téléphone"], ["email", "E-mail"],
    ["hours", "Horaires"], ["reception_email", "E-mail accueil"], ["reception_phone", "Téléphone accueil"], ["booking_url", "Lien Réservations"],
    ["status", "Statut"], ["starts_at", "Début"],
  ];
  return fields
    .filter(([k]) => d[k] != null && d[k] !== "")
    .map(([k, label]) => {
      let v = String(d[k]);
      if (k === "starts_at") v = format(new Date(v), "EEE d MMM yyyy HH:mm", { locale: fr });
      return `${label} : ${v.length > 120 ? v.slice(0, 120) + "…" : v}`;
    });
}

function AdminHistory() {
  const siteId = useAdminSiteId();
  const qc = useQueryClient();
  const [table, setTable] = useState("");
  const history = useQuery({
    queryKey: ["admin", "history", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data, error } = await supabase.from("content_history").select("*").eq("site_id", siteId).gte("created_at", since)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as unknown as Entry[];
    },
  });

  const restore = async (h: Entry) => {
    const values = Object.fromEntries(Object.entries(h.old_data).filter(([k]) => !SYSTEM_COLUMNS.includes(k)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = supabase.from(h.table_name as "news") as any;
    const { error } = h.operation === "delete" ? await t.insert(values) : await t.update(values).eq("id", h.row_id);
    if (error) {
      toast.error(error.code === "23505" ? "Cet élément existe déjà : restaurez plutôt une version de modification." : "Restauration impossible");
      return;
    }
    await logActivity(siteId, `${h.table_name}.restore`, h.table_name, h.row_id, { title: titleOf(h.old_data) });
    qc.invalidateQueries();
    toast.success("Version restaurée");
  };

  const list = (history.data ?? []).filter((h) => !table || h.table_name === table);
  const tables = [...new Set((history.data ?? []).map((h) => h.table_name))];

  return (
    <div>
      <PageHeader title="Historique des modifications" subtitle="Les versions précédentes de vos contenus sont gardées 30 jours. Restaurez-en une en un clic." />
      {tables.length > 1 && (
        <div className="mb-4">
          <label htmlFor="h-table" className="sr-only">Type de contenu</label>
          <select id="h-table" value={table} onChange={(e) => setTable(e.target.value)} className="h-11 rounded-full border border-input bg-card px-4 text-sm">
            <option value="">Tous les contenus</option>
            {tables.map((t) => <option key={t} value={t}>{entityLabel[t] ?? t}</option>)}
          </select>
        </div>
      )}
      {history.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState>Aucune modification depuis 30 jours. Dès que vous modifierez ou supprimerez un contenu, l'ancienne version apparaîtra ici.</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {list.map((h) => (
            <li key={h.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {entityLabel[h.table_name] ?? h.table_name} · {titleOf(h.old_data)}
                  <span className={`ml-2 rounded-full border px-2 text-xs font-normal ${h.operation === "delete" ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground"}`}>
                    {h.operation === "delete" ? "Supprimé" : "Modifié"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(h.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}{h.changed_by_email && ` · par ${h.changed_by_email}`}
                </p>
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-brand-light">Voir la version {h.operation === "delete" ? "supprimée" : "précédente"}</summary>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {summary(h.old_data).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </details>
              </div>
              <ConfirmButton
                label="Restaurer" title="Restaurer cette version ?" confirmLabel="Restaurer"
                description={h.operation === "delete"
                  ? `« ${titleOf(h.old_data)} » sera remis en place tel qu'il était avant sa suppression.`
                  : `« ${titleOf(h.old_data)} » reprendra son contenu du ${format(new Date(h.created_at), "d MMM 'à' HH:mm", { locale: fr })}. La version actuelle restera dans l'historique.`}
                onConfirm={() => restore(h)}
                destructive={false}
                className={btnSecondary}
              >
                <Undo2 className="h-4 w-4" aria-hidden /> Restaurer
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
