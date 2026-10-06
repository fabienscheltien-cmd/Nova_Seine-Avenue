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

/* ===================== E-mails ===================== */

async function email() {
  return import("./email.server");
}

/** Indique si l'envoi automatique d'e-mails est configuré (sinon : repli sur la messagerie de l'utilisateur). */
export const getEmailStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: (await email()).isEmailConfigured() }));

/** Annule un événement et prévient automatiquement les inscrits par e-mail. */
export const cancelEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid(), message: z.string().trim().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: event } = await db.from("events").select("id, site_id, title, starts_at, status").eq("id", data.eventId).maybeSingle();
    if (!event) throw new Error("Événement introuvable");
    await assertSiteAdmin(context.userId, event.site_id);
    const { error } = await db.from("events").update({ status: "cancelled", registration_open: false }).eq("id", event.id);
    if (error) throw new Error("Annulation impossible.");

    const { data: regs } = await db.from("event_registrations").select("user_id").eq("event_id", event.id);
    const ids = (regs ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length ? await db.from("profiles").select("email").in("id", ids) : { data: [] };
    const recipients = (profiles ?? []).map((p) => p.email).filter((e): e is string => !!e);
    const { data: site } = await db.from("sites").select("name, reception_email").eq("id", event.site_id).maybeSingle();

    const mail = await email();
    let notified = 0;
    if (recipients.length && mail.isEmailConfigured()) {
      const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(event.starts_at));
      notified = await mail.sendEmail({
        bcc: recipients,
        replyTo: site?.reception_email ?? null,
        subject: `Annulation : ${event.title} — ${when}`,
        text: `Bonjour,\n\nL'événement « ${event.title} » prévu le ${when} est annulé.${data.message ? `\n\n${data.message}` : ""}\n\nMerci de votre compréhension.\nL'accueil ${site?.name ?? ""}`,
      });
    }
    await log(context, event.site_id, "events.cancel", "events", event.id, { title: event.title, notified });
    return { registrants: recipients.length, notified, emailConfigured: mail.isEmailConfigured() };
  });

/** Répond à un message reçu, depuis le back-office. */
export const replyToMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messageId: z.string().uuid(), body: z.string().trim().min(1, "Écrivez votre réponse").max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: msg } = await db.from("contact_messages").select("*").eq("id", data.messageId).maybeSingle();
    if (!msg) throw new Error("Message introuvable");
    await assertSiteAdmin(context.userId, msg.site_id);
    const mail = await email();
    if (!mail.isEmailConfigured()) throw new Error("L'envoi d'e-mails n'est pas encore configuré : utilisez « Ouvrir ma messagerie ».");
    const { data: site } = await db.from("sites").select("name, reception_email").eq("id", msg.site_id).maybeSingle();
    const quoted = msg.message.split("\n").map((l) => `> ${l}`).join("\n");
    await mail.sendEmail({
      to: [msg.email],
      replyTo: site?.reception_email ?? null,
      subject: `Re : ${msg.subject}`,
      text: `${data.body}\n\n—\nL'accueil ${site?.name ?? ""}\n\nVotre message :\n${quoted}`,
    });
    await db.from("contact_messages").update({ status: "handled" }).eq("id", msg.id);
    await log(context, msg.site_id, "contact_messages.reply", "contact_messages", msg.id, { email: msg.email });
    return { ok: true };
  });

/* ===================== Super-admin : comptes et rôles ===================== */

async function assertSuperAdmin(userId: string) {
  if (!(await isSuperAdmin(userId))) throw new Error("Action réservée aux super-admins NOVA.");
}

async function superAdminCount() {
  const db = await admin();
  const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
  return count ?? 0;
}

async function forceSignOut(userId: string) {
  const db = await admin();
  const { error } = await db.rpc("admin_force_sign_out", { _user_id: userId });
  if (error) throw new Error("Déconnexion forcée impossible.");
}

/** Tous les comptes, avec leurs rôles et leur état. */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const db = await admin();
    const users: { id: string; email: string; last_sign_in_at: string | null; created_at: string; banned_until: string | null }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Liste des comptes indisponible.");
      for (const u of data.users) {
        users.push({
          id: u.id, email: u.email ?? "", last_sign_in_at: u.last_sign_in_at ?? null, created_at: u.created_at,
          banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
        });
      }
      if (data.users.length < 1000) break;
    }
    const [{ data: profiles }, { data: roles }, { data: invites }] = await Promise.all([
      db.from("profiles").select("id, first_name, last_name, company"),
      db.from("user_roles").select("id, user_id, role, site_id"),
      db.from("role_invitations").select("id, email, role, site_id, created_at").is("accepted_at", null),
    ]);
    const prof = new Map((profiles ?? []).map((p) => [p.id, p]));
    const now = Date.now();
    return {
      users: users.map((u) => {
        const p = prof.get(u.id);
        return {
          ...u,
          isMe: u.id === context.userId,
          suspended: !!u.banned_until && new Date(u.banned_until).getTime() > now,
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" "),
          company: p?.company ?? "",
          roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => ({ id: r.id, role: r.role, site_id: r.site_id })),
        };
      }),
      invitations: invites ?? [],
    };
  });

const roleInput = z.object({
  role: z.enum(["occupant", "site_admin", "super_admin"]),
  siteId: z.string().uuid().nullable(),
});

/** Attribue un rôle à un compte existant (admin de site : limité au site choisi). */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleInput.extend({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.role === "site_admin" && !data.siteId) throw new Error("Choisissez le site à confier.");
    const db = await admin();
    const siteId = data.role === "site_admin" ? data.siteId : null;
    const q = db.from("user_roles").select("id").eq("user_id", data.userId).eq("role", data.role);
    const { data: existing } = siteId ? await q.eq("site_id", siteId) : await q.is("site_id", null);
    if (!existing?.length) {
      const { error } = await db.from("user_roles").insert({ user_id: data.userId, role: data.role, site_id: siteId });
      if (error) throw new Error("Attribution impossible.");
    }
    await log(context, siteId, "access.grant", "user_roles", data.userId, { role: data.role });
    return { ok: true };
  });

/** Retire un rôle (le dernier super-admin est protégé). */
export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const db = await admin();
    const { data: role } = await db.from("user_roles").select("*").eq("id", data.roleId).maybeSingle();
    if (!role) throw new Error("Rôle introuvable");
    if (role.role === "super_admin" && (await superAdminCount()) <= 1) throw new Error("Impossible de retirer le dernier super-admin.");
    await db.from("user_roles").delete().eq("id", role.id);
    await log(context, role.site_id, "access.revoke", "user_roles", role.user_id, { role: role.role });
    return { ok: true };
  });

/** Crée un compte et envoie une invitation par e-mail, avec un rôle de départ. */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleInput.extend({
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(255),
    redirectTo: z.string().url().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.role === "site_admin" && !data.siteId) throw new Error("Choisissez le site à confier.");
    const db = await admin();
    const siteId = data.role === "site_admin" ? data.siteId : null;
    const { data: existing } = await db.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (existing) throw new Error("Un compte existe déjà avec cette adresse : modifiez ses rôles dans la liste.");
    const { data: invited, error } = await db.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (error || !invited.user) throw new Error("Invitation impossible : " + (error?.message ?? "erreur inconnue"));
    await db.from("profiles").upsert({ id: invited.user.id, email: data.email }, { onConflict: "id", ignoreDuplicates: true });
    await db.from("user_roles").insert([
      { user_id: invited.user.id, role: "occupant", site_id: null },
      ...(data.role === "occupant" ? [] : [{ user_id: invited.user.id, role: data.role, site_id: siteId }]),
    ]);
    await log(context, siteId, "users.create", "profiles", invited.user.id, { email: data.email, role: data.role });
    return { ok: true };
  });

/** Suspend (bloque la connexion et ferme les sessions) ou réactive un compte. */
export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Vous ne pouvez pas suspendre votre propre compte.");
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, { ban_duration: data.suspended ? "876000h" : "none" });
    if (error) throw new Error("Action impossible : " + error.message);
    if (data.suspended) await forceSignOut(data.userId);
    await log(context, null, data.suspended ? "users.suspend" : "users.unsuspend", "profiles", data.userId);
    return { ok: true };
  });

/** Réinitialise l'accès : ferme toutes les sessions et envoie un nouveau lien de connexion. */
export const resetUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), redirectTo: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const db = await admin();
    const { data: target, error } = await db.auth.admin.getUserById(data.userId);
    if (error || !target.user?.email) throw new Error("Compte introuvable.");
    await forceSignOut(data.userId);
    // Lien envoyé par le service d'authentification, comme une connexion normale ; aucun mot de passe n'est vu ni défini.
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: otpError } = await anon.auth.signInWithOtp({ email: target.user.email, options: { shouldCreateUser: false, emailRedirectTo: data.redirectTo } });
    if (otpError) throw new Error("Sessions fermées, mais l'envoi du lien a échoué : " + otpError.message);
    await log(context, null, "users.reset_access", "profiles", data.userId, { email: target.user.email });
    return { ok: true };
  });

/** Supprime définitivement un compte (le dernier super-admin est protégé). */
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Supprimez votre propre compte depuis « Mon compte ».");
    const db = await admin();
    const { data: theirs } = await db.from("user_roles").select("id").eq("user_id", data.userId).eq("role", "super_admin");
    if ((theirs?.length ?? 0) > 0 && (await superAdminCount()) <= 1) throw new Error("Impossible de supprimer le dernier super-admin.");
    const { data: p } = await db.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    await db.from("event_registrations").delete().eq("user_id", data.userId);
    await db.from("user_roles").delete().eq("user_id", data.userId);
    await db.from("profiles").delete().eq("id", data.userId);
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Suppression impossible : " + error.message);
    await log(context, null, "users.delete", "profiles", data.userId, { email: p?.email ?? null });
    return { ok: true };
  });
