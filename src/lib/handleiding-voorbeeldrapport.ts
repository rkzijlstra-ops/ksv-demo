import type { RapportWeergaveData } from "@/components/RapportWeergave";

/**
 * Bouwt nep-rapportdata voor de demo in de handleiding. Pure functie: geen Date.now(), geen DB,
 * geen side-effects. De opleverdatum en foto-urls komen van de aanroeper (de pagina).
 *
 * @param opleverdatum  ISO-datumstring, bijv. new Date().toISOString() in de pagina
 * @param fotos         Url-lijst van eindstaat-foto's (mag leeg zijn)
 * @param meldingFotos  Url-lijst van foto's bij de demo-melding (mag leeg zijn)
 */
export function voorbeeldRapportData(
  opleverdatum: string,
  fotos: string[],
  meldingFotos: string[],
): RapportWeergaveData {
  return {
    afzenderKop: "BKM Keukenmontage",
    opleverdatum,
    klantNaam: "Fam. Jansen",
    klantAdres: "Voorbeeldstraat 1, 2251 Voorschoten",
    chips: ["Ref DEMO-001", "Keukenstudio Voorschoten"],
    ondertekend: true,
    handtekeningUrl: "/handleiding/voorbeeld/handtekening.svg",
    videoUrl: null,
    fotos,
    opmerking: null,
    meldingen: [
      {
        id: "demo-1",
        spoed: false,
        spoed_verzonden_at: null,
        created_at: opleverdatum,
        ruwe_tekst:
          "Knopje van de afzuigkap blijft soms hangen bij het indrukken, dan gaat hij niet automatisch aan. Klant kijkt het even aan.",
        foto_urls: meldingFotos,
      },
    ],
  };
}
