import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/admin/services")({
  head: () => pageMeta("Gestion — Services", "Gérez les fiches services du bâtiment."),
  component: () => (
    <CrudPage
      table="services"
      title="Services"
      intro="Conciergerie, pressing, restauration… Une fiche par service. Glissez pour changer l'ordre."
      singular="ce service"
      addLabel="Ajouter un service"
      sortable
      visibleToggle
      searchKeys={["name", "provider", "description"]}
      emptyText="Aucun service pour l'instant. Ajoutez le premier, par exemple la conciergerie."
      primary={(r) => String(r["name"])}
      secondary={(r) => [r["provider"], r["hours"]].filter(Boolean).join(" · ")}
      defaults={{ name: "", description: "", hours: "", provider: "", prices: "", link: "", image_url: null, visible: true }}
      preview={(v) => (
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          {v["image_url"] ? <img src={String(v["image_url"])} alt="" className="aspect-[16/9] w-full object-cover" /> : null}
          <div className="p-4">
            <h3 className="text-lg font-semibold">{String(v["name"] || "Nom du service")}</h3>
            {v["provider"] ? <p className="text-sm text-brand-light">{String(v["provider"])}</p> : null}
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{String(v["description"] ?? "")}</p>
            <p className="mt-2 text-sm">{[v["hours"], v["prices"]].filter(Boolean).join(" · ")}</p>
          </div>
        </article>
      )}
      fields={[
        { name: "name", label: "Nom du service", type: "text", required: true, placeholder: "Ex. Conciergerie" },
        { name: "description", label: "Description", type: "textarea", placeholder: "Ex. Dépôt de pressing, réception de colis, réservation de taxi…" },
        { name: "hours", label: "Horaires", type: "text", placeholder: "Ex. Lun–ven, 8h30–18h30" },
        { name: "provider", label: "Prestataire", type: "text", placeholder: "Ex. Conciergerie Plus" },
        { name: "prices", label: "Tarifs indicatifs", type: "text", placeholder: "Ex. À partir de 5 €" },
        { name: "link", label: "Lien", type: "url", placeholder: "https://…", help: "Site ou formulaire de commande du prestataire." },
        { name: "image_url", label: "Image", type: "image", help: "Elle sera redimensionnée automatiquement." },
        { name: "visible", label: "Visible par les occupants", type: "switch" },
      ]}
    />
  ),
});
