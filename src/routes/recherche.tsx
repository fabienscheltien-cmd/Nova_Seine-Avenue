import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo } from "react";
import { startOfDay, addDays } from "date-fns";
import { pageMeta } from "@/lib/meta";
import { useEvents, useFaqItems, useNews, useServices } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState, PageHeader, SectionTitle } from "@/components/common";

export const Route = createFileRoute("/recherche")({
  validateSearch: z.object({ q: z.string().optional().default("") }),
  head: () => pageMeta("Recherche", "Rechercher un événement, une actualité ou une information à Seine Avenue."),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = useMemo(() => ({ from: startOfDay(new Date()), to: addDays(new Date(), 90) }), []);
  const ev = useEvents(range), news = useNews(), faq = useFaqItems(), svc = useServices();
  const n = q.toLowerCase().trim();
  const has = (s?: string | null) => !!s && s.toLowerCase().includes(n);
  const E = n ? (ev.data ?? []).filter((e) => has(e.title) || has(e.description)) : [];
  const N = n ? (news.data ?? []).filter((x) => has(x.title) || has(x.summary)) : [];
  const F = n ? (faq.data ?? []).filter((x) => has(x.question) || has(x.answer)) : [];
  const S = n ? (svc.data ?? []).filter((x) => has(x.name) || has(x.description)) : [];
  return (
    <div>
      <PageHeader title="Recherche" />
      <input autoFocus aria-label="Rechercher" defaultValue={q} onChange={(e) => navigate({ search: { q: e.target.value }, replace: true })}
        placeholder="Tapez un mot : yoga, badge, conciergerie…" className="h-12 w-full rounded-full border border-input bg-card px-5" />
      {n && !E.length && !N.length && !F.length && !S.length && <div className="mt-6"><EmptyState>Aucun résultat pour « {q} ».</EmptyState></div>}
      {E.length > 0 && <><SectionTitle>Événements</SectionTitle><div className="grid gap-3 md:grid-cols-2">{E.map((e) => <EventCard key={e.id} event={e} showDate />)}</div></>}
      {N.length > 0 && <><SectionTitle>Actualités</SectionTitle><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{N.map((x) => <NewsCard key={x.id} item={x} />)}</div></>}
      {F.length > 0 && <><SectionTitle>FAQ</SectionTitle><ul className="space-y-2">{F.map((x) => <li key={x.id}><Link to="/batiment" className="block rounded-xl border border-border bg-card p-3">{x.question}</Link></li>)}</ul></>}
      {S.length > 0 && <><SectionTitle>Services</SectionTitle><ul className="space-y-2">{S.map((x) => <li key={x.id}><Link to="/batiment/services" className="block rounded-xl border border-border bg-card p-3">{x.name}</Link></li>)}</ul></>}
    </div>
  );
}
