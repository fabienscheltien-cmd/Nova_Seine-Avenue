import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFaqItems, useFaqThemes } from "@/lib/data";
import { EmptyState, ErrorState, Loading } from "@/components/common";

export const Route = createFileRoute("/batiment/")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" && s["q"] ? { q: s["q"].slice(0, 200) } : {}),
  component: Faq,
});

function Faq() {
  const themes = useFaqThemes();
  const items = useFaqItems();
  const initial = Route.useSearch().q ?? "";
  const [q, setQ] = useState(initial);
  if (themes.isLoading || items.isLoading) return <Loading />;
  if (themes.isError || items.isError) return <ErrorState onRetry={() => { themes.refetch(); items.refetch(); }} />;
  const needle = q.toLowerCase();
  const match = (items.data ?? []).filter((i) => !needle || (i.question + " " + i.answer).toLowerCase().includes(needle));
  const groups = (themes.data ?? []).map((th) => ({ th, list: match.filter((i) => i.theme_id === th.id) })).filter((g) => g.list.length);
  return (
    <div>
      <label htmlFor="faq-q" className="sr-only">Rechercher dans la FAQ</label>
      <input id="faq-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une question…"
        className="mb-5 h-11 w-full rounded-full border border-input bg-card px-4 text-sm" />
      {groups.length === 0 ? <EmptyState>{q ? "Aucune question ne correspond." : "Les questions fréquentes arrivent bientôt."}</EmptyState> :
        groups.map(({ th, list }) => (
          <section key={th.id} className="mb-6">
            <h2 className="mb-2 font-semibold">{th.name}</h2>
            <Accordion type="multiple" defaultValue={initial ? list.map((i) => i.id) : []} className="rounded-2xl border border-border bg-card px-4">
              {list.map((i) => (
                <AccordionItem key={i.id} value={i.id}>
                  <AccordionTrigger className="text-left">{i.question}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line text-muted-foreground">{i.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
    </div>
  );
}
