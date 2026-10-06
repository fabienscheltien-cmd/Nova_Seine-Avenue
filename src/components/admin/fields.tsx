import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, List, ListOrdered, Link2, ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadImage } from "@/lib/admin";

export const inputCls = "mt-1 h-12 w-full rounded-xl border border-input bg-background px-4 text-base";
export const btnPrimary = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60";
export const btnSecondary = "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold disabled:opacity-60";

export function FieldShell({ id, label, help, required, children }: { id: string; label: string; help?: string | undefined; required?: boolean | undefined; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}{required && <span className="text-destructive" aria-hidden> *</span>}
      </label>
      {children}
      {help && <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

export function ConfirmButton({ label, title, description, confirmLabel = "Supprimer", onConfirm, className, children }: {
  label: string; title: string; description: string; confirmLabel?: string; onConfirm: () => void; className?: string; children?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" className={className ?? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-destructive"} aria-label={label} title={label}>
          {children ?? <Trash2 className="h-4 w-4" aria-hidden />}
        </button>
      </AlertDialogTrigger>
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

export function ImageField({ id, siteId, value, onChange }: { id: string; siteId: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImage(siteId, file)); toast.success("Image ajoutée"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Téléversement impossible"); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-1 space-y-2">
      {value && <img src={value} alt="Aperçu de l'image" className="max-h-44 rounded-xl border border-border object-cover" />}
      <div className="flex flex-wrap gap-2">
        <label className={`${btnSecondary} cursor-pointer`}>
          <Upload className="h-4 w-4" aria-hidden /> {busy ? "Envoi…" : value ? "Changer l'image" : "Choisir une image"}
          <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {value && <button type="button" className={btnSecondary} onClick={() => onChange("")}>Retirer</button>}
      </div>
    </div>
  );
}

/** Éditeur simple : gras, italique, listes, liens, images. Produit du HTML (nettoyé à l'affichage). */
export function RichTextEditor({ id, siteId, value, onChange }: { id: string; siteId: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };
  const addLink = () => {
    const url = prompt("Adresse du lien (https://…)");
    if (url && /^(https?:|mailto:|tel:)/i.test(url.trim())) exec("createLink", url.trim());
    else if (url) toast.error("Le lien doit commencer par https://, mailto: ou tel:");
  };
  const addImage = async (file: File | undefined) => {
    if (!file) return;
    try { exec("insertImage", await uploadImage(siteId, file)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Téléversement impossible"); }
  };
  const tools = [
    { label: "Gras", icon: Bold, run: () => exec("bold") },
    { label: "Italique", icon: Italic, run: () => exec("italic") },
    { label: "Liste à puces", icon: List, run: () => exec("insertUnorderedList") },
    { label: "Liste numérotée", icon: ListOrdered, run: () => exec("insertOrderedList") },
    { label: "Ajouter un lien", icon: Link2, run: addLink },
    { label: "Insérer une image", icon: ImagePlus, run: () => fileRef.current?.click() },
  ];
  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-input bg-background">
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap gap-1 border-b border-border bg-card p-1.5">
        {tools.map(({ label, icon: Icon, run }) => (
          <button key={label} type="button" onClick={run} title={label} aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-high">
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        ))}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <span id={labelId} className="sr-only">Contenu</span>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-nova min-h-48 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
