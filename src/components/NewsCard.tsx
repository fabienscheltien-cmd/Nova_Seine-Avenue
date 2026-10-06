import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { NewsRow } from "@/lib/data";

export function NewsCard({ item }: { item: NewsRow }) {
  return (
    <Link
      to="/actualites/$id"
      params={{ id: item.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
    >
      {item.image_url ? (
        <img src={item.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-surface-high to-card" aria-hidden />
      )}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.category && <span className="font-semibold uppercase tracking-wider text-brand-light">{item.category}</span>}
          {item.published_at && <time dateTime={item.published_at}>{format(new Date(item.published_at), "d MMMM yyyy", { locale: fr })}</time>}
        </div>
        <h3 className="font-semibold group-hover:text-brand-light">{item.title}</h3>
        {item.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>}
      </div>
    </Link>
  );
}
