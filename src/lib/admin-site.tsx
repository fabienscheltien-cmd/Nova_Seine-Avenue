import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "./auth";
import { useSite } from "./site";

export type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
type AdminSiteState = { sites: SiteRow[]; site: SiteRow | null; loading: boolean; selectSite: (id: string) => void };

const Ctx = createContext<AdminSiteState | null>(null);
const STORAGE_KEY = "nova-admin-site";

/** Site géré dans le back-office : celui du sous-domaine par défaut, ou celui choisi dans le sélecteur. */
export function AdminSiteProvider({ children }: { children: ReactNode }) {
  const { user, isAdminOf } = useAuth();
  const { data: hostSite } = useSite();
  const [selected, setSelected] = useState<string | null>(() => {
    try { return typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const all = useQuery({
    queryKey: ["admin-sites"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const sites = (all.data ?? []).filter((s) => isAdminOf(s.id));
  const site = sites.find((s) => s.id === selected) ?? sites.find((s) => s.id === hostSite?.id) ?? sites[0] ?? null;
  const selectSite = (id: string) => {
    setSelected(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* stockage indisponible */ }
  };
  return <Ctx.Provider value={{ sites, site, loading: all.isLoading, selectSite }}>{children}</Ctx.Provider>;
}

export function useAdminSite() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminSite must be used inside AdminSiteProvider");
  return v;
}
