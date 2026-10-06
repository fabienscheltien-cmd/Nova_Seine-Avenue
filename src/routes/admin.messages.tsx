import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAdminRows, useAdminSiteId, useDeleteRow, useSaveRow, type Row } from "@/lib/admin";
import { useSite } from "@/lib/site";
import { ConfirmButton, btnPrimary, btnSecondary } from "@/components/admin/fields";
import { EmptyState, Loading, PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/messages")({ component: AdminMessages });

function AdminMessages() {
  const siteId = useAdminSiteId();
  const { data: site } = useSite();
  const rows = useAdminRows("contact_messages", siteId, { column: "created_at", ascending: false });
  const save = useSaveRow("contact_messages", siteId);
  const del = useDeleteRow("contact_messages", siteId);
  const [filter, setFilter] = useState<"new" | "handled" | "all">("new");
  const [open, setOpen] = useState<string | null>(null);

  const list = (rows.data ?? []).filter((m) => filter === "all" || m.status === filter);
  const setStatus = (m: Row<"contact_messages">, status: "new" | "handled") =>
    save.mutate({ id: m.id, values: { status }, action: `contact_messages.${status}` },
      { onSuccess: () => toast.success(status === "handled" ? "Marqué comme traité" : "Remis à traiter") });

  const replyLink = (m: Row<"contact_messages">) => {
    const quoted = m.message.split("\n").map((l) => `> ${l}`).join("\n");
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re : ${m.subject}`)}&body=${encodeURIComponent(
      `Bonjour ${m.name},\n\n\n\nBien cordialement,\nL'accueil ${site?.name ?? ""}\n\n${quoted}`)}`;
  };

  const counts = {
    new: (rows.data ?? []).filter((m) => m.status === "new").length,
    handled: (rows.data ?? []).filter((m) => m.status === "handled").length,
    all: rows.data?.length ?? 0,
  };

  return (
    <div>
      <PageHeader title="Messages reçus" subtitle="Les messages envoyés depuis le formulaire « Nous contacter »." />
      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
        {([["new", "À traiter"], ["handled", "Traités"], ["all", "Tous"]] as const).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
            className={`h-9 rounded-full px-4 text-sm font-semibold ${filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {label} ({counts[v]})
          </button>
        ))}
      </div>
      {rows.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState>{filter === "new" ? "Aucun message à traiter. Tout est à jour !" : "Aucun message."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => {
            const expanded = open === m.id;
            return (
              <li key={m.id} className="rounded-2xl border border-border bg-card">
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : m.id)} className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-left">
                  {m.status === "new" && <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-label="Nouveau" />}
                  <span className="font-semibold">{m.subject}</span>
                  <span className="text-sm text-muted-foreground">{m.name} · {format(new Date(m.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                </button>
                {expanded && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-sm text-muted-foreground">De : {m.name} &lt;{m.email}&gt;</p>
                    <p className="mt-3 whitespace-pre-line">{m.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={replyLink(m)} className={btnPrimary} onClick={() => m.status === "new" && setStatus(m, "handled")}>
                        <Mail className="h-4 w-4" aria-hidden /> Répondre par e-mail
                      </a>
                      {m.status === "new" ? (
                        <button type="button" onClick={() => setStatus(m, "handled")} className={btnSecondary}><CheckCircle2 className="h-4 w-4" aria-hidden /> Marquer comme traité</button>
                      ) : (
                        <button type="button" onClick={() => setStatus(m, "new")} className={btnSecondary}><RotateCcw className="h-4 w-4" aria-hidden /> Remettre à traiter</button>
                      )}
                      <ConfirmButton label="Supprimer le message" title="Supprimer ce message ?" description="Le message sera supprimé définitivement." onConfirm={() => del.mutate(m.id)} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
