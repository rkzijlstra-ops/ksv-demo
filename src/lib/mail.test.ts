import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Melding } from "./db";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
    constructor(_key: string) {}
  },
}));

import {
  verstuurOpleverRapport,
  verstuurSpoedMelding,
  verstuurAfmelding,
  verstuurUitnodiging,
  verstuurMonteurMail,
  verstuurAnnulering,
} from "./mail";

function opdracht(over: Partial<Melding> = {}): Melding {
  return {
    id: "opdr-1",
    klant_naam: "van Dijk",
    referentienummer: "7407",
    ...over,
  } as Melding;
}

const basis = {
  naar: "rein@example.com",
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  bestandsnaam: "opleverrapport-7407.pdf",
};

const ORIG = process.env;

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  process.env = { ...ORIG, RESEND_API_KEY: "re_test_key", RESEND_FROM: "" };
});
afterEach(() => {
  process.env = ORIG;
});

describe("verstuurOpleverRapport", () => {
  it("verstuurt via Resend met juiste to/subject/attachment", async () => {
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });

    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("rein@example.com");
    expect(arg.subject).toMatch(/van Dijk/);
    expect(arg.subject).toMatch(/7407/);
    expect(arg.attachments).toHaveLength(1);
    expect(arg.attachments[0].filename).toBe("opleverrapport-7407.pdf");
  });

  it("ondertekent met het monteur-profiel en lekt geen rauwe link of interne opmerking", async () => {
    await verstuurOpleverRapport({
      ...basis,
      opdracht: opdracht({ keukenzaak: "Keukensale.com Katwijk" }),
      videoUrl: "https://x/oplever-videos/v1.mp4",
      afzender: { naam: "Jan Bakker", bedrijfsnaam: "BKM Keukenmontage", telefoon: "0612", email: "jan@bkm.nl" },
    });
    const arg = mockSend.mock.calls[0][0];
    expect(arg.text).toContain("BKM Keukenmontage");
    expect(arg.text).not.toMatch(/oplever-videos\/v1\.mp4/); // link staat in de PDF, niet in de mail
    expect(arg.text).not.toMatch(/Keukensale\.com Katwijk/); // ondertekening volgt het profiel, niet de keukenzaak
  });

  it("zet de From-naam gelijk aan de ondertekening (afzender-kop), met het adres uit RESEND_FROM", async () => {
    process.env.RESEND_FROM = "Oude Naam <rapport@mijndomein.nl>";
    await verstuurOpleverRapport({
      ...basis,
      opdracht: opdracht(),
      afzender: { naam: "Jan Bakker", bedrijfsnaam: "BKM Keukenmontage", telefoon: null, email: null },
    });
    expect(mockSend.mock.calls[0][0].from).toBe("BKM Keukenmontage <rapport@mijndomein.nl>");
  });

  it("valt voor de From-naam terug op een neutrale naam zonder profiel", async () => {
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });
    expect(mockSend.mock.calls[0][0].from).toBe("Kluslus <onboarding@resend.dev>");
  });

  it("zet reply-to wanneer RESEND_REPLY_TO ingevuld is", async () => {
    process.env.RESEND_REPLY_TO = "antwoord@kluslus.nl";
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });
    expect(mockSend.mock.calls[0][0].replyTo).toBe("antwoord@kluslus.nl");
  });

  it("laat reply-to weg wanneer RESEND_REPLY_TO leeg is", async () => {
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });
    expect(mockSend.mock.calls[0][0].replyTo).toBeUndefined();
  });

  it("zet reply-to op de monteur-mail (boven het vangnet) als het profiel een mailadres heeft", async () => {
    process.env.RESEND_REPLY_TO = "antwoord@kluslus.nl";
    await verstuurOpleverRapport({
      ...basis,
      opdracht: opdracht(),
      afzender: { naam: "Jan Bakker", bedrijfsnaam: "BKM", telefoon: "0612", email: "jan@bkm.nl" },
    });
    expect(mockSend.mock.calls[0][0].replyTo).toBe("jan@bkm.nl");
  });

  it("valt voor reply-to terug op het vangnet als het profiel geen mailadres heeft", async () => {
    process.env.RESEND_REPLY_TO = "antwoord@kluslus.nl";
    await verstuurOpleverRapport({
      ...basis,
      opdracht: opdracht(),
      afzender: { naam: "Jan Bakker", bedrijfsnaam: "BKM", telefoon: "0612", email: null },
    });
    expect(mockSend.mock.calls[0][0].replyTo).toBe("antwoord@kluslus.nl");
  });

  it("gooit een duidelijke error als RESEND_API_KEY ontbreekt", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      verstuurOpleverRapport({ ...basis, opdracht: opdracht() }),
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("gooit een error als Resend een fout teruggeeft", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    await expect(
      verstuurOpleverRapport({ ...basis, opdracht: opdracht() }),
    ).rejects.toThrow(/domain not verified/);
  });
});

describe("verstuurSpoedMelding", () => {
  const melding = {
    ruwe_tekst: "Vaatwasser lekt, direct actie nodig",
    foto_urls: ["https://x/foto1.jpg"],
  } as Melding;

  it("verstuurt een SPOED-mail zonder bijlage, met tekst en foto-link in de body", async () => {
    await verstuurSpoedMelding({ naar: "rein@example.com", opdracht: opdracht(), melding });

    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("rein@example.com");
    expect(arg.subject).toMatch(/SPOED/);
    expect(arg.subject).toMatch(/van Dijk/);
    expect(arg.text).toMatch(/Vaatwasser lekt/);
    expect(arg.text).toMatch(/foto1\.jpg/);
    expect(arg.attachments).toBeUndefined();
  });

  it("zet reply-to ook op de spoed-mail wanneer RESEND_REPLY_TO ingevuld is", async () => {
    process.env.RESEND_REPLY_TO = "antwoord@kluslus.nl";
    await verstuurSpoedMelding({ naar: "rein@example.com", opdracht: opdracht(), melding });
    expect(mockSend.mock.calls[0][0].replyTo).toBe("antwoord@kluslus.nl");
  });

  it("zet de From-naam op '<keukenzaak> via Kluslus' (afzender uit de opdracht)", async () => {
    process.env.RESEND_FROM = "planning@kluslus.nl";
    await verstuurSpoedMelding({
      naar: "rein@example.com",
      opdracht: opdracht({ keukenzaak: "Keukenstudio Voorschoten" }),
      melding,
    });
    expect(mockSend.mock.calls[0][0].from).toBe(
      "Keukenstudio Voorschoten via Kluslus <planning@kluslus.nl>",
    );
  });

  it("gooit een error als RESEND_API_KEY ontbreekt", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      verstuurSpoedMelding({ naar: "rein@example.com", opdracht: opdracht(), melding }),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });
});

describe("verstuurAfmelding", () => {
  it("mailt de afmelding naar de gebruiker met de zaaknaam als afsluiter", async () => {
    await verstuurAfmelding({
      naar: "piet@example.com",
      naam: "Piet",
      organisatie: "Keukenstudio Voorschoten",
    });
    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("piet@example.com");
    expect(arg.subject).toMatch(/afgemeld/i);
    expect(arg.text).toContain("Hoi Piet,");
    expect(arg.text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("zet reply-to ook op de afmeld-mail", async () => {
    process.env.RESEND_REPLY_TO = "antwoord@kluslus.nl";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend.mock.calls[0][0].replyTo).toBe("antwoord@kluslus.nl");
  });

  it("zet de From-naam op '<zaak> via Kluslus', met het adres uit RESEND_FROM", async () => {
    process.env.RESEND_FROM = "planning@kluslus.nl";
    await verstuurAfmelding({
      naar: "piet@example.com",
      naam: "Piet",
      organisatie: "Keukenstudio Voorschoten",
    });
    expect(mockSend.mock.calls[0][0].from).toBe(
      "Keukenstudio Voorschoten via Kluslus <planning@kluslus.nl>",
    );
  });
});

describe("verstuurUitnodiging", () => {
  it("verstuurt de uitnodiging met de From-naam '<zaak> via Kluslus'", async () => {
    process.env.RESEND_FROM = "Oude Naam <planning@kluslus.nl>";
    await verstuurUitnodiging({
      naar: "thu@example.com",
      naam: "Thu",
      rol: "monteur",
      appUrl: "https://mijn.kluslus.nl",
      organisatie: "Keukenstudio Voorschoten",
    });
    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("thu@example.com");
    // De herkenbare zaaknaam staat vooraan, het domein-merk erachter (lost naam/domein-mismatch op).
    expect(arg.from).toBe("Keukenstudio Voorschoten via Kluslus <planning@kluslus.nl>");
    expect(arg.subject).toMatch(/Keukenstudio Voorschoten/);
    expect(arg.html).toBeTruthy();
  });

  it("valt voor de From-naam terug op 'Kluslus' zonder organisatie", async () => {
    process.env.RESEND_FROM = "planning@kluslus.nl";
    await verstuurUitnodiging({
      naar: "thu@example.com",
      naam: "Thu",
      rol: "monteur",
      appUrl: "https://x",
    });
    expect(mockSend.mock.calls[0][0].from).toBe("Kluslus <planning@kluslus.nl>");
  });
});

describe("MAIL_DRY_RUN (symmetrisch met SMS_DRY_RUN)", () => {
  it("verstuurt niets als MAIL_DRY_RUN=1 (alleen loggen)", async () => {
    process.env.MAIL_DRY_RUN = "1";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("verstuurt wel als MAIL_DRY_RUN=0", async () => {
    process.env.MAIL_DRY_RUN = "0";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("verstuurt wel als MAIL_DRY_RUN niet gezet is", async () => {
    delete process.env.MAIL_DRY_RUN;
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("MAIL_ALLOWLIST (grendel, gelijk aan SMS_ALLOWLIST)", () => {
  it("slaat een ontvanger over die niet op de allowlist staat", async () => {
    process.env.MAIL_ALLOWLIST = "alleen-deze@kluslus.nl";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("verstuurt naar een ontvanger die wel op de allowlist staat", async () => {
    process.env.MAIL_ALLOWLIST = "piet@example.com";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("lege allowlist = geen beperking (verstuurt echt)", async () => {
    process.env.MAIL_ALLOWLIST = "";
    await verstuurAfmelding({ naar: "piet@example.com", naam: "Piet" });
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("appAfzender op de overige app-mails (zaaknaam vooraan, domein-merk erachter)", () => {
  it("annulering: From = '<organisatie> via Kluslus' (zelfde pad als ontplanning/document/herinnering/terugmelding)", async () => {
    process.env.RESEND_FROM = "planning@kluslus.nl";
    await verstuurAnnulering({
      naar: "thu@example.com",
      monteurNaam: "Thu",
      klantNaam: "van Dijk",
      referentienummer: "7407",
      organisatie: "Keukenstudio Voorschoten",
    });
    expect(mockSend.mock.calls[0][0].from).toBe(
      "Keukenstudio Voorschoten via Kluslus <planning@kluslus.nl>",
    );
  });

  it("monteur-bundel: From = '<zaaknaam> via Kluslus'", async () => {
    process.env.RESEND_FROM = "planning@kluslus.nl";
    await verstuurMonteurMail({
      naar: "thu@example.com",
      monteurNaam: "Thu",
      zaaknaam: "Keukenstudio Voorschoten",
      opdrachten: [
        {
          klant_naam: "van Dijk",
          klant_adres: "Dorpsstraat 1",
          referentienummer: "7407",
          documenttype: null,
          startdatum: "2026-07-01",
          starttijd: null,
          duur_dagen: 1,
          meldingen: [],
        },
      ] as unknown as Parameters<typeof verstuurMonteurMail>[0]["opdrachten"],
    });
    expect(mockSend.mock.calls[0][0].from).toBe(
      "Keukenstudio Voorschoten via Kluslus <planning@kluslus.nl>",
    );
  });
});
