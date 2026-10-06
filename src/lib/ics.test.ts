import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs(
    { id: "e1", title: "Pilates; débutants", starts_at: "2026-10-06T11:05:00Z", ends_at: "2026-10-06T11:50:00Z", location: "Salle Fitness", description: "Ligne 1\nLigne 2" },
    new Date("2026-10-01T08:00:00Z"),
  );

  it("contient un événement daté en UTC", () => {
    expect(ics.split("\r\n")).toEqual(expect.arrayContaining([
      "BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:e1@nova-serenity.fr", "DTSTAMP:20261001T080000Z",
      "DTSTART:20261006T110500Z", "DTEND:20261006T115000Z", "END:VEVENT", "END:VCALENDAR",
    ]));
  });

  it("échappe les caractères spéciaux du format agenda", () => {
    expect(ics).toContain(String.raw`SUMMARY:Pilates\; débutants`);
    expect(ics).toContain(String.raw`DESCRIPTION:Ligne 1\nLigne 2`);
    expect(ics).toContain("LOCATION:Salle Fitness");
  });

  it("omet lieu et description absents", () => {
    const bare = buildIcs({ id: "e2", title: "CAF", starts_at: "2026-10-06T10:15:00Z", ends_at: "2026-10-06T11:00:00Z" });
    expect(bare).not.toContain("LOCATION");
    expect(bare).not.toContain("DESCRIPTION");
  });
});
