import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAdminSite } from "@/lib/admin-site";
import { logActivity } from "@/lib/admin";
import { theme } from "@/theme";
import { slugify } from "@/lib/slug";
import { FieldShell, btnPrimary, btnSecondary, inputCls } from "@/components/admin/fields";
import { EmptyState, PageHeader, SectionTitle } from "@/components/common";

export const Route = createFileRoute("/admin/sites")({ component: AdminSites });

const DEFAULT_CATEGORIES = ["Sport", "Bien-être", "Animation", "Services", "Autre"];
const DEFAULT_FAQ_THEMES = ["Accès et badges", "Réservations", "Restauration", "Services", "Sécurité", "Contacts"];

function AdminSites() {
  const { isSuperAdmin } = useAuth();
  const { sites, site: current, selectSite } = useAdminSite();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [seed, setSeed] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!isSuperAdmin) return <EmptyState>Cette page est réservée aux super-admins NOVA.</EmptyState>;

  const finalSlug = slugTouched ? slug : slugify(name);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!name.trim()) return void toast.error("Indiquez le nom du site.");
    if (!/^[a-z0-9-]{2,60}$/.test(finalSlug)) return void toast.error("L'adresse ne peut contenir que des lettres minuscules, chiffres et tirets.");
    if (sites.some((s) => s.slug === finalSlug)) return void toast.error("Cette adresse est déjà utilisée par un autre site.");
    setBusy(true);
    const { data: created, error } = await supabase.from("sites").insert({
      name: name.trim(), slug: finalSlug,
      address: String(f.get("address") ?? "").trim() || null,
      reception_email: String(f.get("reception_email") ?? "").trim() || null,
      reception_phone: String(f.get("reception_phone") ?? "").trim() || null,
    }).select("id").single();
    if (error || !created) { setBusy(false); return void toast.error("Création impossible"); }
    if (seed) {
      await Promise.all([
        supabase.from("event_categories").insert(DEFAULT_CATEGORIES.map((n, i) => ({ site_id: created.id, name: n, position: i + 1 }))),
        supabase.from("faq_themes").insert(DEFAULT_FAQ_THEMES.map((n, i) => ({ site_id: created.id, name: n, position: i + 1 }))),
      ]);
    }
    await logActivity(created.id, "sites.create", "sites", created.id, { title: name.trim() });
    await qc.invalidateQueries({ queryKey: ["admin-sites"] });
    setBusy(false);
    toast.success("Site créé. Complétez maintenant sa configuration.");
    selectSite(created.id);
    navigate({ to: "/admin/configuration" });
  };

  return (
    <div>
      <PageHeader title="Sites" subtitle="Chaque immeuble NOVA a son propre site, à son adresse sur nova-serenity.fr." />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {sites.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Building className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}{s.id === current?.id && <span className="ml-2 text-sm font-normal text-muted-foreground">(en cours de gestion)</span>}</p>
              <p className="text-sm text-muted-foreground">{s.slug}.{theme.publicDomain}{s.address && ` · ${s.address}`}</p>
            </div>
            {s.id !== current?.id && (
              <button type="button" onClick={() => { selectSite(s.id); navigate({ to: "/admin" }); }} className={btnSecondary}>Gérer ce site</button>
            )}
          </li>
        ))}
      </ul>

      <SectionTitle>Créer un site</SectionTitle>
      <form onSubmit={create} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5">
        <FieldShell id="s-name" label="Nom du site" required>
          <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Grand Parc" className={inputCls} />
        </FieldShell>
        <FieldShell id="s-slug" label="Adresse" required help={`L'application sera servie sur ${finalSlug || "…"}.${theme.publicDomain}`}>
          <input id="s-slug" value={finalSlug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} className={inputCls} />
        </FieldShell>
        <FieldShell id="s-address" label="Adresse postale">
          <input id="s-address" name="address" placeholder="Ex. : Courbevoie" className={inputCls} />
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id="s-email" label="E-mail de l'accueil">
            <input id="s-email" name="reception_email" type="email" className={inputCls} />
          </FieldShell>
          <FieldShell id="s-phone" label="Téléphone de l'accueil">
            <input id="s-phone" name="reception_phone" type="tel" className={inputCls} />
          </FieldShell>
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={seed} onChange={(e) => setSeed(e.target.checked)} className="mt-1 h-5 w-5" />
          <span><span className="font-semibold">Préparer le contenu de base</span>
            <span className="block text-xs text-muted-foreground">Catégories d'événements ({DEFAULT_CATEGORIES.join(", ")}) et thèmes de FAQ vides.</span></span>
        </label>
        <button type="submit" disabled={busy} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden /> {busy ? "Création…" : "Créer le site"}</button>
        <p className="text-xs text-muted-foreground">Pensez ensuite à nommer son admin de site depuis « Utilisateurs », et à faire pointer le sous-domaine vers l'application.</p>
      </form>
    </div>
  );
}
