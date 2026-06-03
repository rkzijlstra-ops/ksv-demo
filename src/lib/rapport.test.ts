import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { genereerRapportPdf, rapportSamenvatting, eindstaatFotoLabel, meldingenKop } from "./rapport";
import type { Melding, Oplevering } from "./db";

function maakOplevering(over: Partial<Oplevering>): Oplevering {
  return {
    id: "opl-1",
    created_at: "2026-06-22T15:00:00Z",
    opdracht_id: "x",
    uitkomst: "afgerond",
    eindstaat_foto_urls: [],
    video_url: null,
    handtekening_url: null,
    opmerking: null,
    rapport_email: null,
    rapport_url: null,
    user_id: null,
    ...over,
  };
}

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
    keukenzaak: "Keukenstudio Voorschoten",
    opdracht_status: "open",
    opgeleverd_at: null,
    rapport_url: null,
    spoed: false,
    spoed_verzonden_at: null,
    verwijderd_at: null,
    ...over,
  };
}

function startsWithPdf(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  );
}

describe("rapportSamenvatting", () => {
  it("gebruikt de keukenzaak van de opdracht", () => {
    const s = rapportSamenvatting(maakMelding({ keukenzaak: "Keukensale.com Katwijk" }), null);
    expect(s.zaaknaam).toBe("Keukensale.com Katwijk");
  });

  it("valt terug op een nette tekst als keukenzaak ontbreekt", () => {
    expect(rapportSamenvatting(maakMelding({ keukenzaak: null }), null).zaaknaam).toMatch(/onbekend/i);
  });

  it("neemt de opmerking over en maakt lege tekst null", () => {
    expect(
      rapportSamenvatting(maakMelding({}), maakOplevering({ opmerking: "Muren niet haaks" })).opmerking,
    ).toBe("Muren niet haaks");
    expect(rapportSamenvatting(maakMelding({}), maakOplevering({ opmerking: "   " })).opmerking).toBeNull();
  });

  it("meldt video en ondertekening", () => {
    const s = rapportSamenvatting(
      maakMelding({}),
      maakOplevering({ handtekening_url: "https://x/h.png", video_url: "https://x/v.mp4" }),
    );
    expect(s.ondertekend).toBe(true);
    expect(s.videoUrl).toBe("https://x/v.mp4");
  });

  it("zonder handtekening niet ondertekend", () => {
    expect(rapportSamenvatting(maakMelding({}), maakOplevering({ handtekening_url: null })).ondertekend).toBe(false);
  });
});

describe("eindstaatFotoLabel", () => {
  it("telt nul eindstaat-foto's in het meervoud", () => {
    expect(eindstaatFotoLabel(0)).toBe("0 eindstaat-foto's");
  });
  it("gebruikt enkelvoud bij precies 1", () => {
    expect(eindstaatFotoLabel(1)).toBe("1 eindstaat-foto");
  });
  it("gebruikt meervoud bij meer dan 1", () => {
    expect(eindstaatFotoLabel(3)).toBe("3 eindstaat-foto's");
  });
});

describe("meldingenKop", () => {
  it("toont alleen het aantal meldingen als er geen foto's zijn", () => {
    expect(meldingenKop(2, 0)).toBe("Meldingen (2)");
  });
  it("toont het aantal meldingen plus het aantal foto's", () => {
    expect(meldingenKop(3, 4)).toBe("Meldingen (3) · 4 foto's");
  });
  it("gebruikt enkelvoud bij precies 1 foto", () => {
    expect(meldingenKop(1, 1)).toBe("Meldingen (1) · 1 foto");
  });
});

describe("genereerRapportPdf met oplevering", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("rendert een geldige PDF met eindstaat-foto's, video en handtekening", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
      }),
    );
    const opdracht = maakMelding({ keukenzaak: "Keukensale.com Katwijk" });
    const opl = maakOplevering({
      eindstaat_foto_urls: ["https://x/e1.jpg"],
      video_url: "https://x/v.mp4",
      handtekening_url: "https://x/h.png",
      uitkomst: "openstaande_punten",
    });
    const bytes = await genereerRapportPdf(opdracht, [], opl);
    expect(startsWithPdf(bytes)).toBe(true);
  });

  it("werkt ook zonder oplevering (terugval)", async () => {
    const bytes = await genereerRapportPdf(maakMelding({}), [], null);
    expect(startsWithPdf(bytes)).toBe(true);
  });
});

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
      maakMelding({ id: "m1", opdracht_id: "x", spoed: true, spoed_verzonden_at: "2026-05-29T18:00:00Z", ruwe_tekst: "Front beschadigd" }),
      maakMelding({ id: "m2", opdracht_id: "x", spoed: false, ruwe_tekst: "Greep nabestellen" }),
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
        spoed: true,
        ruwe_tekst: "Met foto",
        foto_urls: ["https://x/foto1.jpg"],
      }),
    ];

    const bytes = await genereerRapportPdf(opdracht, meldingen);
    expect(startsWithPdf(bytes)).toBe(true);
  });
});
