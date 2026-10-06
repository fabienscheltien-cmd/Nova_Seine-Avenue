import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { useSite } from "@/lib/site";
import { ContactButtons, EmptyState, PageHeader } from "@/components/common";
import { t } from "@/i18n";

export const Route = createFileRoute("/reservations")({
  head: () => pageMeta("Réservations", "Réservez une salle ou un espace à Seine Avenue."),
  component: () => <ExternalPage kind="booking" />,
});

export function ExternalPage({ kind }: { kind: "booking" | "resto" }) {
  const { data: site } = useSite();
  const url = kind === "booking" ? site?.booking_url : site?.resto_url;
  const title = kind === "booking" ? t("nav.booking") : t("nav.resto");
  return (
    <div>
      <PageHeader title={title} />
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          Ouvrir {title} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      ) : (
        <EmptyState>
          <p className="font-semibold text-foreground">{t("common.soon")}</p>
          <p className="mt-1">En attendant, contactez l'accueil.</p>
          <div className="mt-4 flex justify-center"><ContactButtons phone={site?.reception_phone} email={site?.reception_email} /></div>
        </EmptyState>
      )}
    </div>
  );
}
