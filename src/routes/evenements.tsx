import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { pageMeta } from "@/lib/meta";
import { useCategories, useEvents, useLocations, type EventRow } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { EmptyState, Loading, PageHeader } from "@/components/common";
import { t } from "@/i18n";

export const Route = createFileRoute("/evenements")({
  head: () => pageMeta("Événements", "Sport, bien-être et animations à Seine Avenue : le programme de la semaine et les inscriptions."),
  component: EventsPage,
});

function dayLabel(d: Date) {
  const today = startOfDay(new Date());
  if (isSameDay(d, today)) return t("events.today");
  if (isSameDay(d, addDays(today, 1))) return t("events.tomorrow");
  return format(d, "EEEE d MMMM", { locale: fr });
}

function EventsPage() {
  const [view, setView] = useState<"week" | "list">("week");
  const [cat, setCat] = useState("");
  const [loc, setLoc] = useState("");
  const range = useMemo(() => {
    const from = startOfDay(new Date());
    return { from, to: view === "week" ? addDays(from, 7) : addDays(from, 90) };
  }, [view]);
  const { data, isLoading } = useEvents(range);
  const { data: cats } = useCategories();
  const { data: locs } = useLocations();

  const filtered = (data ?? []).filter((e) => (!cat || e.category_id === cat) && (!loc || e.location_id === loc));
  const days = Array.from({ length: 7 }, (_, i) => addDays(range.from, i));

  const select = "h-11 rounded-full border border-input bg-card px-4 text-sm";
  return (
    <div>
      <PageHeader title={t("nav.events")} subtitle="Inscrivez-vous en un clic." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Affichage" className="flex rounded-full border border-border bg-card p-1">
          {(["week", "list"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`h-9 rounded-full px-4 text-sm font-semibold ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {v === "week" ? t("events.thisWeek") : t("events.list")}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="f-cat">Catégorie</label>
        <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={select}>
          <option value="">{t("events.allCategories")}</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-loc">Lieu</label>
        <select id="f-loc" value={loc} onChange={(e) => setLoc(e.target.value)} className={select}>
          <option value="">{t("events.allLocations")}</option>
          {locs?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {isLoading ? <Loading /> : view === "week" ? (
        <div className="space-y-6">
          {days.map((d, i) => {
            const list = filtered.filter((e) => isSameDay(new Date(e.starts_at), d));
            return (
              <section key={d.toISOString()} id={i === 0 ? "aujourdhui" : undefined} aria-labelledby={`day-${i}`}>
                <h2 id={`day-${i}`} className={`mb-2 font-semibold capitalize ${i < 2 ? "text-lg" : "text-muted-foreground"}`}>{dayLabel(d)}</h2>
                {list.length ? <div className="grid gap-3 md:grid-cols-2">{list.map((e) => <EventCard key={e.id} event={e} />)}</div>
                  : <EmptyState>{t("events.none")}</EmptyState>}
              </section>
            );
          })}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-3 md:grid-cols-2">{filtered.map((e: EventRow) => <EventCard key={e.id} event={e} showDate />)}</div>
      ) : (
        <EmptyState>{t("events.noneAll")}</EmptyState>
      )}
    </div>
  );
}
