import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { pageMeta } from "@/lib/meta";
import { useNews } from "@/lib/data";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState, Loading, PageHeader } from "@/components/common";
import { t } from "@/i18n";

export const Route = createFileRoute("/actualites/")({
  head: () => pageMeta("Actualités", "Les dernières nouvelles de l'immeuble Seine Avenue."),
  component: NewsPage,
});

function NewsPage() {
  const { data, isLoading } = useNews();
  const [cat, setCat] = useState("");
  const cats = Array.from(new Set((data ?? []).map((n) => n.category).filter(Boolean))) as string[];
  const list = (data ?? []).filter((n) => !cat || n.category === cat);
  return (
    <div>
      <PageHeader title={t("nav.news")} />
      {cats.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          {["", ...cats].map((c) => (
            <button key={c || "all"} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`h-10 rounded-full border px-4 text-sm ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {c || t("news.all")}
            </button>
          ))}
        </div>
      )}
      {isLoading ? <Loading /> : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((n) => <NewsCard key={n.id} item={n} />)}</div>
      ) : <EmptyState>{t("news.none")}</EmptyState>}
    </div>
  );
}
