import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Melding } from "./db";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
    constructor(_key: string) {}
  },
}));

import { verstuurOpleverRapport, verstuurSpoedMelding, verstuurAfmelding } from "./mail";

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
