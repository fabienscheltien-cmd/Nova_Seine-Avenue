import { createFileRoute } from "@tanstack/react-router";
import { newItemSearch, useAdminSiteId } from "@/lib/admin";
import { CrudModule } from "@/components/admin/CrudModule";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/services")({ validateSearch: newItemSearch, component: AdminServices });

function AdminServices() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  return (
    <div>
      <PageHeader title="Services" subtitle="Les fiches conciergerie, boutique, salle de sport… présentées aux occupants." />
      <CrudModule
        table="services" siteId={siteId} noun="ce service" addLabel="Ajouter un service"
        emptyText="Aucun service pour l'instant. Ajoutez le premier (ex. : la conciergerie)."
        autoOpenNew={!!nouveau}
        orderable hideable
        rowTitle={(r) => r["name"]}
        rowMeta={(r) => [r["provider"], r["hours"]].filter(Boolean).join(" · ")}
        preview={(v) => (
          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            {v["image_url"] && <img src={String(v["image_url"])} alt="" className="aspect-[16/7] w-full object-cover" />}
            <div className="p-4">
              <h2 className="font-semibold">{v["name"]}</h2>
              {v["description"] && <p className="mt-1 text-sm">{v["description"]}</p>}
              <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {v["hours"] && <div>Horaires : {v["hours"]}</div>}
                {v["provider"] && <div>Prestataire : {v["provider"]}</div>}
                {v["prices"] && <div>Tarifs : {v["prices"]}</div>}
              </dl>
            </div>
          </article>
        )}
        fields={[
          { name: "name", label: "Nom du service", type: "text", required: true, placeholder: "Ex. : Conciergerie" },
          { name: "description", label: "Description", type: "textarea", placeholder: "Ex. : Pressing, cordonnerie, dépôt de colis…" },
          { name: "hours", label: "Horaires", type: "text", placeholder: "Ex. : lundi–vendredi, 8h30–18h" },
          { name: "provider", label: "Prestataire", type: "text", placeholder: "Ex. : Nom de l'entreprise" },
          { name: "prices", label: "Tarifs indicatifs", type: "text", placeholder: "Ex. : à partir de 5 €" },
          { name: "link", label: "Lien", type: "url", placeholder: "https://…", help: "Facultatif : site du prestataire ou formulaire de commande." },
          { name: "image_url", label: "Image", type: "image", help: "Facultatif. L'image est automatiquement redimensionnée." },
          { name: "visible", label: "Visible par les occupants", type: "checkbox", defaultValue: true },
        ]}
      />
    </div>
  );
}
