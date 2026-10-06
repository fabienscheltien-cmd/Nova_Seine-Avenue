import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { newItemSearch, useAdminRows, useAdminSiteId } from "@/lib/admin";
import { CrudModule } from "@/components/admin/CrudModule";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/faq")({ validateSearch: newItemSearch, component: AdminFaq });

function AdminFaq() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  const themes = useAdminRows("faq_themes", siteId);
  const [tab, setTab] = useState<"questions" | "themes">("questions");
  const options = (themes.data ?? []).map((t) => ({ value: t.id, label: t.name }));

  return (
    <div>
      <PageHeader title="FAQ" subtitle="Les questions fréquentes, regroupées par thème. Masquez une question pour la retirer sans la supprimer." />
      <div role="tablist" aria-label="Rubrique" className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(["questions", "themes"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`h-9 rounded-full px-4 text-sm font-semibold ${tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {v === "questions" ? "Questions" : "Thèmes"}
          </button>
        ))}
      </div>
      {tab === "questions" ? (
        <CrudModule
          table="faq_items" siteId={siteId} noun="cette question" addLabel="Ajouter une question"
          emptyText="Aucune question pour l'instant. Ajoutez la première."
          autoOpenNew={!!nouveau && options.length > 0}
          orderable hideable
          groupBy={{ field: "theme_id", groups: options }}
          rowTitle={(r) => r["question"]}
          rowMeta={(r) => <span className="line-clamp-1">{r["answer"]}</span>}
          fields={[
            { name: "theme_id", label: "Thème", type: "select", required: true, options, defaultValue: options[0]?.value ?? "" },
            { name: "question", label: "Question", type: "text", required: true, placeholder: "Ex. : Comment obtenir un badge visiteur ?" },
            { name: "answer", label: "Réponse", type: "textarea", required: true, placeholder: "Ex. : Présentez-vous à l'accueil avec une pièce d'identité…", help: "Écrivez simplement, comme si vous répondiez de vive voix." },
            { name: "visible", label: "Visible par les occupants", type: "checkbox", defaultValue: true },
          ]}
        />
      ) : (
        <CrudModule
          table="faq_themes" siteId={siteId} noun="ce thème" addLabel="Ajouter un thème"
          emptyText="Aucun thème. Ajoutez-en un pour ranger vos questions."
          orderable hideable
          rowTitle={(r) => r["name"]}
          fields={[
            { name: "name", label: "Nom du thème", type: "text", required: true, placeholder: "Ex. : Accès et badges" },
            { name: "visible", label: "Visible par les occupants", type: "checkbox", defaultValue: true },
          ]}
        />
      )}
    </div>
  );
}
