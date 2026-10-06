function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
}

type IcsEvent = { id: string; title: string; starts_at: string; ends_at: string; description?: string | null; location?: string | null };

/** Fichier agenda (RFC 5545) d'un événement. */
export function buildIcs(e: IcsEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NOVA Serenity//Occupants//FR",
    "BEGIN:VEVENT",
    `UID:${e.id}@nova-serenity.fr`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(new Date(e.starts_at))}`,
    `DTEND:${fmt(new Date(e.ends_at))}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcs(e: IcsEvent) {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^\w-]+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
