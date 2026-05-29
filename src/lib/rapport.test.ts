import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { genereerRapportPdf } from "./rapport";
import type { Melding } from "./db";

function maakMelding(over: Partial<Melding>): Melding {
  return {
    id: "x",
    created_at: "2026-05-28T10:00:00Z",
    bron: "monteur",
    urgentie: null,
    klant_naam: "van Dijk",
    klant_adres: "Hoge Morsweg 37, 2332 HG Leiden",
    referentienummer: "7407",
    adviseur: "Marco van Leeuwen",
    klant_telefoon: "06-40200603",
    meldingen: [],
    foto_urls: [],
    spraak_tekst: null,
    ruwe_tekst: null,
    status: "concept",
    aangepast: false,
    verzonden_at: null,
    uitvoerdatum: null,
    opdracht_id: null,
    versie: 1,
    documenttype: "orderbevestiging",
    leverweek: "22/2026",
    opdracht_status: "open",
    opgeleverd_at: null,
    rapport_url: null,
    ...over,
  };
}

function startsWithPdf(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  );
}

describe("genereerRapportPdf", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("genereert geldige PDF-bytes voor een opdracht met meldingen (zonder foto's)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const opdracht = maakMelding({ opdracht_id: null });
    const meldingen = [
      maakMelding({ id: "m1", opdracht_id: "x", urgentie: "rood", ruwe_tekst: "Front beschadigd" }),
      maakMelding({ id: "m2", opdracht_id: "x", urgentie: "geel", ruwe_tekst: "Greep nabestellen" }),
    ];

    const bytes = await genereerRapportPdf(opdracht, meldingen);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    expect(startsWithPdf(bytes)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("werkt met nul meldingen", async () => {
    const opdracht = maakMelding({});
    const bytes = await genereerRapportPdf(opdracht, []);
    expect(startsWithPdf(bytes)).toBe(true);
  });

  it("laat het rapport niet crashen als een foto-fetch faalt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const opdracht = maakMelding({});
    const meldingen = [
      maakMelding({
        id: "m1",
        opdracht_id: "x",
        urgentie: "rood",
        ruwe_tekst: "Met foto",
        foto_urls: ["https://x/foto1.jpg"],
      }),
    ];

    const bytes = await genereerRapportPdf(opdracht, meldingen);
    expect(startsWithPdf(bytes)).toBe(true);
  });
});
