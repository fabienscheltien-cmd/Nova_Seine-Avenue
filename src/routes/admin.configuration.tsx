import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/admin";
import { useSite } from "@/lib/site";
import { FieldShell, ImageField, btnPrimary, inputCls } from "@/components/admin/fields";
import { Loading, PageHeader } from "@/components/common";

export const Route = createFileRoute("/admin/configuration")({ component: AdminConfig });

const urlOk = (s: string) => s === "" || /^https?:\/\/\S+$/i.test(s);

function AdminConfig() {
  const { data: site, isLoading } = useSite();
  if (isLoading || !site) return <Loading />;
  return <ConfigForm key={site.id + site.updated_at} site={site} />;
}

function ConfigForm({ site }: { site: NonNullable<ReturnType<typeof useSite>["data"]> }) {
  const qc = useQueryClient();
  const [v, setV] = useState({
    name: site.name, address: site.address ?? "", reception_email: site.reception_email ?? "", reception_phone: site.reception_phone ?? "",
    booking_url: site.booking_url ?? "", resto_url: site.resto_url ?? "", logo_url: site.logo_url ?? "", primary_color: site.primary_color ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return void toast.error("Indiquez le nom du site.");
    if (!urlOk(v.booking_url.trim()) || !urlOk(v.resto_url.trim())) return void toast.error("Les liens doivent commencer par https://");
    if (v.reception_email && !/^\S+@\S+\.\S+$/.test(v.reception_email.trim())) return void toast.error("Adresse e-mail de l'accueil invalide.");
    setBusy(true);
    const clean = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() || null])) as Record<string, string | null>;
    const { error } = await supabase.from("sites").update({ ...clean, name: v.name.trim() }).eq("id", site.id);
    setBusy(false);
    if (error) return void toast.error("Enregistrement impossible");
    await logActivity(site.id, "sites.update", "sites", site.id);
    qc.invalidateQueries({ queryKey: ["site"] });
    toast.success("Configuration enregistrée");
  };

  return (
    <div>
      <PageHeader title="Configuration du site" subtitle="Coordonnées de l'accueil et liens affichés aux occupants." />
      <form onSubmit={submit} className="max-w-2xl space-y-6">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Accueil</h2>
          <FieldShell id="c-email" label="E-mail de l'accueil" help="Les messages du formulaire « Nous contacter » sont adressés à l'accueil.">
            <input id="c-email" type="email" value={v.reception_email} onChange={(e) => set("reception_email", e.target.value)} placeholder="Ex. : accueil@exemple.fr" className={inputCls} />
          </FieldShell>
          <FieldShell id="c-phone" label="Téléphone de l'accueil">
            <input id="c-phone" type="tel" value={v.reception_phone} onChange={(e) => set("reception_phone", e.target.value)} placeholder="Ex. : 01 23 45 67 89" className={inputCls} />
          </FieldShell>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Liens</h2>
          <FieldShell id="c-booking" label="Lien Réservations" help="Ouvert dans un nouvel onglet. Laissez vide pour afficher « Bientôt disponible ».">
            <input id="c-booking" type="url" value={v.booking_url} onChange={(e) => set("booking_url", e.target.value)} placeholder="https://…" className={inputCls} />
          </FieldShell>
          <FieldShell id="c-resto" label="Lien Côté Resto">
            <input id="c-resto" type="url" value={v.resto_url} onChange={(e) => set("resto_url", e.target.value)} placeholder="https://…" className={inputCls} />
          </FieldShell>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Identité</h2>
          <FieldShell id="c-name" label="Nom du site" required>
            <input id="c-name" value={v.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </FieldShell>
          <FieldShell id="c-address" label="Adresse">
            <input id="c-address" value={v.address} onChange={(e) => set("address", e.target.value)} placeholder="Ex. : Asnières-sur-Seine" className={inputCls} />
          </FieldShell>
          <FieldShell id="c-logo" label="Logo" help="Facultatif. Remplace le logo NOVA dans l'en-tête.">
            <ImageField id="c-logo" siteId={site.id} value={v.logo_url} onChange={(x) => set("logo_url", x)} />
          </FieldShell>
          <FieldShell id="c-color" label="Couleur principale" help="Réservée à la future charte du site.">
            <div className="mt-1 flex items-center gap-3">
              <input id="c-color" type="color" value={v.primary_color || "#1e4a7a"} onChange={(e) => set("primary_color", e.target.value)} className="h-12 w-16 rounded-xl border border-input bg-background" />
              <span className="text-sm text-muted-foreground">{v.primary_color || "Non définie"}</span>
            </div>
          </FieldShell>
        </section>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
    </div>
  );
}
