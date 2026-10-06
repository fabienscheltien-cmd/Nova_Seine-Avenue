import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useContacts } from "@/lib/data";
import { useSite } from "@/lib/site";
import { ContactButtons, EmptyState, Loading } from "@/components/common";

export const Route = createFileRoute("/batiment/contacts")({ component: Contacts });

function Contacts() {
  const { data, isLoading } = useContacts();
  const { data: site } = useSite();
  if (isLoading) return <Loading />;
  const list = [...(data ?? [])].sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(site?.reception_phone || site?.reception_email) && (
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Accueil</h2>
          <p className="text-sm text-muted-foreground">{[site.reception_phone, site.reception_email].filter(Boolean).join(" · ")}</p>
          <div className="mt-3"><ContactButtons phone={site.reception_phone} email={site.reception_email} /></div>
        </article>
      )}
      {list.map((c) => (
        <article key={c.id} className={`rounded-2xl border p-4 ${c.is_emergency ? "border-destructive/60 bg-destructive/10" : "border-border bg-card"}`}>
          <h2 className="flex items-center gap-2 font-semibold">
            {c.is_emergency && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Urgence" />}{c.role_label}
          </h2>
          {c.name && <p>{c.name}</p>}
          <p className="text-sm text-muted-foreground">{[c.phone, c.email, c.hours].filter(Boolean).join(" · ")}</p>
          <div className="mt-3"><ContactButtons phone={c.phone} email={c.email} /></div>
        </article>
      ))}
      {!list.length && !site?.reception_phone && !site?.reception_email && <EmptyState>Les contacts seront bientôt disponibles.</EmptyState>}
    </div>
  );
}
