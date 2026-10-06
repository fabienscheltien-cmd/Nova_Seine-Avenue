import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const contactSchema = z.object({
  siteSlug: z.string().min(1).max(80),
  name: z.string().trim().min(1, "Indiquez votre nom").max(100),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  subject: z.string().trim().min(1, "Indiquez un objet").max(150),
  message: z.string().trim().min(1, "Écrivez votre message").max(2000),
  website: z.string().max(0).optional(), // champ piège anti-robot
});

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin.from("sites").select("id").eq("slug", data.siteSlug).maybeSingle();
    if (!site) throw new Error("Site introuvable");

    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .ilike("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Trop de messages envoyés. Réessayez dans quelques minutes.");

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      site_id: site.id, name: data.name, email: data.email, subject: data.subject, message: data.message,
    });
    if (error) throw new Error("Envoi impossible pour le moment.");
    return { ok: true };
  });
