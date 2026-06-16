import { z } from "zod";

export const MeldingItemSchema = z.object({
  keller_code: z.string().min(1),
  omschrijving: z.string().min(1),
  melding_tekst: z.string().min(1),
});

export const DocumenttypeSchema = z.enum([
  "orderbevestiging",
  "werkbon_service",
  "onbekend",
]);

/** Soort adres op de order: waar de keuken geplaatst wordt (montage/aflever), het bedrijf dat de
 *  opdracht geeft (bouwbedrijf/keukenzaak), het factuuradres, of onduidelijk. */
export const AdresSoortSchema = z.enum(["montage", "opdrachtgever", "factuur", "onbekend"]);

export const AdresKandidaatSchema = z.object({
  adres: z.string().min(1),
  soort: AdresSoortSchema,
});

export const ParsedPdfSchema = z.object({
  klant_naam: z.string().nullable(),
  klant_adres: z.string().nullable(),
  referentienummer: z.string().nullable(),
  adviseur: z.string().nullable(),
  klant_telefoon: z.string().nullable(),
  klant_email: z.string().nullable(),
  documenttype: DocumenttypeSchema,
  leverweek: z.string().nullable(),
  keukenzaak: z.string().nullable(),
  meldingen: z.array(MeldingItemSchema),
  // Alle adressen op de PDF, elk met een soort-label. Default [] zodat oudere/onvolledige
  // tool-output blijft valideren; bij 2+ unieke adressen kiest een mens (zie adres-keuze.ts).
  adressen: z.array(AdresKandidaatSchema).default([]),
});

export type MeldingItem = z.infer<typeof MeldingItemSchema>;
export type AdresSoort = z.infer<typeof AdresSoortSchema>;
export type AdresKandidaat = z.infer<typeof AdresKandidaatSchema>;
export type ParsedPdf = z.infer<typeof ParsedPdfSchema>;

/**
 * JSON-schema voor Anthropic tool_use. Handmatig gespiegeld aan ParsedPdfSchema
 * omdat tool_use een raw JSON-schema verwacht, geen Zod-instance.
 * Bij wijziging aan ParsedPdfSchema dit object ook bijwerken (er staat een test op).
 */
export const ParsedPdfJsonSchema = {
  type: "object",
  properties: {
    klant_naam: {
      type: ["string", "null"],
      description:
        "Volledige klantnaam zoals op de PDF, bijv. 'J. Jansen' of 'Familie de Vries'. null als niet vindbaar.",
    },
    klant_adres: {
      type: ["string", "null"],
      description:
        "Klantadres als één string (straat, postcode, plaats). null als niet vindbaar.",
    },
    referentienummer: {
      type: ["string", "null"],
      description:
        "Referentienummer van Keukenstudio voor deze zaak, bijv. '7444'. Altijd als string. null als niet vindbaar.",
    },
    adviseur: {
      type: ["string", "null"],
      description: "Naam van de adviseur/verkoper, bijv. 'M. de Vries'. null als niet vindbaar.",
    },
    klant_telefoon: {
      type: ["string", "null"],
      description:
        "Telefoonnummer van de klant zoals op de PDF, bijv. '071-1234567' of '06-12345678'. null als niet vindbaar.",
    },
    klant_email: {
      type: ["string", "null"],
      description:
        "E-mailadres van de klant zoals op de PDF, vaak in de kop bij 'Email-adres'. Eén adres als string, bijv. 'j.jansen@voorbeeld.nl'. null als niet vindbaar (bij service-werkbonnen vaak afwezig).",
    },
    documenttype: {
      type: "string",
      enum: ["orderbevestiging", "werkbon_service", "onbekend"],
      description:
        "Soort document. 'orderbevestiging' = montage-order met 'Gepl. leverweek' en apparatuur/keukenmeubelen (geen 'Uw melding'). 'werkbon_service' = service-werkbon met 'WERKBON SERVICE' en 'Uw melding'-klachten. 'onbekend' als geen van beide past.",
    },
    leverweek: {
      type: ["string", "null"],
      description:
        "Geplande leverweek zoals op een orderbevestiging, bijv. '22/2026'. null bij service-werkbon of als niet vindbaar.",
    },
    keukenzaak: {
      type: ["string", "null"],
      description:
        "Naam van de keukenzaak/opdrachtgever uit de kop of voettekst van het document, bijv. 'Keukenstudio Voorschoten', 'Keukensale.com Katwijk' of 'Küchen-Dump Almere'. null als niet vindbaar.",
    },
    meldingen: {
      type: "array",
      description:
        "Lijst van alle meldingen per artikel in de PDF. Voor elke 'Uw melding' regel één item. Lege array als er geen meldingen zijn.",
      items: {
        type: "object",
        properties: {
          keller_code: {
            type: "string",
            description: "De Keller-artikelcode, bijv. 'F-BK-LD-60'.",
          },
          omschrijving: {
            type: "string",
            description:
              "De officiële artikelomschrijving, bijv. 'Front bovenkast linksdraaiend 60cm'.",
          },
          melding_tekst: {
            type: "string",
            description:
              "De vrije tekst onder 'Uw melding' voor dit artikel — wat er mis is en wat er moet gebeuren.",
          },
        },
        required: ["keller_code", "omschrijving", "melding_tekst"],
        additionalProperties: false,
      },
    },
    adressen: {
      type: "array",
      description:
        "ALLE adressen die op het document staan, elk met een soort-label. Een order heeft soms meerdere adressen: het MONTAGE-/afleveradres (waar de keuken geplaatst wordt, waar de monteur heen moet), het OPDRACHTGEVER-adres (bouwbedrijf of keukenzaak) en/of een FACTUUR-adres. Geef ze allemaal terug. Staat er maar één adres, geef dan dat ene. Lege array als er geen adres vindbaar is.",
      items: {
        type: "object",
        properties: {
          adres: {
            type: "string",
            description: "Het volledige adres als één string (straat, postcode, plaats).",
          },
          soort: {
            type: "string",
            enum: ["montage", "opdrachtgever", "factuur", "onbekend"],
            description:
              "'montage' = waar de keuken geplaatst/afgeleverd wordt (montagelocatie, afleveradres). 'opdrachtgever' = het bedrijf dat de opdracht geeft (bouwbedrijf, aannemer, keukenzaak). 'factuur' = factuuradres. 'onbekend' als niet te bepalen.",
          },
        },
        required: ["adres", "soort"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "klant_naam",
    "klant_adres",
    "referentienummer",
    "adviseur",
    "klant_telefoon",
    "klant_email",
    "documenttype",
    "leverweek",
    "keukenzaak",
    "meldingen",
  ],
  additionalProperties: false,
} as const;
