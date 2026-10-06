import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, Clock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { eventStatus, useMyRegistrations, type EventRow } from "@/lib/data";
import { downloadIcs } from "@/lib/ics";
import { categoryTone } from "@/theme";
import { t } from "@/i18n";

const statusLabel = {
  open: t("events.status.open"),
  full: t("events.status.full"),
  ended: t("events.status.ended"),
  closed: t("events.status.closed"),
  cancelled: t("events.status.cancelled"),
};

export function EventCard({ event, showDate = false }: { event: EventRow; showDate?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: regs } = useMyRegistrations(user?.id);
  const myReg = regs?.find((r) => r.event_id === event.id);
  const status = eventStatus(event);
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);

  const toggle = useMutation({
    mutationFn: async () => {
      if (myReg) {
        const { error } = await supabase.from("event_registrations").delete().eq("id", myReg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_registrations")
          .insert({ event_id: event.id, user_id: user!.id, site_id: event.site_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(myReg ? "Désinscription enregistrée" : "Inscription confirmée");
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast.error(e.message || "Action impossible"),
  });

  const statusTone =
    status === "open" ? "text-success" : status === "full" ? "text-warning" : "text-muted-foreground";

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row">
      {event.image_url && (
        <img src={event.image_url} alt="" className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-32" loading="lazy" />
      )}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {event.category && (
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${categoryTone(event.category.name)}`}>
              {event.category.name}
            </span>
          )}
          <span className={`text-xs font-semibold ${statusTone}`}>{statusLabel[status]}</span>
        </div>
        <h3 className={`mt-1.5 text-lg font-semibold ${status === "cancelled" ? "line-through" : ""}`}>{event.title}</h3>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            {showDate && <span className="capitalize">{format(start, "EEE d MMM", { locale: fr })} ·</span>}
            {format(start, "HH:mm")} – {format(end, "HH:mm")}
          </li>
          {event.location && (
            <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{event.location.name}</li>
          )}
          {event.capacity != null && (
            <li className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {event.registered_count} / {event.capacity} inscrits
            </li>
          )}
        </ul>
        {event.description && <p className="mt-2 line-clamp-3 text-sm">{event.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {status !== "ended" && status !== "cancelled" && (
            user ? (
              (myReg || status === "open") && (
                <button
                  type="button"
                  onClick={() => toggle.mutate()}
                  disabled={toggle.isPending}
                  className={`h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-60 ${
                    myReg ? "border border-border bg-surface-high" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {myReg ? t("events.unregister") : t("events.register")}
                </button>
              )
            ) : (
              status === "open" && (
                <Link to="/compte" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  {t("events.loginToRegister")}
                </Link>
              )
            )
          )}
          {status !== "ended" && status !== "cancelled" && (
            <button
              type="button"
              onClick={() => downloadIcs({ ...event, location: event.location?.name })}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden /> {t("events.addToCalendar")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
