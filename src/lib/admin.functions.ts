import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { userId: string; claims: unknown };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function isSuperAdmin(userId: string) {
  const db = await admin();
  const { data } = await db.from("user_roles").select("id").eq("user_id", userId).eq("role", "super_admin").limit(1);
  return (data?.length ?? 0) > 0;
}

async function assertSiteAdmin(userId: string, siteId: string) {
  const db = await admin();
  const { data } = await db.from("user_roles").select("role, site_id").eq("user_id", userId);
  const ok = (data ?? []).some((r) => r.role === "super_admin" || (r.role === "site_admin" && r.site_id === siteId));
  if (!ok) throw new Error("Accès réservé aux gestionnaires de ce site.");
}

async function log(ctx: Ctx, siteId: string | null, action: string, entity: string, entityId: string | null, details?: Record<string, unknown>) {
  const db = await admin();
  const email = String((ctx.claims as { email?: string }).email ?? "");
  await db.from("activity_log").insert({ site_id: siteId, actor_id: ctx.userId, actor_email: email, action, entity, entity_id: entityId, details: (details ?? null) as never });
}

/** Liste des inscrits d'un événement, avec leurs coordonnées (réservé aux admins du site). */
export const getEventRegistrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: event } = await db.from("events").select("id, site_id").eq("id", data.eventId).maybeSingle();
    if (!event) throw new Error("Événement introuvable");
    await assertSiteAdmin(context.userId, event.site_id);
    const { data: regs } = await db.from("event_registrations").select("user_id, created_at").eq("event_id", data.eventId).order("created_at");
    const ids = (regs ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, email, first_name, last_name, company, floor").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (regs ?? []).map((r) => {
      const p = byId.get(r.user_id);
      return {
        registered_at: r.created_at,
        email: p?.email ?? "",
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        company: p?.company ?? "",
        floor: p?.floor ?? "",
      };
    });
  });

/** Gestionnaires d'un site et invitations en attente. */
export const listSiteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSiteAdmin(context.userId, data.siteId);
    const db = await admin();
    const superAdmin = await isSuperAdmin(context.userId);
    const { data: roles } = await db.from("user_roles").select("id, user_id, role, site_id, created_at")
      .or(`and(role.eq.site_admin,site_id.eq.${data.siteId}),role.eq.super_admin`);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length ? await db.from("profiles").select("id, email, first_name, last_name").in("id", ids) : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const { data: invites } = await db.from("role_invitations").select("id, email, role, site_id, created_at")
      .is("accepted_at", null)
      .or(`and(role.eq.site_admin,site_id.eq.${data.siteId}),role.eq.super_admin`);
    return {
      canManageSuperAdmins: superAdmin,
      members: (roles ?? []).map((r) => {
        const p = byId.get(r.user_id);
        return { id: r.id, role: r.role, isMe: r.user_id === context.userId, email: p?.email ?? "", name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") };
      }),
      invitations: invites ?? [],
    };
  });

const inviteSchema = z.object({
  siteId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(255),
  role: z.enum(["site_admin", "super_admin"]),
  redirectTo: z.string().url().max(500),
});

/** Donne un accès gestionnaire : immédiat si le compte existe, sinon à la première connexion. */
export const inviteSiteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSiteAdmin(context.userId, data.siteId);
    if (data.role === "super_admin" && !(await isSuperAdmin(context.userId))) {
      throw new Error("Seul un super-admin peut nommer un autre super-admin.");
    }
    const db = await admin();
    const siteId = data.role === "super_admin" ? null : data.siteId;
    const { data: profile } = await db.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (profile) {
      const q = db.from("user_roles").select("id").eq("user_id", profile.id).eq("role", data.role);
      const { data: existing } = siteId ? await q.eq("site_id", siteId) : await q.is("site_id", null);
      if (!existing?.length) {
        const { error } = await db.from("user_roles").insert({ user_id: profile.id, role: data.role, site_id: siteId });
        if (error) throw new Error("Attribution impossible.");
      }
    } else {
      await db.from("role_invitations").insert({ email: data.email, role: data.role, site_id: siteId, invited_by: context.userId });
      // Envoie un lien de connexion ; sans effet bloquant si l'envoi échoue.
      await db.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo }).catch(() => null);
    }
    await log(context, siteId, "access.grant", "user_roles", null, { email: data.email, role: data.role });
    return { ok: true, pending: !profile };
  });

/** Retire un accès gestionnaire ou annule une invitation. */
export const revokeSiteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siteId: z.string().uuid(), roleId: z.string().uuid().optional(), invitationId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSiteAdmin(context.userId, data.siteId);
    const db = await admin();
    const superAdmin = await isSuperAdmin(context.userId);

    if (data.invitationId) {
      const { data: inv } = await db.from("role_invitations").select("*").eq("id", data.invitationId).maybeSingle();
      if (!inv) throw new Error("Invitation introuvable");
      if (inv.role === "super_admin" ? !superAdmin : inv.site_id !== data.siteId) throw new Error("Action non autorisée.");
      await db.from("role_invitations").delete().eq("id", inv.id);
      await log(context, inv.site_id, "access.invitation_cancelled", "role_invitations", inv.id, { email: inv.email, role: inv.role });
      return { ok: true };
    }

    const { data: role } = await db.from("user_roles").select("*").eq("id", data.roleId ?? "").maybeSingle();
    if (!role) throw new Error("Accès introuvable");
    if (role.role === "super_admin") {
      if (!superAdmin) throw new Error("Seul un super-admin peut retirer ce rôle.");
      const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
      if ((count ?? 0) <= 1) throw new Error("Impossible de retirer le dernier super-admin.");
    } else if (role.role !== "site_admin" || role.site_id !== data.siteId) {
      throw new Error("Action non autorisée.");
    }
    await db.from("user_roles").delete().eq("id", role.id);
    await log(context, role.site_id, "access.revoke", "user_roles", role.user_id, { role: role.role });
    return { ok: true };
  });
