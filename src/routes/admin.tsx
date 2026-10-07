import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Newspaper, HelpCircle, PhoneCall, Sparkles, BookOpen, Inbox, Settings, History, ArrowLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import { pageMeta } from "@/lib/meta";
import { useAuth } from "@/lib/auth";
import { AdminSiteProvider, useAdminSite } from "@/lib/admin";
import { theme } from "@/theme";

export const Route = createFileRoute("/admin")({
  head: () => pageMeta("Gestion", "Back-office NOVA Serenity : gérez événements, actualités, FAQ, contacts et services de votre site."),
  component: AdminRoot,
});

const nav = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/evenements", label: "Événements", icon: CalendarDays },
  { to: "/admin/actualites", label: "Actualités", icon: Newspaper },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/contacts", label: "Contacts", icon: PhoneCall },
  { to: "/admin/services", label: "Services", icon: Sparkles },
  { to: "/admin/vie", label: "Vie dans les bureaux", icon: BookOpen },
  { to: "/admin/messages", label: "Messages reçus", icon: Inbox },
  { to: "/admin/configuration", label: "Configuration", icon: Settings },
  { to: "/admin/historique", label: "Historique", icon: History },
] as const;

function AdminRoot() {
  const { user, ready, roles, isSuperAdmin } = useAuth();
  const isAnyAdmin = isSuperAdmin || roles.some((r) => r.role === "site_admin");
  if (!ready || (user && roles.length === 0)) return <Centered>Chargement…</Centered>;
  if (!user)
    return (
      <Centered>
        <h1 className="text-xl font-bold">Espace de gestion</h1>
        <p className="mt-2 text-muted-foreground">Connectez-vous avec votre adresse e-mail professionnelle pour continuer.</p>
        <Link to="/compte" className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">Se connecter</Link>
      </Centered>
    );
  if (!isAnyAdmin)
    return (
      <Centered>
        <h1 className="text-xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-muted-foreground">Votre compte n'a pas encore les droits de gestion. Demandez-les à NOVA Serenity.</p>
        <Link to="/" className="mt-5 inline-flex h-12 items-center rounded-full border border-border px-6 font-semibold">Retour à l'application</Link>
      </Centered>
    );
  return (
    <AdminSiteProvider>
      <AdminLayout />
    </AdminSiteProvider>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">{children}</div>;
}

function AdminLayout() {
  const { sites, site, setSiteId } = useAdminSite();
  const [open, setOpen] = useState(false);
  const menu = (
    <nav aria-label="Menu de gestion" className="space-y-1">
      {nav.map(({ to, label, icon: Icon, ...rest }) => (
        <Link
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: "exact" in rest }}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-surface-high hover:text-foreground"
          activeProps={{ className: "bg-primary/15 text-foreground font-semibold" }}
        >
          <Icon className="h-5 w-5" aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <img src={theme.logo} alt={theme.logoAlt} className="h-6 w-auto" />
        <span className="hidden text-sm font-semibold text-brand-light sm:inline">Gestion</span>
        {sites.length > 1 ? (
          <select aria-label="Site géré" value={site?.id ?? ""} onChange={(e) => setSiteId(e.target.value)} className="ml-2 h-10 rounded-full border border-input bg-card px-3 text-sm font-semibold">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : (
          <span className="ml-2 text-sm font-semibold">{site?.name}</span>
        )}
        <Link to="/" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voir l'application</span>
        </Link>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-card p-4">
            <button type="button" className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-border" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            {menu}
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block"><div className="sticky top-20">{menu}</div></aside>
        <main id="contenu" className="min-w-0 flex-1 pb-16">
          {site ? <Outlet /> : <p className="text-muted-foreground">Aucun site associé à votre compte.</p>}
        </main>
      </div>
    </div>
  );
}
