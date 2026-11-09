import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { useEvent } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { EmptyState, Loading } from "@/components/common";

export const Route = createFileRoute("/evenements_/$id")({
  head: () => pageMeta("Événement", "Détail d'un événement de l'immeuble : horaires, lieu, places et inscription."),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useEvent(id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/evenements" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-light">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tous les événements
      </Link>
      {isLoading ? <Loading /> : isError ? (
        <EmptyState>Impossible de charger cet événement. Vérifiez votre connexion et réessayez.</EmptyState>
      ) : !data ? (
        <EmptyState>Cet événement n'existe pas ou n'est plus disponible.</EmptyState>
      ) : (
        <EventCard event={data} detailed />
      )}
    </div>
  );
}
