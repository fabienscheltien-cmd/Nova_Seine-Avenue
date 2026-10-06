import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Demande le code de l'application d'authentification quand la double authentification est activée. */
export function MfaPrompt() {
  const { needsMfa, refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!needsMfa) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) { setBusy(false); await refreshMfa(); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) { setErr("Code incorrect ou expiré. Réessayez avec le code affiché maintenant."); return; }
    setCode("");
    await refreshMfa();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mfa-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-background/95 p-4 backdrop-blur">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <ShieldCheck className="h-8 w-8 text-brand-light" aria-hidden />
        <h2 id="mfa-title" className="text-xl font-semibold">Code de sécurité</h2>
        <p className="text-sm text-muted-foreground">Saisissez le code à 6 chiffres affiché dans votre application d'authentification.</p>
        <label htmlFor="mfa-code" className="sr-only">Code à 6 chiffres</label>
        <input id="mfa-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" autoFocus
          maxLength={8} placeholder="123 456" className="h-14 w-full rounded-xl border border-input bg-background px-4 text-center text-2xl tracking-[0.3em]" />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <button disabled={busy || code.replace(/\s/g, "").length < 6} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Vérification…" : "Valider"}
        </button>
        <button type="button" onClick={signOut} className="w-full text-sm text-muted-foreground underline">Se déconnecter</button>
      </form>
    </div>
  );
}
