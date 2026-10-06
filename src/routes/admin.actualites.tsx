import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { newItemSearch, useAdminSiteId } from "@/lib/admin";
import { CrudModule } from "@/components/admin/CrudModule";
import { PageHeader } from "@/components/common";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/admin/actualites")({ validateSearch: newItemSearch, component: AdminNews });

const statusLabel: Record<string, string> = { draft: "Brouillon", published: "Publiée", scheduled: "Programmée" };

function AdminNews() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  return (
    <div>
      <PageHeader title="Actualités" subtitle="Rédigez, prévisualisez puis publiez tout de suite ou à une date choisie." />
      <CrudModule
        table="news" siteId={siteId} noun="cette actualité" addLabel="Publier une actualité"
        emptyText="Aucune actualité pour l'instant. Rédigez la première."
        autoOpenNew={!!nouveau}
        order={{ column: "created_at", ascending: false }}
        rowTitle={(r) => r["title"]}
        rowMeta={(r) => {
          const scheduledFuture = r["status"] === "scheduled" && r["published_at"] && new Date(r["published_at"]) > new Date();
          return (
            <>
              <span className={r["status"] === "draft" ? "text-warning" : scheduledFuture ? "text-brand-light" : "text-success"}>
                {r["status"] === "scheduled" && !scheduledFuture ? "Publiée" : statusLabel[r["status"]]}
              </span>
              {r["published_at"] && ` · ${format(new Date(r["published_at"]), "d MMM yyyy HH:mm", { locale: fr })}`}
              {r["category"] && ` · ${r["category"]}`}
            </>
          );
        }}
        beforeSave={(v, row) => {
          if (v["status"] === "published") v["published_at"] = row?.["status"] === "published" && row["published_at"] ? row["published_at"] : new Date().toISOString();
          if (v["status"] === "draft") v["published_at"] = null;
          if (v["status"] === "scheduled" && !v["published_at"]) v["status"] = "draft";
          return v;
        }}
        preview={(v) => (
          <article>
            {v["category"] && <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">{v["category"]}</p>}
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{v["title"]}</h1>
            {v["summary"] && <p className="mt-2 text-muted-foreground">{v["summary"]}</p>}
            {v["image_url"] && <img src={String(v["image_url"])} alt="" className="mt-4 w-full rounded-2xl object-cover" />}
            <div className="mt-4"><SafeHtml html={String(v["content"] ?? "")} /></div>
          </article>
        )}
        fields={[
          { name: "title", label: "Titre", type: "text", required: true, placeholder: "Ex. : Nouveau cours de Pilates le mardi" },
          { name: "summary", label: "Résumé", type: "textarea", placeholder: "Une ou deux phrases affichées sur la carte.", help: "Affiché dans la liste des actualités." },
          { name: "content", label: "Contenu", type: "richtext" },
          { name: "category", label: "Catégorie", type: "text", placeholder: "Ex. : Vie de l'immeuble, Travaux, Services" },
          { name: "image_url", label: "Image", type: "image", help: "Facultatif. L'image est automatiquement redimensionnée." },
          {
            name: "status", label: "Publication", type: "select", required: true, defaultValue: "draft",
            options: [
              { value: "draft", label: "Brouillon (non visible)" },
              { value: "published", label: "Publier maintenant" },
              { value: "scheduled", label: "Programmer à une date" },
            ],
          },
          { name: "published_at", label: "Date de publication", type: "datetime", required: true, showIf: (v) => v["status"] === "scheduled", help: "L'actualité apparaîtra automatiquement à cette date." },
        ]}
      />
    </div>
  );
}
