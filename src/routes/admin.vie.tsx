import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { CrudPage } from "@/components/admin/CrudPage";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/admin/vie")({
  head: () => pageMeta("Gestion — Vie dans les bureaux", "Gérez les pages d'information pratiques du bâtiment."),
  component: () => (
    <CrudPage
      table="building_info"
      title="Vie dans les bureaux"
      intro="Pages d'information libres : règles de vie, accès, tri des déchets, parking… Glissez pour changer l'ordre."
      singular="cette page"
      addLabel="Ajouter une page"
      sortable
      visibleToggle
      searchKeys={["title", "content"]}
      emptyText="Aucune page pour l'instant. Ajoutez la première, par exemple « Tri des déchets »."
      primary={(r) => String(r["title"])}
      defaults={{ title: "", content: "", visible: true }}
      preview={(v) => (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-lg font-semibold">{String(v["title"] || "Titre")}</h3>
          <div className="mt-2"><SafeHtml html={String(v["content"] ?? "")} /></div>
        </div>
      )}
      fields={[
        { name: "title", label: "Titre", type: "text", required: true, placeholder: "Ex. Tri des déchets" },
        { name: "content", label: "Contenu", type: "rich", required: true, placeholder: "Ex. Les poubelles jaunes sont au niveau -1…" },
        { name: "visible", label: "Visible par les occupants", type: "switch" },
      ]}
    />
  ),
});
