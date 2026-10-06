import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/admin";
import type { SiteRow } from "@/lib/admin-site";
import { FieldShell, btnPrimary, btnSecondary, inputCls } from "./fields";

const STEP_KEY = "nova-onboarding-step";
type Target = "/admin/contacts" | "/admin/evenements" | "/admin/actualites";

function readStep() {
  try { return Math.min(3, Math.max(0, Number(localStorage.getItem(STEP_KEY) ?? 0))); } catch { return 0; }
}

/** Assistant de première connexion de l'admin de site : 4 étapes guidées. */
export function Onboarding({ site }: { site: SiteRow }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [step, setStepState] = useState(readStep);
  const setStep = (n: number) => { setStepState(n); try { localStorage.setItem(STEP_KEY, String(n)); } catch { /* indisponible */ } };

  const progress = useQuery({
    queryKey: ["admin", "onboarding", site.id],
    queryFn: async () => {
      const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const [contacts, events, news] = await Promise.all([
        count(supabase.from("contacts").select("id", { count: "exact", head: true }).eq("site_id", site.id)),
        count(supabase.from("events").select("id", { count: "exact", head: true }).eq("site_id", site.id)),
        count(supabase.from("news").select("id", { count: "exact", head: true }).eq("site_id", site.id).neq("status", "draft")),
      ]);
      return { contacts, events, news };
    },
  });

  const finish = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ admin_onboarded_at: new Date().toISOString() }).eq("id", user.id);
    try { localStorage.removeItem(STEP_KEY); } catch { /* indisponible */ }
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const done = [
    !!(site.reception_email || site.reception_phone),
    (progress.data?.contacts ?? 0) > 0,
    (progress.data?.events ?? 0) > 0,
    (progress.data?.news ?? 0) > 0,
  ];
  const titles = ["Coordonnées de l'accueil", "Contacts utiles", "Premiers événements", "Première actualité"];

  return (
    <section aria-labelledby="onb-title" className="mb-8 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card p-5">
      <p className="text-sm text-muted-foreground">Bienvenue{profile?.first_name ? ` ${profile.first_name}` : ""} ! Quatre étapes pour bien démarrer.</p>
      <h2 id="onb-title" className="mt-1 text-xl font-bold">Étape {step + 1} sur 4 · {titles[step]}</h2>

      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Progression">
        {titles.map((t, i) => (
          <li key={t}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
              className={`flex w-full flex-col items-start gap-1 rounded-xl border p-2 text-left text-xs ${i === step ? "border-primary bg-primary/15" : "border-border"}`}>
              {done[i] ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Fait" /> : <Circle className="h-4 w-4 text-muted-foreground" aria-label="À faire" />}
              <span className="hidden sm:block">{t}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        {step === 0 && <ReceptionStep site={site} onSaved={() => setStep(1)} />}
        {step === 1 && (
          <ActionStep done={done[1]!} to="/admin/contacts" action="Ajouter un contact"
            text="Ajoutez les numéros utiles aux occupants : gestionnaire du site, sécurité, urgences. Les contacts d'urgence s'affichent en premier."
            doneText={`${progress.data?.contacts} contact(s) ajouté(s).`} />
        )}
        {step === 2 && (
          <ActionStep done={done[2]!} to="/admin/evenements" action="Créer un événement"
            text="Partez d'un modèle (Pilates, Cross Training…) et répétez-le chaque semaine en une seule fois."
            doneText={`${progress.data?.events} événement(s) créé(s).`} />
        )}
        {step === 3 && (
          <ActionStep done={done[3]!} to="/admin/actualites" action="Rédiger une actualité"
            text="Présentez la nouvelle application aux occupants. Utilisez « Aperçu » pour voir le résultat avant de publier."
            doneText="Votre première actualité est publiée." />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={btnSecondary}>Précédent</button>}
        {step < 3 ? (
          <button type="button" onClick={() => setStep(step + 1)} className={btnPrimary}>Étape suivante</button>
        ) : (
          <button type="button" onClick={async () => { await finish(); toast.success("C'est parti !"); }} className={btnPrimary}>Terminer</button>
        )}
        <button type="button" onClick={finish} className="ml-auto text-sm text-muted-foreground underline">Passer l'assistant</button>
      </div>
    </section>
  );
}

function ActionStep({ done, to, action, text, doneText }: { done: boolean; to: Target; action: string; text: string; doneText: string }) {
  return (
    <div>
      <p>{text}</p>
      {done && <p className="mt-2 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" aria-hidden /> {doneText}</p>}
      <Link to={to} search={{ nouveau: 1 }} className={`${done ? btnSecondary : btnPrimary} mt-4`}>
        {action} <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">Revenez au tableau de bord ensuite : l'assistant reprendra à cette étape.</p>
    </div>
  );
}

function ReceptionStep({ site, onSaved }: { site: SiteRow; onSaved: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const reception_email = String(f.get("email")).trim() || null;
    const reception_phone = String(f.get("phone")).trim() || null;
    if (!reception_email && !reception_phone) return void toast.error("Indiquez au moins un e-mail ou un téléphone.");
    setBusy(true);
    const { error } = await supabase.from("sites").update({ reception_email, reception_phone }).eq("id", site.id);
    setBusy(false);
    if (error) return void toast.error("Enregistrement impossible");
    await logActivity(site.id, "sites.update", "sites", site.id);
    qc.invalidateQueries({ queryKey: ["admin-sites"] });
    qc.invalidateQueries({ queryKey: ["site"] });
    toast.success("Coordonnées enregistrées");
    onSaved();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p>Ces coordonnées s'affichent sur l'accueil de l'application et reçoivent les messages des occupants. Vérifiez-les.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell id="onb-email" label="E-mail de l'accueil">
          <input id="onb-email" name="email" type="email" defaultValue={site.reception_email ?? ""} placeholder="accueil@exemple.fr" className={inputCls} />
        </FieldShell>
        <FieldShell id="onb-phone" label="Téléphone de l'accueil">
          <input id="onb-phone" name="phone" type="tel" defaultValue={site.reception_phone ?? ""} placeholder="01 23 45 67 89" className={inputCls} />
        </FieldShell>
      </div>
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Enregistrement…" : "C'est correct, continuer"}</button>
    </form>
  );
}
