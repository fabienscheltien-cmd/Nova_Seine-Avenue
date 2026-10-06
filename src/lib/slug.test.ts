import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("transforme un nom de site en sous-domaine valide", () => {
    expect(slugify("Seine Avenue")).toBe("seine-avenue");
    expect(slugify("  Côté Défense — Tour B ")).toBe("cote-defense-tour-b");
    expect(slugify("L'Écrin")).toBe("l-ecrin");
  });

  it("limite la longueur à 60 caractères", () => {
    expect(slugify("a".repeat(80))).toHaveLength(60);
  });
});
