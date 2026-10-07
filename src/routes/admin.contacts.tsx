import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/admin/contacts")({
  head: () => pageMeta("Gestion — Contacts", "Gérez les contacts utiles affichés aux occupants."),
  component: () => (
    <CrudPage
      table="contacts"
      title="Contacts"
      intro="Les personnes et services que les occupants peuvent joindre. Glissez les lignes pour changer l'ordre d'affichage."
      singular="ce contact"
      addLabel="Ajouter un contact"
      sortable
      visibleToggle
      searchKeys={["role_label", "name", "email", "phone"]}
      emptyText="Aucun contact pour l'instant. Ajoutez le premier, par exemple l'accueil ou la sécurité."
      primary={(r) => <>{String(r["role_label"])}{r["is_emergency"] ? <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">Urgence</span> : null}</>}
      secondary={(r) => [r["name"], r["phone"], r["email"]].filter(Boolean).join(" · ")}
      defaults={{ role_label: "", name: "", email: "", phone: "", hours: "", is_emergency: false, visible: true }}
      fields={[
        { name: "role_label", label: "Fonction", type: "text", required: true, placeholder: "Ex. Accueil, Sécurité, Gestionnaire technique", help: "Ce que verront les occupants en titre." },
        { name: "name", label: "Nom", type: "text", placeholder: "Ex. Marie Dupont" },
        { name: "phone", label: "Téléphone", type: "tel", placeholder: "Ex. 01 23 45 67 89" },
        { name: "email", label: "E-mail", type: "email", placeholder: "Ex. accueil@seine-avenue.fr" },
        { name: "hours", label: "Horaires", type: "text", placeholder: "Ex. Lun–ven, 8h–19h" },
        { name: "is_emergency", label: "Contact d'urgence", type: "switch", help: "Mis en avant en rouge en haut de la liste." },
        { name: "visible", label: "Visible par les occupants", type: "switch" },
      ]}
    />
  ),
});
