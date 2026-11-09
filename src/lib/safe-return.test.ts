import { describe, expect, it } from "vitest";
import { Route } from "@/routes/compte";

// Le paramètre « retour » ne doit jamais permettre de renvoyer vers un autre site après connexion.
const parse = (retour: unknown) => (Route.options.validateSearch as (s: Record<string, unknown>) => { retour?: string })({ retour });

describe("retour après connexion", () => {
  it("accepte un chemin interne", () => {
    expect(parse("/evenements/123")).toEqual({ retour: "/evenements/123" });
    expect(parse("/batiment/contacts?x=1")).toEqual({ retour: "/batiment/contacts?x=1" });
  });
  it("refuse les adresses externes ou ambiguës", () => {
    for (const bad of ["https://pirate.fr", "//pirate.fr", "/\\\\pirate.fr", "javascript:alert(1)", "evenements", " /x", 42, undefined]) {
      expect(parse(bad)).toEqual({});
    }
  });
});
