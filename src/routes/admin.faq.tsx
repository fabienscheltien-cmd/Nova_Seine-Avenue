import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/meta";
import { CrudPage, ConfirmDialog, IconBtn, SortableRows } from "@/components/admin/CrudPage";
import { Switch } from "@/components/ui/switch";
import { db, useAdminSite, useAdminTable, useInvalidateAdmin } from "@/lib/admin";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/admin/faq")({
  head: () => pageMeta("Gestion — FAQ", "Gérez les questions fréquentes par thème."),
  component: FaqAdmin,
});

type Theme = { id: string; name: string; visible: boolean; position: number };

function FaqAdmin() {
  const themes = useAdminTable<Theme>("faq_themes");
  const list = themes.data ?? [];
  return (
    <CrudPage
      table="faq_items"
      title="FAQ"
      intro="Questions et réponses regroupées par thème. Glissez pour changer l'ordre, utilisez l'interrupteur pour masquer sans supprimer."
      singular="cette question"
      addLabel="Ajouter une question FAQ"
      sortable
      visibleToggle
      groupKey="theme_id"
      groups={list.map((t) => ({ id: t.id, label: t.name }))}
      beforeList={<ThemesManager themes={list} />}
      searchKeys={["question", "answer"]}
      emptyText="Aucune question pour l'instant. Ajoutez la première."
      primary={(r) => String(r["question"])}
      defaults={{ question: "", answer: "", theme_id: list[0]?.id ?? "", visible: true }}
      preview={(v) => (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-semibold">{String(v["question"] || "Votre question")}</p>
          <div className="mt-2 text-sm text-muted-foreground"><SafeHtml html={String(v["answer"] ?? "")} /></div>
        </div>
      )}
      fields={[
        { name: "theme_id", label: "Thème", type: "select", required: true, options: list.map((t) => ({ value: t.id, label: t.name })) },
        { name: "question", label: "Question", type: "text", required: true, placeholder: "Ex. Que faire si j'ai oublié mon badge ?" },
        { name: "answer", label: "Réponse", type: "rich", required: true, placeholder: "Ex. Présentez-vous à l'accueil avec une pièce d'identité…" },
        { name: "visible", label: "Visible par les occupants", type: "switch" },
      ]}
    />
  );
}

function ThemesManager({ themes }: { themes: Theme[] }) {
  const { site } = useAdminSite();
  const invalidate = useInvalidateAdmin();
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Theme | null>(null);
  const refresh = () => invalidate("faq_themes");
  const add = async () => {
    const name = window.prompt("Nom du nouveau thème (ex. Accès et badges)");
    if (!name?.trim()) return;
    await db.from("faq_themes").insert({ site_id: site!.id, name: name.trim(), position: themes.length });
    refresh();
  };
  const rename = async (t: Theme) => {
    const name = window.prompt("Nouveau nom du thème", t.name);
    if (!name?.trim()) return;
    await db.from("faq_themes").update({ name: name.trim() }).eq("id", t.id);
    refresh();
  };
  const move = async (f: number, to: number) => {
    if (to < 0 || to >= themes.length) return;
    const next = [...themes];
    const [m] = next.splice(f, 1);
    next.splice(to, 0, m!);
    await Promise.all(next.map((t, i) => db.from("faq_themes").update({ position: i }).eq("id", t.id)));
    refresh();
  };
  const remove = async (t: Theme) => {
    const { error } = await db.from("faq_themes").delete().eq("id", t.id);
    if (error) toast.error("Ce thème contient encore des questions : déplacez-les ou supprimez-les d'abord.");
    refresh();
  };
  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm"><span className="font-semibold">{themes.length} thèmes</span> <span className="text-muted-foreground">— les rubriques de la FAQ</span></p>
        <button type="button" className="text-sm font-semibold text-brand-light" onClick={() => setOpen(!open)}>{open ? "Fermer" : "Gérer les thèmes"}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <SortableRows rows={themes} sortable onMove={move} render={(t) => (
            <>
              <span className="flex-1 font-medium">{t.name}</span>
              <Switch checked={t.visible} aria-label="Afficher ce thème" onCheckedChange={async () => { await db.from("faq_themes").update({ visible: !t.visible }).eq("id", t.id); refresh(); }} />
              <IconBtn label="Renommer" onClick={() => rename(t)}><Pencil className="h-4 w-4" /></IconBtn>
              <IconBtn label="Supprimer" danger onClick={() => setDel(t)}><Trash2 className="h-4 w-4" /></IconBtn>
            </>
          )} />
          <button type="button" onClick={add} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"><Plus className="h-4 w-4" /> Ajouter un thème</button>
        </div>
      )}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Supprimer ce thème ?" description="Possible uniquement s'il ne contient plus de questions." onConfirm={() => del && remove(del)} />
    </div>
  );
}
