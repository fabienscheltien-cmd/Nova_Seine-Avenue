import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { pageMeta } from "@/lib/meta";
import { getSiteSlug } from "@/lib/site";
import { useAuth } from "@/lib/auth";
import { sendContactMessage } from "@/lib/contact.functions";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/contact")({
  head: () => pageMeta("Nous contacter", "Écrivez à l'accueil de Seine Avenue."),
  component: ContactPage,
});

function ContactPage() {
  const send = useServerFn(sendContactMessage);
  const { user, profile } = useAuth();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    try {
      await send({ data: {
        siteSlug: getSiteSlug(), name: String(f.get("name")), email: String(f.get("email")),
        subject: String(f.get("subject")), message: String(f.get("message")), website: String(f.get("website") ?? ""),
      } });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message.replace(/^\[.*?\]\s*/, "") : "Envoi impossible");
    } finally { setBusy(false); }
  };

  if (done) return (
    <div className="mx-auto max-w-xl rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">Message envoyé</h1>
      <p className="mt-1 text-muted-foreground">L'accueil a bien reçu votre message.</p>
    </div>
  );

  const input = "mt-1 h-12 w-full rounded-xl border border-input bg-card px-4";
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nous contacter" subtitle="Votre message est transmis à l'accueil." />
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="name" className="text-sm font-semibold">Nom</label><input id="name" name="name" required maxLength={100} defaultValue={fullName} className={input} /></div>
        <div><label htmlFor="email" className="text-sm font-semibold">E-mail</label><input id="email" name="email" type="email" required maxLength={255} defaultValue={user?.email ?? ""} className={input} /></div>
        <div><label htmlFor="subject" className="text-sm font-semibold">Objet</label><input id="subject" name="subject" required maxLength={150} className={input} /></div>
        <div><label htmlFor="message" className="text-sm font-semibold">Message</label><textarea id="message" name="message" required maxLength={2000} rows={6} className="mt-1 w-full rounded-xl border border-input bg-card p-4" /></div>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Envoi…" : "Envoyer"}</button>
      </form>
    </div>
  );
}
