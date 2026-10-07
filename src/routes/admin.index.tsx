import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { AdminHeader } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/admin/")({
  head: () => pageMeta("Gestion — Tableau de bord", "Tableau de bord du back-office NOVA Serenity."),
  component: () => (
    <div>
      <AdminHeader title="Tableau de bord" intro="Que voulez-vous faire ?" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/admin/actualites" className="rounded-2xl border border-border bg-card p-5 text-lg font-semibold">Publier une actualité</Link>
        <Link to="/admin/faq" className="rounded-2xl border border-border bg-card p-5 text-lg font-semibold">Ajouter une question FAQ</Link>
        <Link to="/admin/contacts" className="rounded-2xl border border-border bg-card p-5 text-lg font-semibold">Gérer les contacts</Link>
        <Link to="/admin/services" className="rounded-2xl border border-border bg-card p-5 text-lg font-semibold">Gérer les services</Link>
      </div>
    </div>
  ),
});
