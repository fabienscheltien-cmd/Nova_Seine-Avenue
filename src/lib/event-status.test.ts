import { describe, expect, it } from "vitest";
import { eventStatus } from "./data";

const inOneHour = new Date(Date.now() + 3600e3).toISOString();
const base = { status: "published", ends_at: inOneHour, capacity: 10, registered_count: 3, registration_open: true };

describe("eventStatus", () => {
  it("inscriptions ouvertes par défaut", () => expect(eventStatus(base)).toBe("open"));
  it("complet quand le nombre d'inscrits atteint la capacité", () => expect(eventStatus({ ...base, registered_count: 10 })).toBe("full"));
  it("jamais complet sans limite de places", () => expect(eventStatus({ ...base, capacity: null, registered_count: 500 })).toBe("open"));
  it("terminé une fois l'heure de fin passée", () => expect(eventStatus({ ...base, ends_at: new Date(Date.now() - 1000).toISOString() })).toBe("ended"));
  it("fermé quand l'admin ferme les inscriptions", () => expect(eventStatus({ ...base, registration_open: false })).toBe("closed"));
  it("annulé prime sur tout le reste", () => expect(eventStatus({ ...base, status: "cancelled", registered_count: 10 })).toBe("cancelled"));
});
