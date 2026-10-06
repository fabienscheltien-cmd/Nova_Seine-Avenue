import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Crée le profil au premier accès et applique les invitations de rôle liées à l'e-mail vérifié. */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const email = String((claims as { email?: string }).email ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("profiles").insert({ id: userId, email });
    }

    if (email) {
      const { data: invites } = await supabaseAdmin
        .from("role_invitations")
        .select("*")
        .ilike("email", email)
        .is("accepted_at", null);
      for (const inv of invites ?? []) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: inv.role, site_id: inv.site_id }, { onConflict: "user_id,role,site_id", ignoreDuplicates: true });
        await supabaseAdmin.from("role_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
        await supabaseAdmin.from("activity_log").insert({
          actor_id: userId, actor_email: email, site_id: inv.site_id,
          action: "role.accepted", entity: "user_roles", details: { role: inv.role },
        });
      }
    }

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role, site_id").eq("user_id", userId);
    const hasOccupant = (roles ?? []).some((r) => r.role === "occupant");
    if (!hasOccupant) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "occupant", site_id: null });
    }
    return { ok: true };
  });

/** Suppression définitive du compte de l'utilisateur connecté (RGPD). */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("role", "super_admin");
    const mine = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin");
    if ((mine.data?.length ?? 0) > 0 && (roles?.length ?? 0) <= 1) {
      throw new Error("Vous êtes le dernier super-admin : nommez-en un autre avant de supprimer votre compte.");
    }
    await supabaseAdmin.from("event_registrations").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("activity_log").insert({ actor_id: null, action: "account.deleted", entity: "profiles", entity_id: userId });
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
