import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBuildingInfo } from "@/lib/data";
import { EmptyState, ErrorState, Loading } from "@/components/common";
import { SafeHtml } from "./actualites.$id";

export const Route = createFileRoute("/batiment/vie")({ component: Vie });

function Vie() {
  const { data, isLoading, isError, refetch } = useBuildingInfo();
  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState>Les informations pratiques arrivent bientôt.</EmptyState>;
  return (
    <Accordion type="multiple" className="rounded-2xl border border-border bg-card px-4">
      {data.map((b) => (
        <AccordionItem key={b.id} value={b.id}>
          <AccordionTrigger className="text-left">{b.title}</AccordionTrigger>
          <AccordionContent><SafeHtml html={b.content} /></AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
