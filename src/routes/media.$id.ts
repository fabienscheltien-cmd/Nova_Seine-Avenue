import { createFileRoute } from "@tanstack/react-router";
import { decodeImageDataUrl } from "@/lib/data-url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sert une image de la table media. Le contenu d'un identifiant ne change jamais : cache d'un an. */
export const Route = createFileRoute("/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.id)) return new Response("Introuvable", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("media").select("data_url").eq("id", params.id).maybeSingle();
        const image = decodeImageDataUrl(data?.data_url);
        if (!image) return new Response("Introuvable", { status: 404 });
        return new Response(image.bytes, {
          headers: {
            "content-type": image.type,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
