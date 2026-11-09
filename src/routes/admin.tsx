import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Newspaper, HelpCircle, Phone, Sparkles, BookOpen, Inbox, Settings, Users,
  History, ExternalLink, Undo2, UserCog, Building,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminSiteProvider, useAdminSite } from "@/lib/admin-site";
import { theme } from "@/theme";
import { EmptyState, Loading } from "@/components/common";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Gestion — NOVA Serenity" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

type AdminPath = "/admin" | "/admin/evenements" | "/admin/actualites" | "/admin/faq" | "/admin/contacts" | "/admin/services" | "/admin/vie" | "/admin/messages" | "/admin/configuration" | "/admin/acces" | "/admin/historique" | "/admin/journal" | "/admin/utilisateurs" | "/admin/sites";
type NavItem = { to: AdminPath; label: string; icon: typeof Inbox; exact?: boolean; superOnly?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/evenements", label: "Événements", icon: CalendarDays },
  { to: "/admin/actualites", label: "Actualités", icon: Newspaper },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/contacts", label: "Contacts", icon: Phone },
  { to: "/admin/services", label: "Services", icon: Sparkles },
  { to: "/admin/vie", label: "Vie dans les bureaux", icon: BookOpen },
  { to: "/admin/messages", label: "Messages", icon: Inbox },
  { to: "/admin/configuration", label: "Configuration", icon: Settings },
  { to: "/admin/acces", label: "Accès", icon: Users },
  { to: "/admin/historique", label: "Historique", icon: Undo2 },
  { to: "/admin/journal", label: "Journal", icon: History },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog, superOnly: true },
  { to: "/admin/sites", label: "Sites", icon: Building, superOnly: true },
];

function useNewMessages(siteId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "new-messages", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { count } = await supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("site_id", siteId!).eq("status", "new");
      return count ?? 0;
    },
  });
}

function AdminLayout() {
  const { user, ready, rolesReady } = useAuth();
  if (!ready || !rolesReady) return <div className="p-6"><Loading /></div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState>
          <p className="font-semibold text-foreground">Espace de gestion</p>
          <p className="mt-1">Connectez-vous avec votre adresse e-mail pour accéder à la gestion du site.</p>
          <Link to="/compte" className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Se connecter</Link>
        </EmptyState>
      </div>
    );
  }
  return (
    <AdminSiteProvider>
      <AdminFrame />
    </AdminSiteProvider>
  );
}

function AdminFrame() {
  const { isSuperAdmin } = useAuth();
  const { site, sites, loading, selectSite } = useAdminSite();
  const newMessages = useNewMessages(site?.id);

  if (loading) return <div className="p-6"><Loading /></div>;
  if (!site) {
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState>
          <p className="font-semibold text-foreground">Accès réservé</p>
          <p className="mt-1">Cet espace est réservé aux gestionnaires de site. Si vous pensez qu'il s'agit d'une erreur, contactez NOVA Serenity.</p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold">Retour à l'accueil</Link>
        </EmptyState>
      </div>
    );
  }

  const items = nav.filter((n) => !n.superOnly || isSuperAdmin);
  const badge = (to: AdminPath) => (to === "/admin/messages" && newMessages.data ? newMessages.data : 0);

  return (
    <div className="min-h-screen bg-background">
      <a href="#admin-contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/admin" className="flex shrink-0 items-center gap-3" aria-label="Tableau de bord">
            <img src={site.logo_url || theme.logo} alt="" className="h-6 w-auto" />
          </Link>
          {sites.length > 1 ? (
            <>
              <label htmlFor="admin-site" className="sr-only">Site géré</label>
              <select id="admin-site" value={site.id} onChange={(e) => selectSite(e.target.value)}
                className="h-10 min-w-0 max-w-56 rounded-full border border-border bg-card px-3 text-sm font-semibold">
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          ) : (
            <span className="truncate text-sm font-semibold">Gestion · {site.name}</span>
          )}
          <Link to="/" className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">
            <ExternalLink className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Voir le site</span><span className="sm:hidden">Site</span>
          </Link>
        </div>
        <nav aria-label="Modules de gestion" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {items.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }}
              className="h-10 shrink-0 rounded-full border border-border bg-card px-4 text-sm leading-10"
              activeProps={{ className: "!bg-primary !border-primary text-primary-foreground font-semibold" }}>
              {n.label}{badge(n.to) ? ` (${badge(n.to)})` : ""}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4">
        <nav aria-label="Modules de gestion" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <ul className="space-y-1">
            {items.map(({ to, label, icon: Icon, exact, superOnly }, i) => (
              <li key={to}>
                {superOnly && !items[i - 1]?.superOnly && <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">NOVA</p>}
                <Link to={to} activeOptions={{ exact: !!exact }}
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                  activeProps={{ className: "!bg-primary/15 !text-foreground font-semibold" }}>
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                  {!!badge(to) && <span className="ml-auto rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{badge(to)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="admin-contenu" className="min-w-0 flex-1 pb-16 pt-6">
          <Outlet key={site.id} />
        </main>
      </div>
    </div>
  );
}
