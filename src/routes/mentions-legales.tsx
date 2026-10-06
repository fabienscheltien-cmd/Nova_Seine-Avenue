import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/mentions-legales")({
  head: () => pageMeta("Mentions légales", "Mentions légales de l'application occupants Seine Avenue."),
  component: () => (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mentions légales" />
      <p className="text-muted-foreground">Application éditée par NOVA Serenity Group. Le texte complet des mentions légales sera publié prochainement.</p>
    </div>
  ),
});
