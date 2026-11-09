import { createFileRoute } from "@tanstack/react-router";
import { newItemSearch, useAdminSiteId } from "@/lib/admin";
import { CrudModule } from "@/components/admin/CrudModule";
import { PageHeader } from "@/components/common";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/admin/vie")({ validateSearch: newItemSearch, component: AdminVie });

function AdminVie() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  return (
    <div>
      <PageHeader title="Vie dans les bureaux" subtitle="Pages d'information libres : règles de vie, accès, tri des déchets…" />
      <CrudModule
        table="building_info" siteId={siteId} noun="cette page" addLabel="Ajouter une page"
        emptyText="Aucune page pour l'instant. Ajoutez la première (ex. : Tri des déchets)."
        autoOpenNew={!!nouveau}
        orderable hideable
        rowTitle={(r) => r["title"]}
        preview={(v) => (
          <div>
            <h3 className="mb-2 font-semibold">{v["title"]}</h3>
            <SafeHtml html={String(v["content"] ?? "")} />
          </div>
        )}
        fields={[
          { name: "title", label: "Titre", type: "text", required: true, placeholder: "Ex. : Tri des déchets" },
          { name: "content", label: "Contenu", type: "richtext", required: true },
          { name: "visible", label: "Visible par les occupants", type: "checkbox", defaultValue: true },
        ]}
      />
    </div>
  );
}
