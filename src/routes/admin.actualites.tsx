import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { pageMeta } from "@/lib/meta";
import { CrudPage } from "@/components/admin/CrudPage";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/admin/actualites")({
  head: () => pageMeta("Gestion — Actualités", "Rédigez et publiez les actualités du site."),
  component: NewsAdmin,
});

const statusLabel: Record<string, string> = { draft: "Brouillon", published: "Publié", scheduled: "Programmé" };
const toLocal = (iso?: unknown) => (iso ? format(new Date(String(iso)), "yyyy-MM-dd'T'HH:mm") : "");

function NewsAdmin() {
  return (
    <CrudPage
      table="news"
      title="Actualités"
      intro="Informations, travaux, animations… Enregistrez en brouillon, publiez tout de suite ou programmez une date."
      singular="cette actualité"
      addLabel="Publier une actualité"
      transform={(v) => ({ ...v, published_at: v["status"] === "draft" ? null : v["published_at"] ? new Date(String(v["published_at"])).toISOString() : new Date().toISOString() })}
      order="created_at"
      ascending={false}
      searchKeys={["title", "summary", "category"]}
      emptyText="Aucune actualité pour l'instant. Publiez la première !"
      primary={(r) => String(r["title"])}
      secondary={(r) => (
        <>
          <span className={r["status"] === "draft" ? "text-warning" : r["status"] === "scheduled" ? "text-brand-light" : "text-success"}>{statusLabel[String(r["status"])] ?? ""}</span>
          {r["published_at"] ? ` · ${format(new Date(String(r["published_at"])), "d MMM yyyy à HH:mm", { locale: fr })}` : ""}
          {r["category"] ? ` · ${r["category"]}` : ""}
        </>
      )}
      defaults={{ title: "", summary: "", content: "", category: "", image_url: null, status: "draft", published_at: "" }}
      preview={(v) => (
        <article>
          {v["image_url"] ? <img src={String(v["image_url"])} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
          {v["category"] ? <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-light">{String(v["category"])}</p> : null}
          <h2 className="mt-1 text-2xl font-bold">{String(v["title"] || "Titre de l'actualité")}</h2>
          {v["summary"] ? <p className="mt-2 text-muted-foreground">{String(v["summary"])}</p> : null}
          <div className="mt-4"><SafeHtml html={String(v["content"] ?? "")} /></div>
        </article>
      )}
      fields={[
        { name: "title", label: "Titre", type: "text", required: true, placeholder: "Ex. Travaux dans le hall le 12 mars" },
        { name: "summary", label: "Résumé", type: "textarea", placeholder: "Ex. Le hall sera partiellement fermé de 8h à 12h.", help: "Une ou deux phrases affichées dans la liste." },
        { name: "content", label: "Contenu", type: "rich", placeholder: "Écrivez votre article ici…" },
        { name: "category", label: "Catégorie", type: "text", placeholder: "Ex. Travaux, Animation, Info pratique" },
        { name: "image_url", label: "Image", type: "image", help: "Redimensionnée automatiquement." },
        {
          name: "status", label: "Publication", type: "select", required: true,
          options: [{ value: "draft", label: "Brouillon (non visible)" }, { value: "published", label: "Publier maintenant" }, { value: "scheduled", label: "Programmer à une date" }],
        },
        { name: "published_at", label: "Date de publication", type: "datetime", help: "Seulement si vous programmez. Laissez vide pour « maintenant »." },
      ]}
    />
  );
}

export { toLocal };
