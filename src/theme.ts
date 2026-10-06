// Identité de marque centralisée. Les couleurs sont dans src/styles.css (:root).
export const theme = {
  brandName: "NOVA Serenity",
  logo: "/images/nova-mark.png",
  logoAlt: "NOVA Serenity",
  defaultSiteSlug: "seine-avenue",
  publicDomain: "nova-serenity.fr",
} as const;

// Couleur d'accent par catégorie d'événement (noms de jetons Tailwind).
export function categoryTone(name?: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("sport")) return "bg-cat-sport/15 text-cat-sport border-cat-sport/30";
  if (n.includes("bien")) return "bg-cat-wellness/15 text-cat-wellness border-cat-wellness/30";
  if (n.includes("anim")) return "bg-cat-animation/15 text-cat-animation border-cat-animation/30";
  if (n.includes("serv")) return "bg-cat-services/15 text-cat-services border-cat-services/30";
  return "bg-cat-other/15 text-cat-other border-cat-other/30";
}
