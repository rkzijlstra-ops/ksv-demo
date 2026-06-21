import { describe, it, expect } from "vitest";
import { leesEnGroepeer, type InvoerBestand } from "./order-inlezen";
import type { ParsedPdf } from "./parser-schema";

function pp(over: Partial<ParsedPdf>): ParsedPdf {
  return {
    klant_naam: null, klant_adres: null, referentienummer: null, adviseur: null,
    klant_telefoon: null, klant_email: null, documenttype: "onbekend", leverweek: null,
    keukenzaak: null, meldingen: [], adressen: [], ...over,
  };
}

const bestand = (naam: string): InvoerBestand => ({
  naam,
  mediaType: "application/pdf",
  buffer: Buffer.from("x"), // geen echte PDF: eerstePaginaPdf valt terug op deze buffer
});

describe("leesEnGroepeer", () => {
  it("voegt de drie bestanden van één klus samen, orderbon leidend", async () => {
    const outputs = [
      pp({ klant_naam: "T van der Velde" }), // bovenaanzicht (koppelt via naam)
      pp({ referentienummer: "SP166", klant_naam: "Vd Velde" }), // leidingschema (koppelt via ref-kern)
      pp({ referentienummer: "166", klant_telefoon: "0628572148", klant_naam: "Mevrouw T van der Velde", documenttype: "orderbevestiging" }), // orderbon
    ];
    let i = 0;
    const res = await leesEnGroepeer(
      [bestand("bovenaanzicht.pdf"), bestand("leiding.pdf"), bestand("orderbon.pdf")],
      async () => outputs[i++],
    );
    expect(res.groepen).toHaveLength(1);
    expect([...res.groepen[0].bestand_indices].sort()).toEqual([0, 1, 2]);
    expect(res.groepen[0].velden.referentienummer).toBe("166"); // order wint van SP166
    expect(res.groepen[0].velden.klant_telefoon).toBe("0628572148");
    expect(res.groepen[0].velden.klant_naam).toBe("Mevrouw T van der Velde"); // orderbon leidend
    expect(res.ongegroepeerd).toEqual([]);
  });

  it("splitst twee klussen en houdt een onleesbaar bestand apart", async () => {
    const outputs: (ParsedPdf | "FOUT")[] = [
      pp({ referentienummer: "166", klant_naam: "van der Velde", documenttype: "orderbevestiging" }),
      pp({ referentienummer: "172", klant_naam: "Bavel", documenttype: "orderbevestiging" }),
      "FOUT",
    ];
    let i = 0;
    const res = await leesEnGroepeer(
      [bestand("velde.pdf"), bestand("bavel.pdf"), bestand("kapot.pdf")],
      async () => {
        const o = outputs[i++];
        if (o === "FOUT") throw new Error("parser kapot");
        return o;
      },
    );
    expect(res.groepen).toHaveLength(2);
    expect(res.ongegroepeerd).toEqual([2]);
    expect(res.foutPerDocument[2]).toMatch(/parser kapot/);
  });
});
