import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { theme } from "@/theme";

/** Site courant : sous-domaine de nova-serenity.fr, sinon le site par défaut. */
export function getSiteSlug(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.endsWith(`.${theme.publicDomain}`)) {
      return host.slice(0, -(theme.publicDomain.length + 1)).split(".").pop()!;
    }
  }
  return import.meta.env["VITE_SITE_SLUG"] || theme.defaultSiteSlug;
}

export const siteQuery = (slug: string) =>
  queryOptions({
    queryKey: ["site", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

export function useSite() {
  return useQuery(siteQuery(getSiteSlug()));
}
