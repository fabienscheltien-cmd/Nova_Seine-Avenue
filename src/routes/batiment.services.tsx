import { createFileRoute } from "@tanstack/react-router";
import { useServices } from "@/lib/data";
import { EmptyState, Loading } from "@/components/common";

export const Route = createFileRoute("/batiment/services")({ component: Services });

function Services() {
  const { data, isLoading } = useServices();
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState>Les services seront bientôt présentés ici.</EmptyState>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((s) => (
        <article key={s.id} className="overflow-hidden rounded-2xl border border-border bg-card">
          {s.image_url && <img src={s.image_url} alt="" className="aspect-[16/7] w-full object-cover" loading="lazy" />}
          <div className="p-4">
            <h2 className="font-semibold">{s.name}</h2>
            {s.description && <p className="mt-1 text-sm">{s.description}</p>}
            <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {s.hours && <div><dt className="inline">Horaires : </dt><dd className="inline">{s.hours}</dd></div>}
              {s.provider && <div><dt className="inline">Prestataire : </dt><dd className="inline">{s.provider}</dd></div>}
              {s.prices && <div><dt className="inline">Tarifs : </dt><dd className="inline">{s.prices}</dd></div>}
            </dl>
            {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-light underline">En savoir plus</a>}
          </div>
        </article>
      ))}
    </div>
  );
}
