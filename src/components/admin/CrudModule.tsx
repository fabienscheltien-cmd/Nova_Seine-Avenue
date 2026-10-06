import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, Loading } from "@/components/common";
import { swapPositions, toLocalInput, useAdminRows, useDeleteRow, useInvalidate, useSaveRow, type AdminTable } from "@/lib/admin";
import { ConfirmButton, FieldShell, ImageField, RichTextEditor, btnPrimary, btnSecondary, inputCls } from "./fields";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "number" | "email" | "tel" | "url" | "checkbox" | "select" | "datetime" | "time" | "image";
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  /** Affiche le champ uniquement si la condition est vraie. */
  showIf?: (values: Values) => boolean;
};
export type Values = Record<string, string | number | boolean | null>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any> & { id: string };

type Props = {
  table: AdminTable;
  siteId: string;
  /** Nom d'un élément, au singulier : « une question », « un contact »… */
  noun: string;
  addLabel: string;
  emptyText: string;
  fields: FieldDef[];
  rowTitle: (r: AnyRow) => string;
  rowMeta?: (r: AnyRow) => ReactNode;
  order?: { column: string; ascending?: boolean };
  orderable?: boolean;
  hideable?: boolean;
  groupBy?: { field: string; groups: { value: string; label: string }[] };
  preview?: (v: Values) => ReactNode;
  /** Ajustements avant enregistrement (ex. date de publication). */
  beforeSave?: (v: Values, row: AnyRow | null) => Values;
  extraActions?: (r: AnyRow) => ReactNode;
  autoOpenNew?: boolean;
};

const DRAFT_PREFIX = "nova-admin-draft:";

function readDraft(key: string): Values | null {
  try { const raw = localStorage.getItem(DRAFT_PREFIX + key); return raw ? (JSON.parse(raw) as Values) : null; } catch { return null; }
}
function writeDraft(key: string, v: Values | null) {
  try { if (v) localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(v)); else localStorage.removeItem(DRAFT_PREFIX + key); } catch { /* stockage indisponible */ }
}

function initialValues(fields: FieldDef[], row: AnyRow | null): Values {
  const v: Values = {};
  for (const f of fields) {
    const raw = row ? row[f.name] : f.defaultValue;
    if (f.type === "checkbox") v[f.name] = row ? !!raw : (f.defaultValue as boolean | undefined) ?? false;
    else if (f.type === "datetime") v[f.name] = toLocalInput(raw as string | null);
    else if (f.type === "time") v[f.name] = raw ? String(raw).slice(0, 5) : "";
    else v[f.name] = raw == null ? "" : (raw as string | number);
  }
  return v;
}

function toDb(fields: FieldDef[], v: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const raw = v[f.name];
    if (f.type === "checkbox") out[f.name] = !!raw;
    else if (f.type === "number") out[f.name] = raw === "" || raw == null ? null : Math.max(0, Math.round(Number(raw)));
    else if (f.type === "datetime") out[f.name] = raw ? new Date(String(raw)).toISOString() : null;
    else {
      const s = String(raw ?? "").trim();
      out[f.name] = s === "" ? (f.required ? "" : null) : s;
    }
  }
  return out;
}

export function CrudModule(p: Props) {
  const rows = useAdminRows(p.table, p.siteId, p.order ?? { column: "position" });
  const save = useSaveRow(p.table, p.siteId);
  const del = useDeleteRow(p.table, p.siteId);
  const invalidate = useInvalidate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AnyRow | "new" | null>(null);

  useEffect(() => { if (p.autoOpenNew) setEditing("new"); }, [p.autoOpenNew]);

  const list = (rows.data ?? []) as unknown as AnyRow[];
  const needle = q.trim().toLowerCase();
  const filtered = needle ? list.filter((r) => JSON.stringify(r).toLowerCase().includes(needle)) : list;
  const groups = p.groupBy
    ? p.groupBy.groups.map((g) => ({ ...g, rows: filtered.filter((r) => r[p.groupBy!.field] === g.value) }))
    : [{ value: "", label: "", rows: filtered }];

  const move = async (r: AnyRow, siblings: AnyRow[], dir: -1 | 1) => {
    const i = siblings.findIndex((s) => s.id === r.id);
    const other = siblings[i + dir];
    if (!other) return;
    try { await swapPositions(p.table, r as never, other as never); invalidate(p.table); }
    catch { toast.error("Déplacement impossible"); }
  };

  const toggleVisible = (r: AnyRow) =>
    save.mutate({ id: r.id, values: { visible: !r["visible"] }, action: `${p.table}.${r["visible"] ? "hide" : "show"}` },
      { onSuccess: () => toast.success(r["visible"] ? "Masqué pour les occupants" : "Visible pour les occupants") });

  const duplicate = (r: AnyRow) => {
    const values: Values = {};
    for (const f of p.fields) values[f.name] = r[f.name] ?? null;
    if (typeof values["title"] === "string") values["title"] = `${values["title"]} (copie)`;
    if (typeof values["name"] === "string") values["name"] = `${values["name"]} (copie)`;
    if (p.orderable) values["position"] = list.length + 1;
    if (p.table === "news") { values["status"] = "draft"; values["published_at"] = null; }
    save.mutate({ values, action: `${p.table}.duplicate` }, { onSuccess: () => toast.success("Copie créée") });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`q-${p.table}`} className="sr-only">Rechercher</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id={`q-${p.table}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            className="h-11 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm" />
        </div>
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          <Plus className="h-4 w-4" aria-hidden /> {p.addLabel}
        </button>
      </div>

      {rows.isLoading ? <Loading /> : list.length === 0 ? <EmptyState>{p.emptyText}</EmptyState> : filtered.length === 0 ? (
        <EmptyState>Aucun résultat pour « {q} ».</EmptyState>
      ) : groups.map((g) => (
        <section key={g.value || "all"} className="mb-6">
          {g.label && <h2 className="mb-2 font-semibold">{g.label} <span className="text-sm font-normal text-muted-foreground">({g.rows.length})</span></h2>}
          {g.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">Rien dans cette rubrique pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {g.rows.map((r, i) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${p.hideable && !r["visible"] ? "text-muted-foreground line-through" : ""}`}>{p.rowTitle(r)}</p>
                    {p.rowMeta && <div className="mt-0.5 text-sm text-muted-foreground">{p.rowMeta(r)}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.orderable && !needle && (
                      <>
                        <IconBtn label="Monter" disabled={i === 0} onClick={() => move(r, g.rows, -1)}><ArrowUp className="h-4 w-4" /></IconBtn>
                        <IconBtn label="Descendre" disabled={i === g.rows.length - 1} onClick={() => move(r, g.rows, 1)}><ArrowDown className="h-4 w-4" /></IconBtn>
                      </>
                    )}
                    {p.hideable && (
                      <IconBtn label={r["visible"] ? "Masquer aux occupants" : "Afficher aux occupants"} onClick={() => toggleVisible(r)}>
                        {r["visible"] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </IconBtn>
                    )}
                    {p.extraActions?.(r)}
                    <IconBtn label="Dupliquer" onClick={() => duplicate(r)}><Copy className="h-4 w-4" /></IconBtn>
                    <IconBtn label="Modifier" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></IconBtn>
                    <ConfirmButton label="Supprimer" title={`Supprimer ${p.noun} ?`}
                      description={`« ${p.rowTitle(r)} » sera supprimé définitivement.${p.hideable ? " Pour le retirer temporairement, utilisez plutôt le bouton « Masquer »." : ""}`}
                      onConfirm={() => del.mutate(r.id)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {editing !== null && (
            <EditForm
              {...p}
              row={editing === "new" ? null : editing}
              nextPosition={list.length + 1}
              busy={save.isPending}
              onSubmit={(values, row) =>
                save.mutate({ id: row?.id, values }, {
                  onSuccess: () => { toast.success("Enregistré"); writeDraft(`${p.table}:${row?.id ?? "new"}`, null); setEditing(null); },
                })}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border disabled:opacity-30">
      {children}
    </button>
  );
}

function EditForm(p: Props & { row: AnyRow | null; nextPosition: number; busy: boolean; onSubmit: (v: Values, row: AnyRow | null) => void }) {
  const draftKey = `${p.table}:${p.row?.id ?? "new"}`;
  const saved = useMemo(() => initialValues(p.fields, p.row), [p.fields, p.row]);
  const [values, setValues] = useState<Values>(() => readDraft(draftKey) ?? saved);
  const [restored] = useState(() => readDraft(draftKey) !== null);
  const [preview, setPreview] = useState(false);

  // Enregistrement automatique du brouillon local pendant la saisie.
  useEffect(() => {
    const t = setTimeout(() => writeDraft(draftKey, JSON.stringify(values) === JSON.stringify(saved) ? null : values), 400);
    return () => clearTimeout(t);
  }, [values, saved, draftKey]);

  const set = (name: string, v: Values[string]) => setValues((s) => ({ ...s, [name]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const missing = p.fields.find((f) => f.required && (!f.showIf || f.showIf(values)) && String(values[f.name] ?? "").trim() === "");
    if (missing) { toast.error(`Le champ « ${missing.label} » est obligatoire.`); return; }
    let out = toDb(p.fields, values);
    if (!p.row && p.orderable) out["position"] = p.nextPosition;
    if (p.beforeSave) out = p.beforeSave(out, p.row);
    p.onSubmit(out, p.row);
  };

  const discardDraft = () => { writeDraft(draftKey, null); setValues(saved); };

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col">
      <SheetHeader className="text-left">
        <SheetTitle>{p.row ? `Modifier ${p.noun}` : p.addLabel}</SheetTitle>
        <SheetDescription>Les champs marqués d'une étoile sont obligatoires. Vos saisies sont conservées automatiquement sur cet appareil.</SheetDescription>
      </SheetHeader>

      {restored && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          Nous avons retrouvé une saisie non enregistrée.{" "}
          <button type="button" onClick={discardDraft} className="font-semibold underline">Revenir à la version enregistrée</button>
        </div>
      )}

      {preview && p.preview ? (
        <div className="mt-5 flex-1">
          <p className="mb-3 text-sm text-muted-foreground">Aperçu : voici ce que verront les occupants.</p>
          <div className="rounded-2xl border border-border bg-background p-4">{p.preview(toDb(p.fields, values))}</div>
        </div>
      ) : (
        <div className="mt-5 flex-1 space-y-4">
          {p.fields.filter((f) => !f.showIf || f.showIf(values)).map((f) => (
            <FieldInput key={f.name} field={f} siteId={p.siteId} value={values[f.name] ?? ""} onChange={(v) => set(f.name, v)} />
          ))}
        </div>
      )}

      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex flex-wrap gap-2 border-t border-border bg-background px-6 pb-6 pt-4">
        <button type="submit" disabled={p.busy} className={`${btnPrimary} flex-1`}>{p.busy ? "Enregistrement…" : "Enregistrer"}</button>
        {p.preview && (
          <button type="button" onClick={() => setPreview((x) => !x)} className={btnSecondary}>
            {preview ? <><Pencil className="h-4 w-4" aria-hidden /> Modifier</> : <><Eye className="h-4 w-4" aria-hidden /> Aperçu</>}
          </button>
        )}
      </div>
    </form>
  );
}

function FieldInput({ field: f, siteId, value, onChange }: { field: FieldDef; siteId: string; value: Values[string]; onChange: (v: Values[string]) => void }) {
  const id = `f-${f.name}`;
  const common = { id, "aria-describedby": f.help ? `${id}-help` : undefined, placeholder: f.placeholder };
  if (f.type === "checkbox") {
    return (
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5" />
        <span><span className="font-semibold">{f.label}</span>{f.help && <span className="block text-xs text-muted-foreground">{f.help}</span>}</span>
      </label>
    );
  }
  let control: ReactNode;
  switch (f.type) {
    case "textarea":
      control = <textarea {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} rows={5} className={`${inputCls} h-auto py-3`} />;
      break;
    case "richtext":
      control = <RichTextEditor id={id} siteId={siteId} value={String(value)} onChange={onChange} />;
      break;
    case "image":
      control = <ImageField id={id} siteId={siteId} value={String(value)} onChange={onChange} />;
      break;
    case "select":
      control = (
        <select {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {!f.required && <option value="">— Aucun —</option>}
          {f.required && value === "" && <option value="" disabled>Choisir…</option>}
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    default: {
      const type = f.type === "datetime" ? "datetime-local" : f.type;
      control = <input {...common} type={type} min={f.type === "number" ? 0 : undefined} value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
    }
  }
  return <FieldShell id={id} label={f.label} help={f.help} required={f.required}>{control}</FieldShell>;
}
