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
    afzenderKop: "Keukenmontage Jansen",
    afzenderVoet: "Keukenmontage Jansen  ·  06-12345678  ·  info@keukenmontagejansen.nl",
    opleverdatum,
    klantNaam: "Fam. Jansen",
    klantAdres: "Voorbeeldstraat 1, 2251 Voorschoten",
    referentienummer: "DEMO-001",
    leverweek: "22/2026",
    keukenzaak: "Keukenstudio Voorschoten",
    ondertekend: true,
    handtekeningUrl: "/handleiding/voorbeeld/handtekening.svg",
    videoUrl: null,
    fotos,
    opmerking: "Keuken compleet gemonteerd en getest, klant tevreden.",
    controle: [
      { punt: "Keuken waterpas gesteld en bevestigd", akkoord: true },
      { punt: "Apparatuur aangesloten en getest", akkoord: true },
      { punt: "Werkblad en spoelbak afgekit", akkoord: true },
      { punt: "Lade onder de spoelbak loopt stroef", akkoord: false },
    ],
    interneNotitie: "Lade-rail bij de spoelbak vervangen, onderdeel nabestellen. Klant is op de hoogte.",
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
