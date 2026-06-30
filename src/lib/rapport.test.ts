import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } from "pdf-lib";
import { genereerRapportPdf, rapportSamenvatting, eindstaatFotoLabel, meldingenKop, rapportAfzenderWeergave, interneNotitieVoorRapport, interneFotosVoorRapport, interneVideoVoorRapport, toonHandtekeningInRapport, toonControleInRapport } from "./rapport";
import type { Melding, Oplevering } from "./db";
import type { ControlePunt } from "./oplever-controle";

// Echte PDF-rendering (pdf-lib) is CPU-zwaar; één render zit lokaal rond de 5s en tikt op een koude
// CI-runner over de default-timeout van 5000ms. Ruimer zetten voor dit bestand; de pure-functie-tests
// blijven instant, dus geen nadeel.
vi.setConfig({ testTimeout: 20000 });

describe("rapportAfzenderWeergave", () => {
  it("gebruikt de bedrijfsnaam als kop en bundelt de voetregel", () => {
    const r = rapportAfzenderWeergave({
      naam: "Rein Zijlstra",
      bedrijfsnaam: "BKM Keukenmontage",
      telefoon: "06-31665814",
      email: "bkm@example.nl",
    });
    expect(r.kop).toBe("BKM Keukenmontage");
    expect(r.voet).toBe("BKM Keukenmontage  ·  06-31665814  ·  bkm@example.nl");
  });

  it("valt terug op de naam als er geen bedrijfsnaam is", () => {
    const r = rapportAfzenderWeergave({ naam: "Jan Bakker", bedrijfsnaam: null, telefoon: "0612", email: null });
    expect(r.kop).toBe("Jan Bakker");
    expect(r.voet).toBe("Jan Bakker  ·  0612");
  });

  it("valt terug op een neutrale kop en lege voet zonder enige gegevens", () => {
    const r = rapportAfzenderWeergave(null);
    expect(r.kop).toBe("Kluslus");
    expect(r.voet).toBe("");
  });
});

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
    interne_opmerking: null,
    interne_foto_urls: [],
    interne_video_url: null,
    rapport_email: null,
    rapport_url: null,
    zaak_rapport_verzonden_at: null,
    klant_rapport_email: null,
    klant_rapport_url: null,
    klant_rapport_verzonden_at: null,
    user_id: null,
    controle: [],
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
    klant_email: null,
    adres_kandidaten: null,
    adres_keuze_nodig: false,
    controleer_splitsing: false,
    controleer_splitsing_reden: null,
    splits_voorstel: null,
    meldingen: [],
    foto_urls: [],
    video_url: null,
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
    teruggemeld_at: null,
    teruggemeld_reden: null,
    teruggemeld_toelichting: null,
    heropend_at: null,
    afgerond_door_monteur_at: null,
    afgerond_toelichting: null,
    afgerond_vervolg_nodig: false,
    afgerond_foto_urls: [],
    afgerond_video_url: null,
    afgerond_akkoord_at: null,
    user_id: null,
    toegewezen_aan: null,
    monteur_naam: null,
    dashboard_status: "binnen",
    startdatum: null,
    starttijd: null,
    duur_dagen: 1,
    weekend_telt_mee: false,
    gewijzigd_te_versturen: false,
    bevestigd_at: null,
    verzonden_monteur: null,
    verzonden_startdatum: null,
    verzonden_starttijd: null,
    verzonden_toegewezen_aan: null,
    opdrachtgever_id: null,
    te_verwerken: false,
    werkomschrijving: null,
    ...over,
  };
}

function startsWithPdf(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  );
}

/** Laadt de PDF en haalt alle URI's uit de link-annotaties (videolinks). pdf-lib decomprimeert bij load. */
async function linkAnnotatieUrls(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const urls: string[] = [];
  for (const page of doc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookupMaybe(i, PDFDict);
      const actie = annot?.lookupMaybe(PDFName.of("A"), PDFDict);
      const uri = actie?.lookupMaybe(PDFName.of("URI"), PDFString);
      if (uri) urls.push(uri.asString());
    }
  }
  return urls;
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

  it("rendert de controle-checklist (akkoord + niet akkoord) zonder te crashen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
      }),
    );
    const opl = maakOplevering({
      handtekening_url: "https://x/h.png",
      controle: [
        { punt: "Buiten de evt. meldingen geen beschadigingen aan keuken, vloer, muren.", akkoord: true },
        { punt: "Tweede punt", akkoord: false },
      ],
    });
    const bytes = await genereerRapportPdf(maakMelding({}), [], opl);
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

  it("nummert foto's door en bouwt de bijlagenlijst (oplevering + meldingen + video) zonder crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
      }),
    );
    const opdracht = maakMelding({});
    const opl = maakOplevering({
      eindstaat_foto_urls: ["https://x/e1.jpg", "https://x/e2.jpg"],
      video_url: "https://youtu.be/demo",
    });
    const meldingen = [
      maakMelding({ id: "m1", opdracht_id: "x", ruwe_tekst: "een", foto_urls: ["https://x/m1.jpg"] }),
      maakMelding({ id: "m2", opdracht_id: "x", ruwe_tekst: "twee", foto_urls: ["https://x/m2a.jpg", "https://x/m2b.jpg"] }),
    ];
    const bytes = await genereerRapportPdf(opdracht, meldingen, opl);
    expect(startsWithPdf(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it("zet een videolink-annotatie in de PDF voor een melding met video_url", async () => {
    const opdracht = maakMelding({});
    const meldingen = [
      maakMelding({ id: "m1", opdracht_id: "x", ruwe_tekst: "Front kapot", video_url: "https://x/melding-video-uniek.mp4" }),
    ];
    const bytes = await genereerRapportPdf(opdracht, meldingen);
    const urls = await linkAnnotatieUrls(bytes);
    expect(urls).toContain("https://x/melding-video-uniek.mp4");
  });

  it("zet geen videolink-annotatie als de melding geen video heeft", async () => {
    const opdracht = maakMelding({});
    const meldingen = [maakMelding({ id: "m1", opdracht_id: "x", ruwe_tekst: "Geen video", video_url: null })];
    const bytes = await genereerRapportPdf(opdracht, meldingen);
    const urls = await linkAnnotatieUrls(bytes);
    expect(urls).toEqual([]);
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

describe("interneNotitieVoorRapport (de interne notitie lekt niet naar de klant)", () => {
  it("geeft de interne notitie terug voor de ZAAK-versie", () => {
    const opl = maakOplevering({ interne_opmerking: "Klant was lastig over meerwerk" });
    expect(interneNotitieVoorRapport(opl, "zaak")).toBe("Klant was lastig over meerwerk");
  });

  it("geeft NOOIT de interne notitie terug voor de KLANT-versie, ook al staat hij gevuld", () => {
    const opl = maakOplevering({ interne_opmerking: "Klant was lastig over meerwerk" });
    expect(interneNotitieVoorRapport(opl, "klant")).toBeNull();
  });

  it("geeft null als er geen interne notitie is (zaak)", () => {
    expect(interneNotitieVoorRapport(maakOplevering({ interne_opmerking: null }), "zaak")).toBeNull();
    expect(interneNotitieVoorRapport(maakOplevering({ interne_opmerking: "   " }), "zaak")).toBeNull();
    expect(interneNotitieVoorRapport(null, "zaak")).toBeNull();
  });
});

describe("genereerRapportPdf met interne notitie (beide doelgroepen renderen geldig)", () => {
  const opl = (over = {}) =>
    maakOplevering({ interne_opmerking: "INTERNE-GEHEIME-NOTITIE-XYZ", handtekening_url: "https://x/h.png", ...over });

  it("rendert een geldige ZAAK-PDF met de interne notitie", async () => {
    const bytes = await genereerRapportPdf(maakMelding({}), [], opl(), null, "zaak");
    expect(startsWithPdf(bytes)).toBe(true);
  });

  it("rendert een geldige KLANT-PDF zonder de interne notitie te raken", async () => {
    const bytes = await genereerRapportPdf(maakMelding({}), [], opl(), null, "klant");
    expect(startsWithPdf(bytes)).toBe(true);
  });
})

describe("interne media in het rapport", () => {
  it("interne foto's alleen voor de zaak, nooit voor de klant", () => {
    const opl = maakOplevering({ interne_foto_urls: ["https://x/a.jpg", "https://x/b.jpg"] });
    expect(interneFotosVoorRapport(opl, "zaak")).toEqual(["https://x/a.jpg", "https://x/b.jpg"]);
    expect(interneFotosVoorRapport(opl, "klant")).toEqual([]);
  });

  it("interne video alleen voor de zaak, nooit voor de klant", () => {
    const opl = maakOplevering({ interne_video_url: "https://x/intern.mp4" });
    expect(interneVideoVoorRapport(opl, "zaak")).toBe("https://x/intern.mp4");
    expect(interneVideoVoorRapport(opl, "klant")).toBeNull();
  });
})

describe("verkorte rapport-variant", () => {
  const controle: ControlePunt[] = [{ punt: "Alles afgetekend", akkoord: true }];

  it("verkorting verbergt handtekening en controle, ook als de data er is", () => {
    const opl = maakOplevering({ handtekening_url: "https://x/h.png", controle });
    expect(toonHandtekeningInRapport(opl, "verkorting")).toBe(false);
    expect(toonControleInRapport(controle, "verkorting")).toBe(false);
  });

  it("volledig toont handtekening en controle wanneer de data er is", () => {
    const opl = maakOplevering({ handtekening_url: "https://x/h.png", controle });
    expect(toonHandtekeningInRapport(opl, "volledig")).toBe(true);
    expect(toonControleInRapport(controle, "volledig")).toBe(true);
  });

  it("rendert een geldige verkorte PDF", async () => {
    const opl = maakOplevering({ handtekening_url: "https://x/h.png", controle });
    const bytes = await genereerRapportPdf(maakMelding({}), [], opl, null, "zaak", "verkorting");
    expect(startsWithPdf(bytes)).toBe(true);
  });

  it("verkorte PDF bevat de meldingen incl. melding-videolink (begeleidend bericht = opmerking, onvoorwaardelijk gerenderd)", async () => {
    // De verkorte variant verbergt handtekening + controle, maar NIET de meldingen-sectie en het
    // begeleidend bericht (opmerking). Hier: een melding met video moet als videolink in de verkorte PDF staan.
    const opl = maakOplevering({ opmerking: "Klant belt nog over de smetplint." });
    const meldingen = [
      maakMelding({ id: "m1", opdracht_id: "x", ruwe_tekst: "Front kapot", video_url: "https://x/verkort-melding-video.mp4" }),
    ];
    const bytes = await genereerRapportPdf(maakMelding({}), meldingen, opl, null, "zaak", "verkorting");
    expect(startsWithPdf(bytes)).toBe(true);
    const urls = await linkAnnotatieUrls(bytes);
    expect(urls).toContain("https://x/verkort-melding-video.mp4");
  });
})
