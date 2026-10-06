import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("produit un CSV Excel français : BOM, point-virgule, retours Windows", () => {
    expect(toCsv([["Prénom", "Nom"], ["Léa", "Martin"]])).toBe("﻿Prénom;Nom\r\nLéa;Martin");
  });

  it("met entre guillemets les valeurs contenant ; \" ou un retour à la ligne", () => {
    expect(toCsv([["a;b", 'dit "oui"', "deux\nlignes"]])).toBe('﻿"a;b";"dit ""oui""";"deux\nlignes"');
  });

  it("écrit les valeurs vides et les nombres", () => {
    expect(toCsv([[null, undefined, 0, 12]])).toBe("﻿;;0;12");
  });

  it("neutralise les formules qu'un occupant glisserait dans son profil", () => {
    const csv = toCsv([["=HYPERLINK(\"http://x\")", "+33 1 23", "-2", "@SUM(A1)", "Normal"]]);
    expect(csv).toBe("﻿\"'=HYPERLINK(\"\"http://x\"\")\";'+33 1 23;'-2;'@SUM(A1);Normal");
  });
});
