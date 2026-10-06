import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "./account.functions";

type Role = { role: "super_admin" | "site_admin" | "occupant"; site_id: string | null };
type AuthState = {
  user: User | null;
  ready: boolean;
  profile: { first_name: string | null; last_name: string | null; company: string | null; floor: string | null; newsletter_opt_in: boolean; notifications_opt_in: boolean; email: string | null; admin_onboarded_at?: string | null } | null;
  roles: Role[];
  /** Rôles chargés (ou aucun utilisateur connecté). */
  rolesReady: boolean;
  /** Double authentification activée mais code pas encore saisi pour cette session. */
  needsMfa: boolean;
  refreshMfa: () => Promise<void>;
  isAdminOf: (siteId?: string) => boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const refreshMfa = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setNeedsMfa(!!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2");
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
      if (data.user) refreshMfa();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (event !== "SIGNED_OUT") { qc.invalidateQueries({ queryKey: ["me"] }); refreshMfa(); }
      else setNeedsMfa(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const me = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      await ensureProfile();
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role, site_id").eq("user_id", user!.id),
      ]);
      return { profile, roles: (roles ?? []) as Role[] };
    },
  });

  const roles = me.data?.roles ?? [];
  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const value: AuthState = {
    user,
    ready,
    profile: user ? (me.data?.profile ?? null) : null,
    roles,
    rolesReady: !user || me.isSuccess || me.isError,
    needsMfa: !!user && needsMfa,
    refreshMfa,
    isSuperAdmin,
    isAdminOf: (siteId) => isSuperAdmin || roles.some((r) => r.role === "site_admin" && r.site_id === siteId),
    signOut: async () => {
      await qc.cancelQueries();
      qc.removeQueries({ queryKey: ["me"] });
      qc.removeQueries({ queryKey: ["my-registrations"] });
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
