import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Search, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Field, type FieldDef } from "./fields";
import { db, logActivity, useAdminSite, useAdminTable, useInvalidateAdmin } from "@/lib/admin";

type Row = Record<string, unknown> & { id: string };

export function AdminHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50 ${p.className ?? ""}`}>
      {children}
    </button>
  );
}

export function GhostButton({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-surface-high disabled:opacity-50 ${p.className ?? ""}`}>
      {children}
    </button>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Supprimer", onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Persists an in-progress form in the browser so nothing is lost. */
export function useAutosave<T>(key: string | null, values: T, active: boolean) {
  useEffect(() => {
    if (!key || !active) return;
    const h = setTimeout(() => localStorage.setItem(key, JSON.stringify({ at: Date.now(), values })), 600);
    return () => clearTimeout(h);
  }, [key, values, active]);
}
export function readDraft<T>(key: string): { at: number; values: T } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export type FormSheetProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string | undefined;
  draftKey: string;
  initial: Record<string, unknown>;
  fields: FieldDef[] | ((v: Record<string, unknown>, set: (k: string, val: unknown) => void) => ReactNode);
  preview?: ((v: Record<string, unknown>) => ReactNode) | undefined;
  onSubmit: (v: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  extraButtons?: (v: Record<string, unknown>) => ReactNode;
};

export function FormSheet({ open, onOpenChange, title, description, draftKey, initial, fields, preview, onSubmit, submitLabel = "Enregistrer", extraButtons }: FormSheetProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [restored, setRestored] = useState(false);
  const opened = useRef(false);
  useEffect(() => {
    if (open && !opened.current) {
      const d = readDraft<Record<string, unknown>>(draftKey);
      if (d && JSON.stringify(d.values) !== JSON.stringify(initial)) {
        setValues(d.values);
        setRestored(true);
      } else {
        setValues(initial);
        setRestored(false);
      }
    }
    opened.current = open;
  }, [open, draftKey, initial]);
  useAutosave(draftKey, values, open);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
      localStorage.removeItem(draftKey);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {restored && (
          <div className="mx-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <span>Votre brouillon non enregistré a été récupéré.</span>
            <button type="button" className="font-semibold underline" onClick={() => { setValues(initial); setRestored(false); localStorage.removeItem(draftKey); }}>
              Repartir de zéro
            </button>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4 px-4 pb-8">
          {typeof fields === "function"
            ? fields(values, set)
            : fields.map((f) => <Field key={f.name} def={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />)}
          <p className="text-xs text-muted-foreground">Vos saisies sont gardées automatiquement sur cet appareil tant que vous n'avez pas enregistré.</p>
          <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-border bg-background px-4 py-3">
            <PrimaryButton type="submit" disabled={saving}>{saving ? "Enregistrement…" : submitLabel}</PrimaryButton>
            {preview && <GhostButton onClick={() => setShowPreview(true)}><Eye className="h-4 w-4" /> Aperçu</GhostButton>}
            {extraButtons?.(values)}
          </div>
        </form>
        {preview && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Aperçu</DialogTitle>
                <DialogDescription>Voici ce que verront les occupants.</DialogDescription>
              </DialogHeader>
              <div className="pointer-events-none">{preview(values)}</div>
            </DialogContent>
          </Dialog>
        )}
      </SheetContent>
    </Sheet>
  );
}

export type CrudConfig = {
  table: string;
  title: string;
  intro: string;
  singular: string; // "un contact"
  addLabel: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  primary: (r: Row) => ReactNode;
  secondary?: (r: Row) => ReactNode;
  searchKeys: string[];
  sortable?: boolean;
  visibleToggle?: boolean;
  emptyText: string;
  preview?: (v: Record<string, unknown>) => ReactNode;
  groups?: { id: string; label: string }[];
  groupKey?: string;
  beforeList?: ReactNode;
  order?: string;
  ascending?: boolean;
};

export function CrudPage(c: CrudConfig) {
  const { site } = useAdminSite();
  const list = useAdminTable<Row>(c.table, c.order ?? (c.sortable ? "position" : "created_at"), c.ascending ?? !!c.sortable);
  const invalidate = useInvalidateAdmin();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState<Record<string, unknown> | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = list.data ?? [];
    return s ? all.filter((r) => c.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s))) : all;
  }, [list.data, q, c.searchKeys]);

  const strip = (v: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const f of c.fields) out[f.name] = v[f.name] === "" ? null : v[f.name];
    if (c.groupKey) out[c.groupKey] = v[c.groupKey];
    return out;
  };

  const save = async (v: Record<string, unknown>, id?: string) => {
    for (const f of c.fields) if (f.required && (v[f.name] == null || v[f.name] === "")) throw new Error(`Le champ « ${f.label} » est obligatoire.`);
    const payload = strip(v);
    if (id) {
      const { error } = await db.from(c.table).update(payload).eq("id", id);
      if (error) throw error;
      await logActivity(site!.id, "update", c.table, id);
      toast.success("Modifications enregistrées.");
    } else {
      const position = (list.data ?? []).length;
      const { data, error } = await db.from(c.table).insert({ ...payload, site_id: site!.id, ...(c.sortable ? { position } : {}) }).select("id").single();
      if (error) throw error;
      await logActivity(site!.id, "create", c.table, data.id);
      toast.success("C'est ajouté !");
    }
    invalidate(c.table);
  };

  const duplicate = async (r: Row) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = r;
    const firstText = c.fields.find((f) => f.type === "text")?.name;
    if (firstText) rest[firstText] = `${rest[firstText] ?? ""} (copie)`;
    const { error } = await db.from(c.table).insert({ ...rest, ...(c.sortable ? { position: (list.data ?? []).length } : {}) });
    if (error) return toast.error("La copie a échoué.");
    toast.success("Copie créée. Pensez à la modifier.");
    invalidate(c.table);
  };

  const remove = async (r: Row) => {
    const { error } = await db.from(c.table).delete().eq("id", r.id);
    if (error) return toast.error("Suppression impossible.");
    await logActivity(site!.id, "delete", c.table, r.id);
    toast.success("Supprimé. Vous pouvez le restaurer depuis l'historique pendant 30 jours.");
    invalidate(c.table);
  };

  const toggleVisible = async (r: Row) => {
    await db.from(c.table).update({ visible: !r["visible"] }).eq("id", r.id);
    invalidate(c.table);
  };

  const reorder = async (group: Row[], from: number, to: number) => {
    if (to < 0 || to >= group.length || from === to) return;
    const next = [...group];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m!);
    await Promise.all(next.map((r, i) => db.from(c.table).update({ position: i }).eq("id", r.id)));
    invalidate(c.table);
  };

  const groups = c.groups && c.groupKey ? c.groups.map((g) => ({ ...g, rows: rows.filter((r) => r[c.groupKey!] === g.id) })) : [{ id: "all", label: "", rows }];

  return (
    <div>
      <AdminHeader title={c.title} intro={c.intro} action={<PrimaryButton onClick={() => setCreating({ ...c.defaults })}><Plus className="h-5 w-5" /> {c.addLabel}</PrimaryButton>} />
      {c.beforeList}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="h-11 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm" />
      </div>
      {list.isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="mb-6">
            {g.label && (
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{g.label}</h2>
                <button type="button" className="text-sm font-semibold text-brand-light" onClick={() => setCreating({ ...c.defaults, [c.groupKey!]: g.id })}>+ Ajouter ici</button>
              </div>
            )}
            {g.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {q ? "Aucun résultat pour cette recherche." : c.emptyText}
              </div>
            ) : (
              <SortableRows
                rows={g.rows}
                sortable={!!c.sortable && !q}
                onMove={(f, t) => reorder(g.rows, f, t)}
                render={(r) => (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.primary(r)}</p>
                      {c.secondary && <div className="truncate text-sm text-muted-foreground">{c.secondary(r)}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.visibleToggle && (
                        <label className="mr-1 flex items-center gap-2 text-xs text-muted-foreground" title={r["visible"] ? "Visible par les occupants" : "Masqué"}>
                          {r["visible"] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          <Switch checked={!!r["visible"]} onCheckedChange={() => toggleVisible(r)} aria-label="Afficher aux occupants" />
                        </label>
                      )}
                      <IconBtn label="Modifier" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Dupliquer" onClick={() => duplicate(r)}><Copy className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Supprimer" onClick={() => setToDelete(r)} danger><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </>
                )}
              />
            )}
          </section>
        ))
      )}

      <FormSheet
        open={!!creating}
        onOpenChange={(o) => !o && setCreating(null)}
        title={c.addLabel}
        draftKey={`admin-draft:${c.table}:new`}
        initial={creating ?? c.defaults}
        fields={c.fields}
        preview={c.preview}
        onSubmit={(v) => save({ ...creating, ...v })}
      />
      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Modifier ${c.singular}`}
        draftKey={`admin-draft:${c.table}:${editing?.id ?? "x"}`}
        initial={editing ?? {}}
        fields={c.fields}
        preview={c.preview}
        onSubmit={(v) => save(v, editing!.id)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer ${c.singular} ?`}
        description="Il ne sera plus visible par les occupants. Vous pourrez le restaurer depuis l'historique pendant 30 jours."
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </div>
  );
}

export function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-high ${danger ? "text-destructive" : ""}`}>
      {children}
    </button>
  );
}

export function SortableRows<T extends { id: string }>({ rows, sortable, onMove, render }: { rows: T[]; sortable: boolean; onMove: (from: number, to: number) => void; render: (r: T) => ReactNode }) {
  const [drag, setDrag] = useState<number | null>(null);
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((r, i) => (
        <li
          key={r.id}
          draggable={sortable}
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => sortable && e.preventDefault()}
          onDrop={() => { if (drag != null) onMove(drag, i); setDrag(null); }}
          className={`flex items-center gap-2 p-3 ${drag === i ? "opacity-50" : ""}`}
        >
          {sortable && (
            <div className="flex shrink-0 items-center">
              <GripVertical className="hidden h-5 w-5 cursor-grab text-muted-foreground md:block" aria-hidden />
              <div className="flex flex-col">
                <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => onMove(i, i - 1)} className="p-0.5 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Descendre" disabled={i === rows.length - 1} onClick={() => onMove(i, i + 1)} className="p-0.5 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          {render(r)}
        </li>
      ))}
    </ul>
  );
}
