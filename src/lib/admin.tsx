import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { useSite } from "./site";
import type { Database } from "@/integrations/supabase/types";

export type SiteRow = Database["public"]["Tables"]["sites"]["Row"] & { onboarding_done?: boolean };

// Loose client for generic admin tables (typed per page where it matters).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

type AdminSiteCtx = { sites: SiteRow[]; site: SiteRow | null; setSiteId: (id: string) => void; loading: boolean };
const Ctx = createContext<AdminSiteCtx | null>(null);

export function AdminSiteProvider({ children }: { children: ReactNode }) {
  const { roles, isSuperAdmin } = useAuth();
  const { data: current } = useSite();
  const adminSiteIds = roles.filter((r) => r.role === "site_admin" && r.site_id).map((r) => r.site_id!);
  const sitesQ = useQuery({
    queryKey: ["admin-sites", isSuperAdmin, adminSiteIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("sites").select("*").order("name");
      if (!isSuperAdmin) q = q.in("id", adminSiteIds.length ? adminSiteIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await q;
      if (error) throw error;
      return data as SiteRow[];
    },
  });
  const [siteId, setSiteIdState] = useState<string | null>(null);
  useEffect(() => {
    setSiteIdState(localStorage.getItem("admin-site"));
  }, []);
  const sites = sitesQ.data ?? [];
  const site = sites.find((s) => s.id === siteId) ?? sites.find((s) => s.id === current?.id) ?? sites[0] ?? null;
  const setSiteId = (id: string) => {
    localStorage.setItem("admin-site", id);
    setSiteIdState(id);
  };
  return <Ctx.Provider value={{ sites, site, setSiteId, loading: sitesQ.isLoading }}>{children}</Ctx.Provider>;
}

export function useAdminSite() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminSite outside provider");
  return v;
}

/** Lists rows of a site-scoped table (admins see hidden/draft rows through RLS). */
export function useAdminTable<T = Record<string, unknown>>(table: string, order = "position", ascending = true) {
  const { site } = useAdminSite();
  return useQuery({
    queryKey: ["admin", table, site?.id],
    enabled: !!site,
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").eq("site_id", site!.id).order(order, { ascending }).limit(1000);
      if (error) throw error;
      return data as T[];
    },
  });
}

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return (table?: string) => {
    qc.invalidateQueries({ queryKey: table ? ["admin", table] : ["admin"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    if (table) qc.invalidateQueries({ queryKey: [table] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["news"] });
  };
}

export async function logActivity(siteId: string, action: string, entity: string, entityId?: string, details?: unknown) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await db.from("activity_log").insert({
    site_id: siteId, actor_id: data.user.id, actor_email: data.user.email, action, entity, entity_id: entityId ?? null, details: details ?? null,
  });
}

/** Resize + compress an image file into a JPEG/WebP data URL (max side in px). */
export async function compressImage(file: File, max = 1600, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const webp = c.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function mailto({ to, bcc, subject, body }: { to?: string; bcc?: string[]; subject: string; body: string }) {
  const p = new URLSearchParams();
  if (bcc?.length) p.set("bcc", bcc.join(","));
  p.set("subject", subject);
  p.set("body", body);
  return `mailto:${to ?? ""}?${p.toString().replace(/\+/g, "%20")}`;
}

export const entityLabels: Record<string, string> = {
  events: "Événement", news: "Actualité", faq_items: "Question FAQ", faq_themes: "Thème FAQ", contacts: "Contact",
  services: "Service", building_info: "Page d'information", event_templates: "Modèle d'événement", sites: "Configuration du site",
};
