import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { pageMeta } from "@/lib/meta";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/batiment")({
  head: () => pageMeta("Mon bâtiment", "FAQ, contacts, services et vie dans les bureaux à Seine Avenue."),
  component: Layout,
});

const tabs = [
  { to: "/batiment", label: "FAQ", exact: true },
  { to: "/batiment/contacts", label: "Contacts" },
  { to: "/batiment/services", label: "Services" },
  { to: "/batiment/vie", label: "Vie dans les bureaux" },
] as const;

function Layout() {
  return (
    <div>
      <PageHeader title="Mon bâtiment" />
      <nav aria-label="Rubriques" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb) => (
          <Link key={tb.to} to={tb.to} activeOptions={{ exact: "exact" in tb }}
            className="h-10 shrink-0 rounded-full border border-border bg-card px-4 text-sm leading-10"
            activeProps={{ className: "!bg-primary !border-primary text-primary-foreground font-semibold" }}>
            {tb.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
