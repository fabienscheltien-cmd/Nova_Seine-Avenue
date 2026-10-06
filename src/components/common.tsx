import type { ReactNode } from "react";
import { Phone, Mail } from "lucide-react";
import { t } from "@/i18n";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}

export function Loading() {
  return <p className="py-6 text-center text-muted-foreground" role="status">{t("common.loading")}</p>;
}

export function ContactButtons({ phone, email, size = "md" }: { phone?: string | null; email?: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-12 px-5 text-base" : "h-11 px-4 text-sm";
  return (
    <div className="flex flex-wrap gap-2">
      {phone && (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} className={`inline-flex items-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground ${cls}`}>
          <Phone className="h-4 w-4" aria-hidden /> {t("common.call")} <span className="sr-only">{phone}</span>
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={`inline-flex items-center gap-2 rounded-full border border-border bg-surface-high font-semibold ${cls}`}>
          <Mail className="h-4 w-4" aria-hidden /> {t("common.email")} <span className="sr-only">{email}</span>
        </a>
      )}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}
