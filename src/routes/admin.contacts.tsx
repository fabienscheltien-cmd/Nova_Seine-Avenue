import { createFileRoute } from "@tanstack/react-router";
import { newItemSearch, useAdminSiteId } from "@/lib/admin";
import { CrudModule } from "@/components/admin/CrudModule";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/contacts")({ validateSearch: newItemSearch, component: AdminContacts });

function AdminContacts() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  return (
    <div>
      <PageHeader title="Contacts" subtitle="Les numéros utiles affichés dans « Mon bâtiment ». Les contacts d'urgence apparaissent en premier." />
      <CrudModule
        table="contacts" siteId={siteId} noun="ce contact" addLabel="Ajouter un contact"
        emptyText="Aucun contact pour l'instant. Commencez par l'accueil et la sécurité."
        autoOpenNew={!!nouveau}
        orderable hideable
        rowTitle={(r) => `${r["is_emergency"] ? "🚨 " : ""}${r["role_label"]}${r["name"] ? ` — ${r["name"]}` : ""}`}
        rowMeta={(r) => [r["phone"], r["email"], r["hours"]].filter(Boolean).join(" · ")}
        fields={[
          { name: "role_label", label: "Fonction", type: "text", required: true, placeholder: "Ex. : Accueil, Sécurité, Gestionnaire du site" },
          { name: "name", label: "Nom", type: "text", placeholder: "Ex. : Sterenn Jaffre", help: "Facultatif." },
          { name: "phone", label: "Téléphone", type: "tel", placeholder: "Ex. : 01 23 45 67 89", help: "Les occupants pourront appeler d'un simple clic." },
          { name: "email", label: "E-mail", type: "email", placeholder: "Ex. : accueil@exemple.fr" },
          { name: "hours", label: "Horaires", type: "text", placeholder: "Ex. : du lundi au vendredi, 8h–19h" },
          { name: "is_emergency", label: "Contact d'urgence", type: "checkbox", help: "Affiché en tête de liste, bien en évidence." },
          { name: "visible", label: "Visible par les occupants", type: "checkbox", defaultValue: true },
        ]}
      />
    </div>
  );
}
