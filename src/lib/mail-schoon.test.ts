import { describe, it, expect } from "vitest";
import { schoonOmschrijving } from "./mail-schoon";

describe("schoonOmschrijving", () => {
  it("houdt een gewone korte boodschap intact", () => {
    expect(schoonOmschrijving("De lade onder de oven is kapot.")).toBe("De lade onder de oven is kapot.");
  });

  it("knipt een handtekening eraf (Met vriendelijke groet)", () => {
    const t = "De kraan lekt.\n\nMet vriendelijke groet,\nJan Jansen\n0612345678";
    expect(schoonOmschrijving(t)).toBe("De kraan lekt.");
  });

  it("knipt 'Verzonden vanaf mijn iPhone' eraf", () => {
    const t = "Graag een afspraak inplannen.\n\nVerzonden vanaf mijn iPhone";
    expect(schoonOmschrijving(t)).toBe("Graag een afspraak inplannen.");
  });

  it("verwijdert geciteerde reactie-historie (> regels)", () => {
    const t = "Hier de gegevens.\n\n> Op 1 jan schreef iemand:\n> oude tekst\n> meer oude tekst";
    expect(schoonOmschrijving(t)).toBe("Hier de gegevens.");
  });

  it("knipt vanaf 'Op <datum> schreef' het citaat-blok eraf", () => {
    const t = "Zie onder.\n\nOp 1 januari 2026 om 10:00 schreef Klant <k@x.nl>:\nlange oude mail hieronder";
    expect(schoonOmschrijving(t)).toBe("Zie onder.");
  });

  it("knipt een doorgestuurd-blok (Van:/Verzonden:/Aan:) eraf", () => {
    const t = "Doorgestuurd ter info.\n\nVan: Klant\nVerzonden: maandag\nAan: ons\nOnderwerp: keuken\n\noude inhoud";
    expect(schoonOmschrijving(t)).toBe("Doorgestuurd ter info.");
  });

  it("verwijdert de '-- ' handtekening-scheiding", () => {
    const t = "Korte vraag.\n\n-- \nBedrijf BV\nwww.bedrijf.nl";
    expect(schoonOmschrijving(t)).toBe("Korte vraag.");
  });

  it("geeft null bij lege of alleen-ruis invoer", () => {
    expect(schoonOmschrijving("")).toBeNull();
    expect(schoonOmschrijving(null)).toBeNull();
    expect(schoonOmschrijving("\n\n  \n")).toBeNull();
    expect(schoonOmschrijving("Met vriendelijke groet,\nJan")).toBeNull();
  });

  it("comprimeert overtollige lege regels", () => {
    expect(schoonOmschrijving("Regel een.\n\n\n\nRegel twee.")).toBe("Regel een.\n\nRegel twee.");
  });

  it("doorgestuurde mail zonder notitie: houdt de body over, niet alleen de marker", () => {
    const t =
      "---------- Forwarded message ---------\n" +
      "Van: Keukensale <info@keukensale.com>\n" +
      "Datum: do 27 jun 2026\n" +
      "Aan: rk <r.k.zijlstra@gmail.com>\n" +
      "Onderwerp: De heer Donker\n\n" +
      "Graag de lade onder de oven nastellen en het werkblad afkitten.";
    expect(schoonOmschrijving(t)).toBe(
      "Graag de lade onder de oven nastellen en het werkblad afkitten.",
    );
  });

  it("doorgestuurde mail met eigen notitie bovenaan: houdt de notitie", () => {
    const t =
      "Kun je dit oppakken?\n\n---------- Forwarded message ---------\nVan: Klant\nOnderwerp: keuken\n\noude inhoud";
    expect(schoonOmschrijving(t)).toBe("Kun je dit oppakken?");
  });

  it("forward zonder marker maar met leidend header-blok: pakt de body", () => {
    const t = "Van: Klant\nDatum: maandag\nAan: ons\nOnderwerp: keuken\n\nWerkblad vervangen graag.";
    expect(schoonOmschrijving(t)).toBe("Werkblad vervangen graag.");
  });

  it("meervoudig doorgestuurd (Fwd: Fwd:) met tussennotitie: houdt de diepste oorspronkelijke boodschap over", () => {
    // Zoals een mail die een paar keer is doorgestuurd: meerdere doorstuur-koppen, en halverwege
    // een losse handtekening van een tussenpersoon. We willen het origineel onderaan, niet de
    // kale "Forwarded message"-regel of de tussennotitie.
    const t =
      "---------- Forwarded message ---------\n" +
      "Van: Reinier <bkmkeukenmontage@gmail.com>\n" +
      "Date: zo 28 jun 2026\n" +
      "Subject: Fwd: Dinsdag\n" +
      "To: <klus-abc@klus-test.kluslus.nl>\n\n\n" +
      "---------- Forwarded message ---------\n" +
      "Van: Peter Keijzer <peetkeijzer@gmail.com>\n" +
      "Date: di 23 jun 2026\n" +
      "Subject: Fwd: Dinsdag\n" +
      "To: <bkmkeukenmontage@gmail.com>\n\n\n" +
      "MVG Peter Keijzer.\n\n" +
      "---------- Forwarded message ---------\n" +
      "Van: Ed de Jong <ed@keukenstudiovoorschoten.nl>\n" +
      "Date: vr 19 jun 2026\n" +
      "Subject: Dinsdag\n" +
      "To: peetkeijzer@gmail.com\n\n" +
      "Hoi Peter,\n\nPlanning dinsdag\n\n7.00h RVS";
    expect(schoonOmschrijving(t)).toBe("Hoi Peter,\n\nPlanning dinsdag\n\n7.00h RVS");
  });
});
