import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const input = "mt-1 h-12 w-full rounded-xl border border-input bg-background px-4";
const btn = "h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-60";
const btnGhost = "h-12 rounded-full border border-border px-6 font-semibold";

/** Mot de passe personnel (facultatif) et double authentification par application (TOTP). */
export function SecuritySettings() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PasswordForm />
      <TotpSettings />
    </div>
  );
}

function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const password = String(f.get("password"));
    if (password.length < 10) return void toast.error("Choisissez au moins 10 caractères.");
    if (password !== String(f.get("confirm"))) return void toast.error("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(error.message.includes("reauthentication") ? "Reconnectez-vous par lien magique puis réessayez." : "Mot de passe non enregistré : " + error.message);
    toast.success("Mot de passe enregistré");
    form.reset();
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" aria-hidden /> Mot de passe (facultatif)</h3>
      <p className="text-sm text-muted-foreground">Le lien magique suffit. Un mot de passe vous permet de vous connecter sans attendre l'e-mail.</p>
      <div><label htmlFor="pw" className="text-sm font-semibold">Nouveau mot de passe</label><input id="pw" name="password" type="password" autoComplete="new-password" minLength={10} className={input} /></div>
      <div><label htmlFor="pw2" className="text-sm font-semibold">Confirmer</label><input id="pw2" name="confirm" type="password" autoComplete="new-password" className={input} /></div>
      <button disabled={busy} className={btn}>{busy ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}

function TotpSettings() {
  const qc = useQueryClient();
  const factors = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => (await supabase.auth.mfa.listFactors()).data?.totp ?? [],
  });
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const verified = factors.data?.find((f) => f.status === "verified");

  const start = async () => {
    // Nettoie une activation commencée mais jamais validée.
    for (const f of factors.data ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `NOVA ${Date.now()}` });
    if (error || !data) return void toast.error("Activation impossible : " + (error?.message ?? ""));
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.factorId, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return void toast.error("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
    toast.success("Double authentification activée");
    setEnroll(null); setCode("");
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
  };

  const disable = async () => {
    if (!verified || !confirm_("Désactiver la double authentification ?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    if (error) return void toast.error("Désactivation impossible : " + error.message);
    toast.success("Double authentification désactivée");
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" aria-hidden /> Double authentification</h3>
      {verified ? (
        <>
          <p className="text-sm"><span className="font-semibold text-success">Activée.</span> Un code de votre application vous sera demandé à chaque connexion.</p>
          <button type="button" onClick={disable} className={btnGhost}>Désactiver</button>
        </>
      ) : enroll ? (
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-sm">1. Scannez ce QR code avec une application d'authentification (Google Authenticator, Microsoft Authenticator…).</p>
          <img src={enroll.qr} alt="QR code d'activation de la double authentification" className="h-44 w-44 rounded-xl bg-white p-2" />
          <p className="text-xs text-muted-foreground">Ou saisissez la clé : <code className="break-all">{enroll.secret}</code></p>
          <label htmlFor="totp-code" className="block text-sm">2. Saisissez le code à 6 chiffres affiché.</label>
          <input id="totp-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} className={input} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || code.replace(/\s/g, "").length < 6} className={btn}>{busy ? "Vérification…" : "Activer"}</button>
            <button type="button" onClick={() => setEnroll(null)} className={btnGhost}>Annuler</button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Protégez votre compte avec un code temporaire généré par une application sur votre téléphone. Recommandé pour les gestionnaires.</p>
          <button type="button" onClick={start} className={btn}>Activer</button>
        </>
      )}
    </section>
  );
}

function confirm_(message: string) {
  return typeof window !== "undefined" && window.confirm(message);
}
