import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { useNewsItem } from "@/lib/data";
import { EmptyState, Loading } from "@/components/common";
import { t } from "@/i18n";

export const Route = createFileRoute("/actualites/$id")({
  head: () => pageMeta("Actualité", "Actualité de l'immeuble Seine Avenue."),
  component: NewsDetail,
});

export function SafeHtml({ html }: { html: string }) {
  const [clean, setClean] = useState("");
  useEffect(() => {
    import("dompurify").then(({ default: DOMPurify }) => setClean(DOMPurify.sanitize(html)));
  }, [html]);
  return <div className="prose-nova" dangerouslySetInnerHTML={{ __html: clean }} />;
}

function NewsDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useNewsItem(id);
  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/actualites" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-light"><ArrowLeft className="h-4 w-4" aria-hidden />{t("news.back")}</Link>
      {isLoading ? <Loading /> : !data ? <EmptyState>Cette actualité n'est pas disponible.</EmptyState> : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {data.category && <span className="font-semibold uppercase tracking-wider text-brand-light">{data.category}</span>}
            {data.published_at && <time dateTime={data.published_at}>{format(new Date(data.published_at), "d MMMM yyyy", { locale: fr })}</time>}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{data.title}</h1>
          {data.summary && <p className="mt-2 text-lg text-muted-foreground">{data.summary}</p>}
          {data.image_url && <img src={data.image_url} alt="" className="mt-5 w-full rounded-2xl object-cover" />}
          {data.content && <div className="mt-5"><SafeHtml html={data.content} /></div>}
        </>
      )}
    </article>
  );
}
