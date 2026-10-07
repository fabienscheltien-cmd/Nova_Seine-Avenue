import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { AdminHeader } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/admin/historique")({
  head: () => pageMeta("Gestion — historique", "Espace de gestion NOVA Serenity."),
  component: () => <AdminHeader title="Bientôt disponible" intro="Ce module arrive dans la prochaine étape." />,
});
