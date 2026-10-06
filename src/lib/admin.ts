import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSite } from "./site";

type Tables = Database["public"]["Tables"];
export type AdminTable =
  | "news" | "events" | "event_categories" | "event_locations" | "event_templates"
  | "faq_themes" | "faq_items" | "contacts" | "services" | "building_info" | "contact_messages";
export type Row<T extends AdminTable> = Tables[T]["Row"];

/** Identifiant du site géré ; non vide sous /admin (le layout bloque sinon). */
export function useAdminSiteId(): string {
  const { data } = useSite();
  return data?.id ?? "";
}

/** Paramètre d'URL « ?nouveau=1 » : ouvre directement le formulaire d'ajout. */
export const newItemSearch = (s: Record<string, unknown>): { nouveau?: number } => (s["nouveau"] ? { nouveau: 1 } : {});

/* eslint-disable @typescript-eslint/no-explicit-any */
const from = (table: AdminTable) => supabase.from(table) as any;

/** Trace une action sensible dans le journal d'activité (qui, quoi, quand). */
export async function logActivity(siteId: string | null, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activity_log").insert({
    site_id: siteId, actor_id: data.user.id, actor_email: data.user.email ?? null,
    action, entity, entity_id: entityId ?? null, details: (details ?? null) as never,
  });
}

/** Toutes les lignes d'une table pour un site, brouillons et éléments masqués compris. */
export function useAdminRows<T extends AdminTable>(table: T, siteId: string | undefined, order: { column: string; ascending?: boolean } = { column: "position" }) {
  return useQuery({
    queryKey: ["admin", table, siteId, order.column, order.ascending],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await from(table).select("*").eq("site_id", siteId!).order(order.column, { ascending: order.ascending ?? true }).limit(1000);
      if (error) throw error;
      return data as Row<T>[];
    },
  });
}

/** Invalide les vues admin et publiques d'une table après une écriture. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (table: AdminTable) => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: [table] });
    if (table === "events") qc.invalidateQueries({ queryKey: ["events"] });
    if (table === "news") { qc.invalidateQueries({ queryKey: ["news"] }); qc.invalidateQueries({ queryKey: ["news-item"] }); }
  };
}

type SaveInput = { id?: string | undefined; values: Record<string, unknown>; action?: string };

export function useSaveRow(table: AdminTable, siteId: string | undefined) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values, action }: SaveInput) => {
      if (id) {
        const { error } = await from(table).update(values).eq("id", id);
        if (error) throw error;
        await logActivity(siteId ?? null, action ?? `${table}.update`, table, id);
        return id;
      }
      const { data, error } = await from(table).insert({ ...values, site_id: siteId }).select("id").single();
      if (error) throw error;
      await logActivity(siteId ?? null, action ?? `${table}.create`, table, data.id);
      return data.id as string;
    },
    onSuccess: () => invalidate(table),
    onError: (e: Error) => toast.error(e.message || "Enregistrement impossible"),
  });
}

export function useDeleteRow(table: AdminTable, siteId: string | undefined) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from(table).delete().eq("id", id);
      if (error) throw error;
      await logActivity(siteId ?? null, `${table}.delete`, table, id);
    },
    onSuccess: () => { invalidate(table); toast.success("Supprimé"); },
    onError: (e: Error) => toast.error(e.message || "Suppression impossible"),
  });
}

/** Échange la position de deux lignes (réordonnancement par flèches). */
export async function swapPositions(table: AdminTable, a: { id: string; position: number }, b: { id: string; position: number }) {
  const pa = a.position === b.position ? b.position + 1 : b.position;
  const r1 = await from(table).update({ position: pa }).eq("id", a.id);
  const r2 = await from(table).update({ position: a.position }).eq("id", b.id);
  if (r1.error || r2.error) throw r1.error ?? r2.error;
}

/** Redimensionne et compresse une image avant téléversement (1600 px max, JPEG). */
async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image illisible"))), "image/jpeg", quality));
}

export async function uploadImage(siteId: string, file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Image trop lourde (20 Mo maximum)");
  const blob = await compressImage(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "img").toLowerCase();
  const path = `${siteId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error("Téléversement impossible : " + error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Valeur pour <input type="datetime-local"> à partir d'une date ISO (heure locale). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Point-virgule et BOM : ouverture directe dans Excel en français.
  const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
