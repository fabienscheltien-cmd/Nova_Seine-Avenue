import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Ban, Copy, Download, Mail, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadCsv, logActivity, newItemSearch, useAdminRows, useAdminSiteId, useInvalidate, type Row,
} from "@/lib/admin";
import { cancelEvent, getEventRegistrants } from "@/lib/admin.functions";
import { eventStatus } from "@/lib/data";
import { CrudModule } from "@/components/admin/CrudModule";
import { ConfirmButton, FieldShell, ImageField, btnPrimary, btnSecondary, inputCls } from "@/components/admin/fields";
import { EmptyState, Loading, PageHeader } from "@/components/common";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/evenements")({ validateSearch: newItemSearch, component: AdminEvents });

type EventRow = Row<"events">;
const WEEKDAYS = [
  { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mer" }, { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" }, { value: 6, label: "Sam" }, { value: 0, label: "Dim" },
];
const MAX_OCCURRENCES = 200;

function AdminEvents() {
  const siteId = useAdminSiteId();
  const { nouveau } = Route.useSearch();
  const [tab, setTab] = useState<"events" | "templates" | "locations" | "categories">("events");
  const cats = useAdminRows("event_categories", siteId);
  const locs = useAdminRows("event_locations", siteId);
  const catOptions = (cats.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const locOptions = (locs.data ?? []).map((l) => ({ value: l.id, label: l.name }));

  const tabs = [
    { v: "events", label: "Événements" }, { v: "templates", label: "Modèles" },
    { v: "locations", label: "Lieux" }, { v: "categories", label: "Catégories" },
  ] as const;

  return (
    <div>
      <PageHeader title="Événements" subtitle="Créez des séances ponctuelles ou récurrentes, suivez les inscrits et annulez si besoin." />
      <div role="tablist" aria-label="Rubrique" className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 sm:inline-flex">
        {tabs.map(({ v, label }) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "events" && <EventsList siteId={siteId} autoOpenNew={!!nouveau} />}
      {tab === "templates" && (
        <CrudModule
          table="event_templates" siteId={siteId} noun="ce modèle" addLabel="Ajouter un modèle"
          emptyText="Aucun modèle. Un modèle pré-remplit le formulaire d'un événement qui revient souvent."
          order={{ column: "name" }}
          rowTitle={(r) => r["name"]}
          rowMeta={(r) => `${String(r["start_time"]).slice(0, 5)} – ${String(r["end_time"]).slice(0, 5)}${r["capacity"] != null ? ` · ${r["capacity"]} places` : ""}`}
          fields={[
            { name: "name", label: "Nom", type: "text", required: true, placeholder: "Ex. : Pilates" },
            { name: "category_id", label: "Catégorie", type: "select", options: catOptions },
            { name: "location_id", label: "Lieu", type: "select", options: locOptions },
            { name: "start_time", label: "Heure de début", type: "time", required: true },
            { name: "end_time", label: "Heure de fin", type: "time", required: true },
            { name: "capacity", label: "Nombre de places", type: "number", help: "Laissez vide si illimité." },
            { name: "description", label: "Description", type: "textarea" },
          ]}
        />
      )}
      {tab === "locations" && (
        <CrudModule
          table="event_locations" siteId={siteId} noun="ce lieu" addLabel="Ajouter un lieu"
          emptyText="Aucun lieu. Ajoutez par exemple « Salle Fitness » ou « Terrasse »."
          orderable rowTitle={(r) => r["name"]}
          fields={[{ name: "name", label: "Nom du lieu", type: "text", required: true, placeholder: "Ex. : Terrasse" }]}
        />
      )}
      {tab === "categories" && (
        <CrudModule
          table="event_categories" siteId={siteId} noun="cette catégorie" addLabel="Ajouter une catégorie"
          emptyText="Aucune catégorie."
          orderable rowTitle={(r) => r["name"]}
          fields={[{ name: "name", label: "Nom de la catégorie", type: "text", required: true, placeholder: "Ex. : Bien-être" }]}
        />
      )}
    </div>
  );
}

const statusText = { open: "Inscriptions ouvertes", full: "Complet", ended: "Terminé", closed: "Inscriptions fermées", cancelled: "Annulé" };

function EventsList({ siteId, autoOpenNew }: { siteId: string; autoOpenNew: boolean }) {
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EventRow | "new" | null>(null);
  const [duplicating, setDuplicating] = useState<EventRow | null>(null);
  const [registrants, setRegistrants] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const invalidate = useInvalidate();

  useEffect(() => { if (autoOpenNew) setEditing("new"); }, [autoOpenNew]);

  const events = useQuery({
    queryKey: ["admin", "events", siteId, period],
    enabled: !!siteId,
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase.from("events").select("*, category:event_categories(name), location:event_locations(name)").eq("site_id", siteId);
      query = period === "upcoming" ? query.gte("ends_at", now).order("starts_at") : query.lt("ends_at", now).order("starts_at", { ascending: false });
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as unknown as (EventRow & { category: { name: string } | null; location: { name: string } | null })[];
    },
  });

  const needle = q.trim().toLowerCase();
  const list = (events.data ?? []).filter((e) => !needle || `${e.title} ${e.category?.name ?? ""} ${e.location?.name ?? ""}`.toLowerCase().includes(needle));

  const cancelFn = useServerFn(cancelEvent);
  const cancel = async (e: EventRow) => {
    try {
      const res = await cancelFn({ data: { eventId: e.id } });
      invalidate("events");
      if (res.notified > 0) {
        toast.success(`Événement annulé. ${res.registrants} inscrit${res.registrants > 1 ? "s ont" : " a"} été prévenu${res.registrants > 1 ? "s" : ""} par e-mail.`);
      } else {
        toast.success("Événement annulé");
        // Sans envoi automatique configuré : message prêt à envoyer depuis la messagerie.
        if (res.registrants > 0) setRegistrants({ ...e, status: "cancelled" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Annulation impossible");
    }
  };

  const remove = async (e: EventRow, wholeSeries: boolean) => {
    let query = supabase.from("events").delete();
    query = wholeSeries && e.series_id ? query.eq("series_id", e.series_id).gte("starts_at", e.starts_at) : query.eq("id", e.id);
    const { error } = await query;
    if (error) { toast.error("Suppression impossible"); return; }
    await logActivity(siteId, wholeSeries ? "events.delete_series" : "events.delete", "events", e.id, { title: e.title });
    invalidate("events");
    toast.success("Supprimé");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border bg-card p-1">
          {(["upcoming", "past"] as const).map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}
              className={`h-9 rounded-full px-4 text-sm font-semibold ${period === p ? "bg-surface-high text-foreground" : "text-muted-foreground"}`}>
              {p === "upcoming" ? "À venir" : "Passés"}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <label htmlFor="q-events" className="sr-only">Rechercher un événement</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id="q-events" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-11 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm" />
        </div>
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden /> Ajouter un événement</button>
      </div>

      {events.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState>{needle ? `Aucun résultat pour « ${q} ».` : period === "upcoming" ? "Aucun événement à venir. Ajoutez le premier, ou partez d'un modèle." : "Aucun événement passé."}</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {list.map((e) => {
            const st = eventStatus(e);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-24 shrink-0 text-sm capitalize text-muted-foreground">
                  {format(new Date(e.starts_at), "EEE d MMM", { locale: fr })}<br />{format(new Date(e.starts_at), "HH:mm")} – {format(new Date(e.ends_at), "HH:mm")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${st === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
                    {e.title}{e.status === "draft" && <span className="ml-2 rounded-full border border-warning/50 px-2 text-xs text-warning">Brouillon</span>}
                    {e.series_id && <span className="ml-2 rounded-full border border-border px-2 text-xs font-normal text-muted-foreground">Série</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[e.category?.name, e.location?.name].filter(Boolean).join(" · ")}
                    {" · "}{e.registered_count}{e.capacity != null ? ` / ${e.capacity}` : ""} inscrits · {statusText[st]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setRegistrants(e)} className={btnSecondary}><Users className="h-4 w-4" aria-hidden /> Inscrits</button>
                  <IconButton label="Dupliquer" onClick={() => setDuplicating(e)}><Copy className="h-4 w-4" /></IconButton>
                  <IconButton label="Modifier" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></IconButton>
                  {e.status !== "cancelled" && st !== "ended" && (
                    <ConfirmButton label="Annuler l'événement" title="Annuler cet événement ?" confirmLabel="Annuler l'événement"
                      description={`« ${e.title} » restera visible avec la mention « Annulé ».${e.registered_count ? ` Les ${e.registered_count} inscrit(s) seront prévenus par e-mail.` : ""}`}
                      onConfirm={() => cancel(e)}>
                      <Ban className="h-4 w-4" aria-hidden />
                    </ConfirmButton>
                  )}
                  <IconButton label="Supprimer" onClick={() => setDeleting(e)} danger><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={editing !== null || duplicating !== null} onOpenChange={(o) => { if (!o) { setEditing(null); setDuplicating(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {(editing !== null || duplicating) && (
            <EventForm siteId={siteId} row={editing === "new" ? null : editing} copyOf={duplicating}
              onDone={() => { setEditing(null); setDuplicating(null); invalidate("events"); }} />
          )}
        </SheetContent>
      </Sheet>

      <RegistrantsDialog event={registrants} onClose={() => setRegistrants(null)} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.title} » et ses inscriptions seront supprimés définitivement. Pour garder une trace visible, préférez « Annuler l'événement ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel>Garder</AlertDialogCancel>
            {deleting?.series_id && (
              <AlertDialogAction onClick={() => deleting && remove(deleting, true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Toute la série à venir
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={() => deleting && remove(deleting, false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting?.series_id ? "Cette séance seulement" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border ${danger ? "text-destructive" : ""}`}>
      {children}
    </button>
  );
}

type FormState = {
  title: string; category_id: string; location_id: string; date: string; start: string; end: string;
  description: string; image_url: string; capacity: string; registration_open: boolean; status: "published" | "draft";
};

function stateFrom(row: EventRow | null): FormState {
  if (!row) {
    return { title: "", category_id: "", location_id: "", date: format(addDays(new Date(), 1), "yyyy-MM-dd"), start: "12:00", end: "13:00",
      description: "", image_url: "", capacity: "", registration_open: true, status: "published" };
  }
  const s = new Date(row.starts_at);
  return {
    title: row.title, category_id: row.category_id ?? "", location_id: row.location_id ?? "",
    date: format(s, "yyyy-MM-dd"), start: format(s, "HH:mm"), end: format(new Date(row.ends_at), "HH:mm"),
    description: row.description ?? "", image_url: row.image_url ?? "", capacity: row.capacity == null ? "" : String(row.capacity),
    registration_open: row.registration_open, status: row.status === "draft" ? "draft" : "published",
  };
}

/** Combine une date (aaaa-mm-jj) et une heure (hh:mm) en ISO, heure locale. */
const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

function EventForm({ siteId, row, copyOf, onDone }: { siteId: string; row: EventRow | null; copyOf: EventRow | null; onDone: () => void }) {
  const cats = useAdminRows("event_categories", siteId);
  const locs = useAdminRows("event_locations", siteId);
  const templates = useAdminRows("event_templates", siteId, { column: "name" });
  const [v, setV] = useState<FormState>(() => stateFrom(row ?? copyOf));
  const [repeat, setRepeat] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [until, setUntil] = useState(() => format(addDays(new Date(), 60), "yyyy-MM-dd"));
  const [scope, setScope] = useState<"one" | "series">("one");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, val: FormState[K]) => setV((s) => ({ ...s, [k]: val }));

  const applyTemplate = (id: string) => {
    const t = templates.data?.find((x) => x.id === id);
    if (!t) return;
    setV((s) => ({
      ...s, title: t.name, category_id: t.category_id ?? "", location_id: t.location_id ?? "",
      start: t.start_time.slice(0, 5), end: t.end_time.slice(0, 5),
      description: t.description ?? s.description, capacity: t.capacity == null ? s.capacity : String(t.capacity),
    }));
  };

  const occurrences = useMemo(() => {
    if (!repeat || !days.length || !v.date || !until) return [];
    const out: string[] = [];
    const end = parseISO(until);
    for (let d = startOfDay(parseISO(v.date)); !isBefore(end, d) && out.length < MAX_OCCURRENCES; d = addDays(d, 1)) {
      if (days.includes(d.getDay())) out.push(format(d, "yyyy-MM-dd"));
    }
    return out;
  }, [repeat, days, v.date, until]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return void toast.error("Indiquez un titre.");
    if (!v.date || !v.start || !v.end) return void toast.error("Indiquez la date et les horaires.");
    if (v.end <= v.start) return void toast.error("L'heure de fin doit être après l'heure de début.");
    if (repeat && !occurrences.length) return void toast.error("Choisissez au moins un jour de répétition.");

    const base = {
      title: v.title.trim(), category_id: v.category_id || null, location_id: v.location_id || null,
      description: v.description.trim() || null, image_url: v.image_url || null,
      capacity: v.capacity === "" ? null : Math.max(0, Math.round(Number(v.capacity))),
      registration_open: v.registration_open, status: v.status,
    };
    setBusy(true);
    try {
      if (row && row.series_id && scope === "series") {
        // Toute la série à venir : mêmes contenus et horaires, chaque séance garde sa date.
        const { data: siblings, error } = await supabase.from("events").select("id, starts_at").eq("series_id", row.series_id).gte("starts_at", row.starts_at);
        if (error) throw error;
        for (const s of siblings ?? []) {
          const day = format(new Date(s.starts_at), "yyyy-MM-dd");
          const { error: upErr } = await supabase.from("events").update({ ...base, starts_at: at(day, v.start), ends_at: at(day, v.end) }).eq("id", s.id);
          if (upErr) throw upErr;
        }
        await logActivity(siteId, "events.update_series", "events", row.id, { title: base.title, count: siblings?.length ?? 0 });
      } else if (row) {
        const { error } = await supabase.from("events").update({ ...base, starts_at: at(v.date, v.start), ends_at: at(v.date, v.end) }).eq("id", row.id);
        if (error) throw error;
        await logActivity(siteId, "events.update", "events", row.id, { title: base.title });
      } else {
        const dates = repeat ? occurrences : [v.date];
        const series_id = repeat ? crypto.randomUUID() : null;
        const rows = dates.map((d) => ({ ...base, site_id: siteId, series_id, starts_at: at(d, v.start), ends_at: at(d, v.end) }));
        const { error } = await supabase.from("events").insert(rows);
        if (error) throw error;
        await logActivity(siteId, repeat ? "events.create_series" : copyOf ? "events.duplicate" : "events.create", "events", null, { title: base.title, count: rows.length });
      }
      toast.success(repeat ? `${occurrences.length} séances créées` : "Enregistré");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col">
      <SheetHeader className="text-left">
        <SheetTitle>{row ? "Modifier l'événement" : copyOf ? "Dupliquer l'événement" : "Ajouter un événement"}</SheetTitle>
        <SheetDescription>Seuls le titre, la date et les horaires sont obligatoires.</SheetDescription>
      </SheetHeader>
      <div className="mt-5 flex-1 space-y-4">
        {row?.series_id && (
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Cette séance fait partie d'une série</legend>
            <label className="flex items-center gap-2 py-1"><input type="radio" checked={scope === "one"} onChange={() => setScope("one")} className="h-4 w-4" /> Modifier cette séance uniquement</label>
            <label className="flex items-center gap-2 py-1"><input type="radio" checked={scope === "series"} onChange={() => setScope("series")} className="h-4 w-4" /> Modifier toutes les séances à venir de la série</label>
            {scope === "series" && <p className="mt-1 text-xs text-muted-foreground">Chaque séance garde sa date ; titre, horaires, lieu et description sont mis à jour.</p>}
          </fieldset>
        )}
        {!row && !!templates.data?.length && (
          <FieldShell id="ev-tpl" label="Partir d'un modèle" help="Pré-remplit le titre, les horaires, le lieu et la catégorie.">
            <select id="ev-tpl" defaultValue="" onChange={(e) => applyTemplate(e.target.value)} className={inputCls}>
              <option value="">— Choisir un modèle —</option>
              {templates.data.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)})</option>)}
            </select>
          </FieldShell>
        )}
        <FieldShell id="ev-title" label="Titre" required>
          <input id="ev-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. : Pilates" className={inputCls} />
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id="ev-cat" label="Catégorie">
            <select id="ev-cat" value={v.category_id} onChange={(e) => set("category_id", e.target.value)} className={inputCls}>
              <option value="">— Aucune —</option>
              {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FieldShell>
          <FieldShell id="ev-loc" label="Lieu" help="Gérez la liste dans l'onglet « Lieux ».">
            <select id="ev-loc" value={v.location_id} onChange={(e) => set("location_id", e.target.value)} className={inputCls}>
              <option value="">— Aucun —</option>
              {locs.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </FieldShell>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {scope !== "series" && (
            <div className="col-span-2 sm:col-span-1">
              <FieldShell id="ev-date" label={repeat ? "À partir du" : "Date"} required>
                <input id="ev-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
              </FieldShell>
            </div>
          )}
          <FieldShell id="ev-start" label="Début" required>
            <input id="ev-start" type="time" value={v.start} onChange={(e) => set("start", e.target.value)} className={inputCls} />
          </FieldShell>
          <FieldShell id="ev-end" label="Fin" required>
            <input id="ev-end" type="time" value={v.end} onChange={(e) => set("end", e.target.value)} className={inputCls} />
          </FieldShell>
        </div>

        {!row && (
          <div className="rounded-xl border border-border p-3">
            <label className="flex items-center gap-3 font-semibold">
              <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="h-5 w-5" /> Répéter chaque semaine
            </label>
            {repeat && (
              <div className="mt-3 space-y-3">
                <fieldset>
                  <legend className="text-sm font-semibold">Les jours</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = days.includes(d.value);
                      return (
                        <button key={d.value} type="button" aria-pressed={on}
                          onClick={() => setDays((s) => (on ? s.filter((x) => x !== d.value) : [...s, d.value]))}
                          className={`h-10 min-w-12 rounded-full border px-3 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <FieldShell id="ev-until" label="Jusqu'au">
                  <input id="ev-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
                </FieldShell>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {occurrences.length ? `${occurrences.length} séance${occurrences.length > 1 ? "s" : ""} seront créées${occurrences.length >= MAX_OCCURRENCES ? " (maximum atteint)" : ""}.` : "Choisissez les jours de la semaine."}
                </p>
              </div>
            )}
          </div>
        )}

        <FieldShell id="ev-desc" label="Description">
          <textarea id="ev-desc" rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex. : Venez en tenue de sport, tapis fournis." className={`${inputCls} h-auto py-3`} />
        </FieldShell>
        <FieldShell id="ev-img" label="Image" help="Facultatif. L'image est automatiquement redimensionnée.">
          <ImageField id="ev-img" siteId={siteId} value={v.image_url} onChange={(x) => set("image_url", x)} />
        </FieldShell>
        <FieldShell id="ev-cap" label="Nombre de places" help="Laissez vide si le nombre de places n'est pas limité.">
          <input id="ev-cap" type="number" min={0} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="Ex. : 12" className={inputCls} />
        </FieldShell>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={v.registration_open} onChange={(e) => set("registration_open", e.target.checked)} className="mt-1 h-5 w-5" />
          <span><span className="font-semibold">Inscriptions ouvertes</span><span className="block text-xs text-muted-foreground">Décochez pour fermer les inscriptions sans annuler l'événement.</span></span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={v.status === "draft"} onChange={(e) => set("status", e.target.checked ? "draft" : "published")} className="mt-1 h-5 w-5" />
          <span><span className="font-semibold">Garder en brouillon</span><span className="block text-xs text-muted-foreground">L'événement ne sera pas visible par les occupants.</span></span>
        </label>
      </div>
      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 border-t border-border bg-background px-6 pb-6 pt-4">
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}

function RegistrantsDialog({ event, onClose }: { event: EventRow | null; onClose: () => void }) {
  const fetchRegistrants = useServerFn(getEventRegistrants);
  const list = useQuery({
    queryKey: ["admin", "registrants", event?.id],
    enabled: !!event,
    queryFn: () => fetchRegistrants({ data: { eventId: event!.id } }),
  });
  const people = list.data ?? [];
  const when = event ? format(new Date(event.starts_at), "EEEE d MMMM 'à' HH:mm", { locale: fr }) : "";

  const exportCsv = () => {
    if (!event) return;
    downloadCsv(`inscrits-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format(new Date(event.starts_at), "yyyy-MM-dd")}.csv`, [
      ["Prénom", "Nom", "E-mail", "Entreprise", "Étage", "Inscrit le"],
      ...people.map((p) => [p.first_name, p.last_name, p.email, p.company, p.floor, format(new Date(p.registered_at), "dd/MM/yyyy HH:mm")]),
    ]);
  };

  const emails = people.map((p) => p.email).filter(Boolean);
  const cancelled = event?.status === "cancelled";
  const mailto = event
    ? `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(`${cancelled ? "Annulation : " : ""}${event.title} — ${when}`)}` +
      (cancelled ? `&body=${encodeURIComponent(`Bonjour,\n\nNous sommes au regret de vous informer que l'événement « ${event.title} » prévu le ${when} est annulé.\n\nMerci de votre compréhension.\n`)}` : "")
    : "";

  return (
    <Dialog open={event !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inscrits · {event?.title}</DialogTitle>
          <DialogDescription className="capitalize">{when}</DialogDescription>
        </DialogHeader>
        {cancelled && emails.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            L'événement est annulé. Prévenez les inscrits : le bouton ci-dessous ouvre votre messagerie avec un message prêt à envoyer.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!people.length} className={btnSecondary}><Download className="h-4 w-4" aria-hidden /> Exporter (CSV)</button>
          <a href={emails.length ? mailto : undefined} aria-disabled={!emails.length} className={`${emails.length ? btnPrimary : `${btnSecondary} pointer-events-none opacity-50`}`}>
            <Mail className="h-4 w-4" aria-hidden /> {cancelled ? "Prévenir les inscrits" : "Écrire aux inscrits"}
          </a>
        </div>
        {list.isLoading ? <Loading /> : list.isError ? <EmptyState>Impossible de charger la liste des inscrits.</EmptyState> : people.length === 0 ? (
          <EmptyState>Personne n'est encore inscrit.</EmptyState>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {people.map((p, i) => (
              <li key={i} className="px-4 py-2.5">
                <p className="font-semibold">{[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}</p>
                <p className="text-sm text-muted-foreground">{[p.email, p.company, p.floor && `étage ${p.floor}`].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
