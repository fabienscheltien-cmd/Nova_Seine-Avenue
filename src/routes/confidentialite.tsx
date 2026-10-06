import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/confidentialite")({
  head: () => pageMeta("Politique de confidentialité", "Comment vos données sont utilisées dans l'application Seine Avenue."),
  component: () => (
    <div className="mx-auto max-w-3xl space-y-3 text-muted-foreground">
      <PageHeader title="Politique de confidentialité" />
      <p>Nous conservons uniquement les informations de votre profil (prénom, nom, entreprise, étage), vos préférences et vos inscriptions aux événements.</p>
      <p>La newsletter n'est envoyée qu'avec votre accord explicite. Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ».</p>
      <p>Le texte complet sera publié prochainement.</p>
    </div>
  ),
});
