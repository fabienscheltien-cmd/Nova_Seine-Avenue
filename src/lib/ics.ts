function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
}

export function downloadIcs(e: { id: string; title: string; starts_at: string; ends_at: string; description?: string | null; location?: string | null }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NOVA Serenity//Occupants//FR",
    "BEGIN:VEVENT",
    `UID:${e.id}@nova-serenity.fr`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(new Date(e.starts_at))}`,
    `DTEND:${fmt(new Date(e.ends_at))}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^\w-]+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
