import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/meta";
import { useAuth } from "@/lib/auth";
import { useMyRegistrations } from "@/lib/data";
import { deleteMyAccount } from "@/lib/account.functions";
import { EventCard } from "@/components/EventCard";
import { SecuritySettings } from "@/components/account/Security";
import { EmptyState, Loading, PageHeader, SectionTitle } from "@/components/common";

export const Route = createFileRoute("/compte")({
  head: () => pageMeta("Mon compte", "Votre profil, vos préférences et vos inscriptions à Seine Avenue."),
  component: Account,
});

function MagicLink() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [withPassword, setWithPassword] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    setBusy(true);
    if (withPassword) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: String(f.get("password")) });
      setBusy(false);
      if (error) toast.error("E-mail ou mot de passe incorrect.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/compte` } });
    setBusy(false);
    if (error) toast.error(error.message); else setSent(true);
  };
  if (sent) return <EmptyState><p className="font-semibold text-foreground">Vérifiez votre boîte mail</p><p className="mt-1">Cliquez sur le lien reçu pour vous connecter.</p></EmptyState>;
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Se connecter</h2>
      <p className="text-sm text-muted-foreground">
        {withPassword ? "Avec le mot de passe que vous avez défini dans votre compte." : "Recevez un lien de connexion par e-mail, sans mot de passe."}
      </p>
      <label htmlFor="ml-email" className="text-sm font-semibold">Adresse e-mail</label>
      <input id="ml-email" name="email" type="email" required autoComplete="email" className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder="prenom.nom@entreprise.fr" />
      {withPassword && (
        <>
          <label htmlFor="ml-password" className="text-sm font-semibold">Mot de passe</label>
          <input id="ml-password" name="password" type="password" required autoComplete="current-password" className="h-12 w-full rounded-xl border border-input bg-background px-4" />
        </>
      )}
      <button disabled={busy} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60">
        {withPassword ? "Se connecter" : "Recevoir mon lien"}
      </button>
      <button type="button" onClick={() => setWithPassword((x) => !x)} className="w-full text-sm text-brand-light underline">
        {withPassword ? "Recevoir plutôt un lien par e-mail" : "J'ai défini un mot de passe"}
      </button>
    </form>
  );
}

function Account() {
  const { user, ready, profile, signOut, roles } = useAuth();
  const qc = useQueryClient();
  const regs = useMyRegistrations(user?.id);
  const del = useServerFn(deleteMyAccount);
  const [saving, setSaving] = useState(false);

  if (!ready) return <Loading />;
  if (!user) return <div><PageHeader title="Mon compte" /><MagicLink /></div>;

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newsletter = f.get("newsletter") === "on";
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: String(f.get("first_name")).slice(0, 80), last_name: String(f.get("last_name")).slice(0, 80),
      company: String(f.get("company")).slice(0, 120), floor: String(f.get("floor")).slice(0, 20),
      newsletter_opt_in: newsletter, newsletter_consent_at: newsletter ? new Date().toISOString() : null,
      notifications_opt_in: f.get("notifications") === "on",
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Enregistrement impossible"); else { toast.success("Profil enregistré"); qc.invalidateQueries({ queryKey: ["me"] }); }
  };

  const remove = async () => {
    if (!confirm("Supprimer définitivement votre compte et vos inscriptions ?")) return;
    try { await del(); await signOut(); toast.success("Compte supprimé"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Suppression impossible"); }
  };

  const input = "mt-1 h-12 w-full rounded-xl border border-input bg-background px-4";
  const upcoming = (regs.data ?? []).filter((r) => r.event && new Date(r.event.ends_at) > new Date());
  return (
    <div>
      <PageHeader title="Mon compte" subtitle={user.email ?? ""}>
        <div className="flex flex-wrap gap-2">
          {roles.some((r) => r.role !== "occupant") && (
            <Link to="/admin" className="inline-flex h-11 items-center rounded-full border border-primary/50 px-5 text-sm font-semibold text-brand-light">Espace de gestion</Link>
          )}
          <button onClick={signOut} className="h-11 rounded-full border border-border px-5 text-sm font-semibold">Se déconnecter</button>
        </div>
      </PageHeader>
      {profile && (
        <form key={user.id + String(!!profile)} onSubmit={save} className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
          <div><label htmlFor="fn" className="text-sm font-semibold">Prénom</label><input id="fn" name="first_name" defaultValue={profile.first_name ?? ""} className={input} /></div>
          <div><label htmlFor="ln" className="text-sm font-semibold">Nom</label><input id="ln" name="last_name" defaultValue={profile.last_name ?? ""} className={input} /></div>
          <div><label htmlFor="co" className="text-sm font-semibold">Entreprise</label><input id="co" name="company" defaultValue={profile.company ?? ""} className={input} /></div>
          <div><label htmlFor="fl" className="text-sm font-semibold">Étage</label><input id="fl" name="floor" defaultValue={profile.floor ?? ""} className={input} /></div>
          <label className="flex items-start gap-3 md:col-span-2"><input type="checkbox" name="newsletter" defaultChecked={profile.newsletter_opt_in} className="mt-1 h-5 w-5" /><span>J'accepte de recevoir la newsletter de l'immeuble. <Link to="/confidentialite" className="text-brand-light underline">En savoir plus</Link></span></label>
          <label className="flex items-start gap-3 md:col-span-2"><input type="checkbox" name="notifications" defaultChecked={profile.notifications_opt_in} className="mt-1 h-5 w-5" /><span>Je souhaite recevoir des notifications.</span></label>
          <button disabled={saving} className="h-12 rounded-full bg-primary font-semibold text-primary-foreground md:col-span-2">Enregistrer</button>
        </form>
      )}
      <SectionTitle>Mes inscriptions</SectionTitle>
      {regs.isLoading ? <Loading /> : upcoming.length ? <div className="grid gap-3 md:grid-cols-2">{upcoming.map((r) => <EventCard key={r.id} event={r.event!} showDate />)}</div>
        : <EmptyState>Aucune inscription à venir. <Link to="/evenements" className="text-brand-light underline">Voir les événements</Link></EmptyState>}
      <SectionTitle>Sécurité</SectionTitle>
      <SecuritySettings />
      <div className="mt-10 border-t border-border pt-5">
        <button onClick={remove} className="text-sm font-semibold text-destructive underline">Supprimer mon compte</button>
      </div>
    </div>
  );
}
