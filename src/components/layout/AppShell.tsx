import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode, type FormEvent } from "react";
import { Home, CalendarDays, CalendarCheck, Building2, User, Search, Newspaper, UtensilsCrossed, Mail } from "lucide-react";
import { theme } from "@/theme";
import { t } from "@/i18n";
import { useSite } from "@/lib/site";
import { useAuth } from "@/lib/auth";

const mobileNav = [
  { to: "/", label: t("nav.home"), icon: Home, exact: true },
  { to: "/evenements", label: t("nav.events"), icon: CalendarDays },
  { to: "/reservations", label: t("nav.booking"), icon: CalendarCheck },
  { to: "/batiment", label: t("nav.building"), icon: Building2 },
  { to: "/compte", label: t("nav.account"), icon: User },
] as const;

const desktopNav = [
  { to: "/", label: t("nav.home"), exact: true },
  { to: "/actualites", label: t("nav.news") },
  { to: "/evenements", label: t("nav.events") },
  { to: "/reservations", label: t("nav.booking") },
  { to: "/resto", label: t("nav.resto") },
  { to: "/batiment", label: t("nav.building") },
  { to: "/contact", label: t("nav.contact") },
] as const;

function SearchBox({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/recherche", search: { q: q.trim() } });
  };
  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <label htmlFor="global-search" className="sr-only">{t("nav.search")}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un événement, une info…"
        className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
      />
    </form>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: site } = useSite();
  const { user, isAdminOf } = useAuth();
  const isAdmin = !!user && isAdminOf(site?.id);

  return (
    <div className="min-h-screen bg-background">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex shrink-0 flex-col items-start gap-0.5" aria-label={`${theme.brandName} — ${site?.name ?? ""}, accueil`}>
            <img src={site?.logo_url || theme.logo} alt="" className="h-6 w-auto" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-light">{site?.name ?? "\u00a0"}</span>
          </Link>
          <nav aria-label="Navigation principale" className="ml-4 hidden lg:block">
            <ul className="flex items-center gap-5">
              {desktopNav.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    activeOptions={{ exact: "exact" in n }}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    activeProps={{ className: "text-foreground font-semibold" }}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SearchBox className="ml-auto hidden w-64 md:block" />
          <Link to="/recherche" search={{ q: "" }} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-border md:hidden" aria-label={t("nav.search")}>
            <Search className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <Link to="/admin" className="hidden rounded-full border border-primary/50 px-3 py-1.5 text-xs font-semibold text-brand-light lg:inline-block">
              Gestion
            </Link>
          )}
          <Link to="/compte" className="hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground lg:flex">
            <User className="h-4 w-4" aria-hidden /> {user ? t("nav.account") : "Se connecter"}
          </Link>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-16">
        {children}
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-4 pb-28 pt-6 text-sm text-muted-foreground lg:pb-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>© {new Date().getFullYear()} {theme.brandName}</span>
          <Link to="/actualites" className="hover:text-foreground lg:hidden"><Newspaper className="mr-1 inline h-3.5 w-3.5" />{t("nav.news")}</Link>
          <Link to="/resto" className="hover:text-foreground lg:hidden"><UtensilsCrossed className="mr-1 inline h-3.5 w-3.5" />{t("nav.resto")}</Link>
          <Link to="/contact" className="hover:text-foreground lg:hidden"><Mail className="mr-1 inline h-3.5 w-3.5" />{t("nav.contact")}</Link>
          <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
          <Link to="/confidentialite" className="hover:text-foreground">Politique de confidentialité</Link>
        </div>
      </footer>

      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-5">
          {mobileNav.map(({ to, label, icon: Icon, ...rest }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: "exact" in rest }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
                activeProps={{ className: "text-brand-light font-semibold" }}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
