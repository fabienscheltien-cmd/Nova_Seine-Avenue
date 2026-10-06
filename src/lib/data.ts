import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "./site";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type EventRow = Tables["events"]["Row"] & {
  category: { name: string } | null;
  location: { name: string } | null;
};
export type NewsRow = Tables["news"]["Row"];

function useSiteId() {
  const { data: site } = useSite();
  return site?.id;
}

export function useEvents(opts: { from?: Date; to?: Date } = {}) {
  const siteId = useSiteId();
  const from = opts.from?.toISOString();
  const to = opts.to?.toISOString();
  return useQuery({
    queryKey: ["events", siteId, from, to],
    enabled: !!siteId,
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*, category:event_categories(name), location:event_locations(name)")
        .eq("site_id", siteId!)
        .order("starts_at");
      if (from) q = q.gte("ends_at", from);
      if (to) q = q.lt("starts_at", to);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data as unknown as EventRow[];
    },
  });
}

export function useNews(limit?: number) {
  const siteId = useSiteId();
  return useQuery({
    queryKey: ["news", siteId, limit],
    enabled: !!siteId,
    queryFn: async () => {
      let q = supabase.from("news").select("*").eq("site_id", siteId!).order("published_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useNewsItem(id: string) {
  return useQuery({
    queryKey: ["news-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useSiteTable<T extends "event_categories" | "event_locations" | "contacts" | "services" | "building_info" | "faq_themes" | "faq_items">(table: T) {
  const siteId = useSiteId();
  return useQuery({
    queryKey: [table, siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("site_id", siteId!).order("position");
      if (error) throw error;
      return data as Tables[T]["Row"][];
    },
  });
}

export const useCategories = () => useSiteTable("event_categories");
export const useLocations = () => useSiteTable("event_locations");
export const useContacts = () => useSiteTable("contacts");
export const useServices = () => useSiteTable("services");
export const useBuildingInfo = () => useSiteTable("building_info");
export const useFaqThemes = () => useSiteTable("faq_themes");
export const useFaqItems = () => useSiteTable("faq_items");

export function useMyRegistrations(userId?: string) {
  return useQuery({
    queryKey: ["my-registrations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, created_at, event:events(*, category:event_categories(name), location:event_locations(name))")
        .eq("user_id", userId!);
      if (error) throw error;
      return data as unknown as { id: string; event_id: string; created_at: string; event: EventRow | null }[];
    },
  });
}

export type EventStatus = "open" | "full" | "ended" | "closed" | "cancelled";
export function eventStatus(e: Pick<EventRow, "status" | "ends_at" | "capacity" | "registered_count" | "registration_open">): EventStatus {
  if (e.status === "cancelled") return "cancelled";
  if (new Date(e.ends_at) < new Date()) return "ended";
  if (e.capacity != null && e.registered_count >= e.capacity) return "full";
  if (!e.registration_open) return "closed";
  return "open";
}
