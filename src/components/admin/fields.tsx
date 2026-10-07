import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, List, ListOrdered, Link2, ImagePlus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { compressImage } from "@/lib/admin";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "rich" | "email" | "tel" | "url" | "number" | "switch" | "select" | "image" | "date" | "time" | "datetime";
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  half?: boolean;
};

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring md:text-sm";

export function FieldShell({ id, label, help, required, children }: { id: string; label: string; help?: string | undefined; required?: boolean | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label} {required ? <span className="text-destructive" aria-label="obligatoire">*</span> : <span className="font-normal text-muted-foreground">(facultatif)</span>}
      </label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

export function Field({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const id = `f-${def.name}`;
  const common = { id, placeholder: def.placeholder, required: def.required, className: inputCls };
  let control: ReactNode;
  switch (def.type) {
    case "textarea":
      control = <textarea {...common} className={`${inputCls} h-auto min-h-24 py-2`} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "rich":
      control = <RichText id={id} value={(value as string) ?? ""} onChange={onChange} placeholder={def.placeholder} />;
      break;
    case "number":
      control = <input {...common} type="number" min={0} inputMode="numeric" value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
      break;
    case "switch":
      return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
          <div>
            <label htmlFor={id} className="text-sm font-semibold">{def.label}</label>
            {def.help && <p className="text-xs text-muted-foreground">{def.help}</p>}
          </div>
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "select":
      control = (
        <select {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          {!def.required && <option value="">— Aucun —</option>}
          {def.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "image":
      control = <ImageField id={id} value={(value as string) ?? ""} onChange={onChange} />;
      break;
    case "datetime":
      control = <input {...common} type="datetime-local" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      control = <input {...common} type={def.type} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return <FieldShell id={id} label={def.label} help={def.help} required={def.required}>{control}</FieldShell>;
}

export function ImageField({ id, value, onChange, maxSize = 1600 }: { id: string; value: string; onChange: (v: string | null) => void; maxSize?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Ce fichier n'est pas une image.");
    setBusy(true);
    try {
      onChange(await compressImage(f, maxSize));
      toast.success("Image ajoutée (redimensionnée automatiquement).");
    } catch {
      toast.error("Impossible de lire cette image.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? <img src={value} alt="Aperçu" className="h-20 w-32 rounded-lg border border-border object-cover" /> : null}
      <input ref={ref} id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => ref.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {value ? "Changer l'image" : "Choisir une image"}
      </button>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm text-destructive">
          <Trash2 className="h-4 w-4" /> Retirer
        </button>
      )}
    </div>
  );
}

function RichText({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };
  const btn = (label: string, icon: ReactNode, fn: () => void) => (
    <button type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={fn} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-high">
      {icon}
    </button>
  );
  return (
    <div className="rounded-xl border border-input bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border p-1">
        {btn("Gras", <Bold className="h-4 w-4" />, () => exec("bold"))}
        {btn("Italique", <Italic className="h-4 w-4" />, () => exec("italic"))}
        {btn("Liste à puces", <List className="h-4 w-4" />, () => exec("insertUnorderedList"))}
        {btn("Liste numérotée", <ListOrdered className="h-4 w-4" />, () => exec("insertOrderedList"))}
        {btn("Ajouter un lien", <Link2 className="h-4 w-4" />, () => {
          const url = window.prompt("Adresse du lien (ex. https://www.exemple.fr)");
          if (url) exec("createLink", url);
        })}
        {btn("Ajouter une image", <ImagePlus className="h-4 w-4" />, () => imgRef.current?.click())}
        <input ref={imgRef} type="file" accept="image/*" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) exec("insertImage", await compressImage(f, 1200));
          e.target.value = "";
        }} />
      </div>
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="prose-admin min-h-40 px-3 py-2 text-sm focus:outline-none empty:before:text-muted-foreground/70 empty:before:content-[attr(data-placeholder)] [&_a]:text-brand-light [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
