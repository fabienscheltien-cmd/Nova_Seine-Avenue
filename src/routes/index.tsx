import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { startOfDay, endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, CalendarCheck, UtensilsCrossed, PhoneCall, ArrowRight } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { useSite } from "@/lib/site";
import { useAuth } from "@/lib/auth";
import { useEvents, useNews } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { NewsCard } from "@/components/NewsCard";
import { ContactButtons, EmptyState, Loading, SectionTitle } from "@/components/common";
import { t } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Accueil", "Ce qui se passe aujourd'hui à Seine Avenue : événements, actualités, réservations et contact de l'accueil."),
  component: Home,
});

function Shortcut({ icon: Icon, label, ...props }: { icon: typeof CalendarDays; label: string } & ({ to: string } | { href: string; external?: boolean })) {
  const cls = "flex min-h-24 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-surface-high";
  const inner = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-brand-light"><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="font-semibold leading-tight">{label}</span>
    </>
  );
  if ("href" in props) return <a href={props.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  return <Link to={props.to} hash={props.to === "/evenements" ? "aujourdhui" : undefined} className={cls}>{inner}</Link>;
}

function Home() {
  const { data: site } = useSite();
  const { profile } = useAuth();
  const range = useMemo(() => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }), []);
  const today = useEvents(range);
  const news = useNews(3);

  return (
    <div>
      <section>
        <p className="text-sm capitalize text-muted-foreground">{format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
          {t("home.hello")}{profile?.first_name ? ` ${profile.first_name}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Bienvenue à {site?.name ?? "Seine Avenue"}.</p>
      </section>

      <nav aria-label="Raccourcis" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Shortcut to="/evenements" icon={CalendarDays} label={t("home.shortcut.today")} />
        {site?.booking_url ? (
          <Shortcut href={site.booking_url} icon={CalendarCheck} label={t("home.shortcut.book")} />
        ) : (
          <Shortcut to="/reservations" icon={CalendarCheck} label={t("home.shortcut.book")} />
        )}
        {site?.resto_url ? (
          <Shortcut href={site.resto_url} icon={UtensilsCrossed} label={t("home.shortcut.resto")} />
        ) : (
          <Shortcut to="/resto" icon={UtensilsCrossed} label={t("home.shortcut.resto")} />
        )}
        <Shortcut to="/batiment/contacts" icon={PhoneCall} label={t("home.shortcut.contact")} />
      </nav>

      <SectionTitle action={<Link to="/evenements" className="text-sm text-brand-light">{t("common.seeAll")}</Link>}>
        {t("home.today")}
      </SectionTitle>
      {today.isLoading ? <Loading /> : today.data?.length ? (
        <div className="grid gap-3 md:grid-cols-2">{today.data.map((e) => <EventCard key={e.id} event={e} />)}</div>
      ) : (
        <EmptyState>{t("events.none")}. <Link to="/evenements" className="text-brand-light underline">Voir la semaine</Link></EmptyState>
      )}

      <SectionTitle action={<Link to="/actualites" className="text-sm text-brand-light">{t("common.seeAll")}</Link>}>
        {t("home.latestNews")}
      </SectionTitle>
      {news.isLoading ? <Loading /> : news.data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{news.data.map((n) => <NewsCard key={n.id} item={n} />)}</div>
      ) : (
        <EmptyState>{t("news.none")}</EmptyState>
      )}

      <section className="mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-card p-5">
        <h2 className="text-lg font-semibold">{t("home.reception")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {site?.reception_phone || site?.reception_email
            ? [site?.reception_phone, site?.reception_email].filter(Boolean).join(" · ")
            : "Les coordonnées de l'accueil seront bientôt affichées."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ContactButtons phone={site?.reception_phone} email={site?.reception_email} />
          <Link to="/contact" className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">
            Envoyer un message <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
