import type { RapportWeergaveData } from "@/components/RapportWeergave";
import { CONTROLE_PUNTEN } from "@/lib/oplever-controle";

/**
 * Bouwt nep-rapportdata voor de demo in de handleiding. Pure functie: geen Date.now(), geen DB,
 * geen side-effects. De opleverdatum, foto-urls en video-url komen van de aanroeper (de pagina).
 * Volgt exact het echte rapport (rapport.ts / RapportWeergave): het controle-deel is het ene
 * algemene akkoord dat de klant bij de handtekening aftekent, niet een verzonnen checklist.
 *
 * @param opleverdatum  ISO-datumstring, bijv. new Date().toISOString() in de pagina
 * @param fotos         Url-lijst van eindstaat-foto's (mag leeg zijn)
 * @param meldingFotos  Url-lijst van foto's bij de demo-melding (mag leeg zijn)
 * @param videoUrl      Url van de oplever-video (null = geen video; dan geen afspeelknop)
 */
export function voorbeeldRapportData(
  opleverdatum: string,
  fotos: string[],
  meldingFotos: string[],
  videoUrl: string | null,
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
    videoUrl,
    fotos,
    opmerking: "Keuken compleet gemonteerd en getest, klant tevreden.",
    // Het echte rapport heeft één algemeen akkoord (CONTROLE_PUNTEN[0]) dat de klant bij de
    // handtekening aftekent, geen losse checklist. Hier op akkoord.
    controle: [{ punt: CONTROLE_PUNTEN[0], akkoord: true }],
    interneNotitie: "Afzuigkap-melding nagekeken; onderdeel nabesteld. Klant is op de hoogte.",
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
