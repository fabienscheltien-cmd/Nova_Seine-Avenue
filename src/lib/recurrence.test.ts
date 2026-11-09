import { describe, expect, it } from "vitest";
import { MAX_OCCURRENCES, localDateTimeToIso, weeklyOccurrences } from "./recurrence";

describe("weeklyOccurrences", () => {
  it("crée les mardis et jeudis entre deux dates, bornes incluses", () => {
    // 6 oct. 2026 est un mardi ; 15 oct. un jeudi.
    expect(weeklyOccurrences("2026-10-06", "2026-10-15", [2, 4])).toEqual(["2026-10-06", "2026-10-08", "2026-10-13", "2026-10-15"]);
  });

  it("ignore les jours non choisis au début de la période", () => {
    expect(weeklyOccurrences("2026-10-07", "2026-10-14", [2])).toEqual(["2026-10-13"]);
  });

  it("gère le dimanche (0) et le passage d'un mois à l'autre", () => {
    expect(weeklyOccurrences("2026-10-25", "2026-11-08", [0])).toEqual(["2026-10-25", "2026-11-01", "2026-11-08"]);
  });

  it("ne renvoie rien sans jour choisi ou si la fin précède le début", () => {
    expect(weeklyOccurrences("2026-10-06", "2026-12-31", [])).toEqual([]);
    expect(weeklyOccurrences("2026-10-20", "2026-10-06", [1, 2, 3])).toEqual([]);
    expect(weeklyOccurrences("", "2026-10-06", [1])).toEqual([]);
  });

  it("plafonne le nombre de séances", () => {
    const all = weeklyOccurrences("2026-01-01", "2030-12-31", [1, 2, 3, 4, 5]);
    expect(all).toHaveLength(MAX_OCCURRENCES);
    expect(weeklyOccurrences("2026-10-05", "2026-12-31", [1], 3)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19"]);
  });

  it("reste correct au changement d'heure d'hiver (25 oct. 2026)", () => {
    expect(weeklyOccurrences("2026-10-24", "2026-10-27", [0, 1, 2, 3, 4, 5, 6])).toEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
  });
});

describe("localDateTimeToIso", () => {
  it("interprète la date et l'heure dans le fuseau local", () => {
    const iso = localDateTimeToIso("2026-10-06", "12:15");
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 6, 12, 15]);
  });
});
