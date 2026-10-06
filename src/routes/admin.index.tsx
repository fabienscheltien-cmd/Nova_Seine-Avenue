import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, Newspaper, HelpCircle, Inbox, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAdminSiteId } from "@/lib/admin";
import { EmptyState, Loading, PageHeader, SectionTitle } from "@/components/common";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function useDashboard(siteId: string) {
  return useQuery({
    queryKey: ["admin", "dashboard", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const now = new Date();
      const in2Days = addDays(now, 2).toISOString();
      const in7Days = addDays(startOfDay(now), 7).toISOString();
      const [soonEmpty, week, themes, items, messages, drafts, regs] = await Promise.all([
        supabase.from("events").select("id, title, starts_at").eq("site_id", siteId).eq("status", "published")
          .gte("starts_at", now.toISOString()).lte("starts_at", in2Days).eq("registered_count", 0).order("starts_at"),
        supabase.from("events").select("id, title, starts_at, ends_at, capacity, registered_count, status").eq("site_id", siteId)
          .gte("ends_at", now.toISOString()).lt("starts_at", in7Days).order("starts_at").limit(50),
        supabase.from("faq_themes").select("id, name").eq("site_id", siteId).eq("visible", true),
        supabase.from("faq_items").select("theme_id").eq("site_id", siteId).eq("visible", true),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("site_id", siteId).eq("status", "new"),
        supabase.from("news").select("id, title").eq("site_id", siteId).eq("status", "draft"),
        supabase.from("event_registrations").select("id, created_at, event:events(title, starts_at)").eq("site_id", siteId)
          .order("created_at", { ascending: false }).limit(8),
      ]);
      const filled = new Set((items.data ?? []).map((i) => i.theme_id));
      return {
        soonEmpty: soonEmpty.data ?? [],
        week: week.data ?? [],
        emptyThemes: (themes.data ?? []).filter((t) => !filled.has(t.id)),
        newMessages: messages.count ?? 0,
        drafts: drafts.data ?? [],
        regs: (regs.data ?? []) as unknown as { id: string; created_at: string; event: { title: string; starts_at: string } | null }[],
      };
    },
  });
}

function BigShortcut({ to, icon: Icon, label }: { to: "/admin/evenements" | "/admin/actualites" | "/admin/faq" | "/admin/messages"; icon: typeof Inbox; label: string }) {
  return (
    <Link to={to} search={to === "/admin/messages" ? {} : { nouveau: 1 }}
      className="flex min-h-24 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-surface-high">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-brand-light"><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="font-semibold leading-tight">{label}</span>
    </Link>
  );
}

function Dashboard() {
  const siteId = useAdminSiteId();
  const { profile } = useAuth();
  const { data, isLoading } = useDashboard(siteId);

  const todos = data ? [
    ...data.soonEmpty.map((e) => ({ key: e.id, to: "/admin/evenements" as const, text: `« ${e.title} » (${format(new Date(e.starts_at), "EEE d MMM HH:mm", { locale: fr })}) n'a encore aucun inscrit.` })),
    ...data.emptyThemes.map((t) => ({ key: t.id, to: "/admin/faq" as const, text: `Le thème de FAQ « ${t.name} » est vide.` })),
    ...(data.newMessages ? [{ key: "msg", to: "/admin/messages" as const, text: `${data.newMessages} message${data.newMessages > 1 ? "s" : ""} à traiter.` }] : []),
    ...data.drafts.map((n) => ({ key: n.id, to: "/admin/actualites" as const, text: `L'actualité « ${n.title} » est encore en brouillon.` })),
  ] : [];

  return (
    <div>
      <PageHeader title={`Bonjour${profile?.first_name ? ` ${profile.first_name}` : ""}`} subtitle="Voici ce qui demande votre attention." />

      <nav aria-label="Actions rapides" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BigShortcut to="/admin/evenements" icon={CalendarPlus} label="Ajouter un événement" />
        <BigShortcut to="/admin/actualites" icon={Newspaper} label="Publier une actualité" />
        <BigShortcut to="/admin/faq" icon={HelpCircle} label="Ajouter une question FAQ" />
        <BigShortcut to="/admin/messages" icon={Inbox} label="Voir les messages" />
      </nav>

      <SectionTitle>À faire</SectionTitle>
      {isLoading ? <Loading /> : todos.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> Tout est à jour. Bravo !
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {todos.map((t) => (
            <li key={t.key}>
              <Link to={t.to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-high">
                <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                <span className="flex-1">{t.text}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-x-6 lg:grid-cols-2">
        <div>
          <SectionTitle action={<Link to="/admin/evenements" className="text-sm text-brand-light">Tout voir</Link>}>Les 7 prochains jours</SectionTitle>
          {isLoading ? <Loading /> : data?.week.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {data.week.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-28 shrink-0 text-sm capitalize text-muted-foreground">{format(new Date(e.starts_at), "EEE d · HH:mm", { locale: fr })}</span>
                  <span className={`flex-1 font-semibold ${e.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>{e.title}</span>
                  <span className="text-sm text-muted-foreground">{e.registered_count}{e.capacity != null ? ` / ${e.capacity}` : ""} inscrits</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState>Aucun événement prévu cette semaine. <Link to="/admin/evenements" search={{ nouveau: 1 }} className="text-brand-light underline">Ajoutez le premier.</Link></EmptyState>}
        </div>
        <div>
          <SectionTitle>Dernières inscriptions</SectionTitle>
          {isLoading ? <Loading /> : data?.regs.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {data.regs.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <p className="font-semibold">{r.event?.title ?? "Événement supprimé"}</p>
                  <p className="text-sm text-muted-foreground">
                    Inscription le {format(new Date(r.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                    {r.event && ` · séance du ${format(new Date(r.event.starts_at), "EEE d MMM", { locale: fr })}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : <EmptyState>Aucune inscription pour l'instant.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
