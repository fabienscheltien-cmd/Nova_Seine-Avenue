import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useContacts } from "@/lib/data";
import { useSite } from "@/lib/site";
import { ContactButtons, EmptyState, Loading } from "@/components/common";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/batiment/contacts")({ component: Contacts });

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

function ContactCard({ c }: { c: Contact }) {
  return (
    <article className={`rounded-2xl border p-4 ${c.is_emergency ? "border-destructive/60 bg-destructive/10" : "border-border bg-card"}`}>
      <h2 className="flex items-center gap-2 font-semibold">
        {c.is_emergency && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Urgence" />}{c.role_label}
      </h2>
      {c.name && <p>{c.name}</p>}
      <p className="text-sm text-muted-foreground">{[c.phone, c.email, c.hours].filter(Boolean).join(" · ")}</p>
      <div className="mt-3"><ContactButtons phone={c.phone} email={c.email} /></div>
    </article>
  );
}

function Contacts() {
  const { data, isLoading } = useContacts();
  const { data: site } = useSite();
  if (isLoading) return <Loading />;
  // Urgences en priorité, puis l'accueil, puis les autres contacts.
  const all = data ?? [];
  const urgent = all.filter((c) => c.is_emergency);
  const others = all.filter((c) => !c.is_emergency);
  // Pas de doublon si l'accueil a aussi été saisi comme contact.
  const hasReceptionContact = all.some((c) => c.role_label.trim().toLowerCase() === "accueil");
  const showReception = !hasReceptionContact && !!(site?.reception_phone || site?.reception_email);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {urgent.map((c) => <ContactCard key={c.id} c={c} />)}
      {showReception && site && (
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Accueil</h2>
          <p className="text-sm text-muted-foreground">{[site.reception_phone, site.reception_email].filter(Boolean).join(" · ")}</p>
          <div className="mt-3"><ContactButtons phone={site.reception_phone} email={site.reception_email} /></div>
        </article>
      )}
      {others.map((c) => <ContactCard key={c.id} c={c} />)}
      {!all.length && !showReception && <EmptyState>Les contacts seront bientôt disponibles.</EmptyState>}
    </div>
  );
}
