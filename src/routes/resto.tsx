import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { ExternalPage } from "./reservations";

export const Route = createFileRoute("/resto")({
  head: () => pageMeta("Côté Resto", "Le restaurant de Seine Avenue : menus et commandes."),
  component: () => <ExternalPage kind="resto" />,
});
