import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Newspaper, HelpCircle, Phone, Sparkles, BookOpen, Inbox, Settings, Users, History, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSite } from "@/lib/site";
import { theme } from "@/theme";
import { EmptyState, Loading } from "@/components/common";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Gestion — Seine Avenue" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
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
  { to: "/admin/journal", label: "Journal", icon: History },
] as const;

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
  const { user, ready, isAdminOf, rolesReady } = useAuth();
  const { data: site, isLoading } = useSite();
  const newMessages = useNewMessages(site?.id);

  if (!ready || isLoading || !rolesReady) return <div className="p-6"><Loading /></div>;
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
  if (!site || !isAdminOf(site.id)) {
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState>
          <p className="font-semibold text-foreground">Accès réservé</p>
          <p className="mt-1">Cet espace est réservé aux gestionnaires du site. Si vous pensez qu'il s'agit d'une erreur, contactez NOVA Serenity.</p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold">Retour à l'accueil</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <a href="#admin-contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={site.logo_url || theme.logo} alt="" className="h-6 w-auto" />
            <span className="text-sm font-semibold">Gestion · {site.name}</span>
          </Link>
          <Link to="/" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">
            <ExternalLink className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Voir le site</span><span className="sm:hidden">Site</span>
          </Link>
        </div>
        <nav aria-label="Modules de gestion" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="h-10 shrink-0 rounded-full border border-border bg-card px-4 text-sm leading-10"
              activeProps={{ className: "!bg-primary !border-primary text-primary-foreground font-semibold" }}>
              {n.label}{n.to === "/admin/messages" && !!newMessages.data && ` (${newMessages.data})`}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4">
        <nav aria-label="Modules de gestion" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <ul className="space-y-1">
            {nav.map(({ to, label, icon: Icon, ...rest }) => (
              <li key={to}>
                <Link to={to} activeOptions={{ exact: "exact" in rest }}
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                  activeProps={{ className: "!bg-primary/15 !text-foreground font-semibold" }}>
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                  {to === "/admin/messages" && !!newMessages.data && (
                    <span className="ml-auto rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{newMessages.data}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="admin-contenu" className="min-w-0 flex-1 pb-16 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
