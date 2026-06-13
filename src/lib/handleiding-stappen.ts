/**
 * Databron voor de monteur-handleiding. Eén bron van waarheid voor zowel de weergave-pagina
 * (/handleiding) als de screenshot-generator (e2e-handleiding/genereer-screenshots.spec.ts).
 * Puur data, geen opmaak, zodat dezelfde lijst later ook een losse mini-site kan voeden.
 *
 * - bestand: bestandsnaam in public/handleiding/, ook de stabiele sleutel. Formaat: "NN-naam.png".
 * - intro: optionele korte introzin boven de steekwoorden.
 * - punten: korte steekwoorden, bewust geen volle zinnen, zodat het snel te scannen is.
 * - route: waar de generator naartoe navigeert. ":id" wordt vervangen door de demo-opdracht-id.
 * - interactie: optionele handeling vóór de screenshot (popup openen of naar een blok scrollen).
 */
export type Interactie = "handtekening-modal" | "scroll-onder" | "interne-notitie";

export type HandleidingStap = {
  bestand: string;
  titel: string;
  intro?: string;
  punten: string[];
  route: string;
  interactie?: Interactie;
};

export const HANDLEIDING_STAPPEN: HandleidingStap[] = [
  {
    bestand: "01-werkpool.png",
    titel: "Je werkpool",
    intro: "Je klussen: actief bovenaan, geschiedenis eronder.",
    punten: [
      "Een klus komt van de opdrachtgever, of je voegt er zelf een toe.",
      "Zelf toevoegen: upload een opdracht als PDF of foto, ook van andere opdrachtgevers.",
      "Of maak een klus zonder document aan.",
      "Tik een klus aan om te openen.",
    ],
    route: "/",
  },
  {
    bestand: "02-opdracht-openen.png",
    titel: "Een klus openen",
    intro: "Klantgegevens en adres in beeld.",
    punten: [
      "Knoppen bovenin: bellen, WhatsApp, navigeren.",
      "Wat niet bekend is, zie je niet: geen nummer betekent geen belknop.",
      "Vanaf hier voeg je een melding toe of ga je opleveren.",
    ],
    route: "/opdracht/:id",
  },
  {
    bestand: "03-melding-toevoegen.png",
    titel: "Een melding maken",
    intro: "Schade of manco vastleggen: foto, ingesproken of getypt.",
    punten: [
      "Gewone melding: komt in het opleverrapport.",
      "Spoed: gaat meteen los naar kantoor, buiten de oplevering om, en komt later ook in het rapport.",
      "Spoed alleen als het echt niet kan wachten.",
    ],
    route: "/opdracht/:id/melding",
  },
  {
    bestand: "04-opleveren.png",
    titel: "Opleveren",
    intro: "Eén flow voor een snelle serviceklus en een volledige montage.",
    punten: [
      "Leg de eindstaat vast: minstens één foto of video.",
      "Optioneel: een opmerking en de controle-checklist.",
      "Interne notitie (geel slotje, dichtgeklapt): alleen voor de zaak, nooit voor de klant.",
      "Daarna teken je af en verstuur je.",
    ],
    route: "/opdracht/:id/opleveren",
    interactie: "interne-notitie",
  },
  {
    bestand: "05-handtekening.png",
    titel: "Handtekening van de klant",
    intro: "Laat de klant op het scherm tekenen.",
    punten: [
      "De handtekening komt op het rapport.",
      "Geen klant erbij? Sla deze stap over.",
    ],
    route: "/opdracht/:id/opleveren",
    interactie: "handtekening-modal",
  },
  {
    bestand: "06-versturen.png",
    titel: "Versturen",
    intro: "Onderaan verstuur je het rapport.",
    punten: [
      "Zaak-versie naar kantoor: pas dan staat de klus op 'opgeleverd'.",
      "Klant-versie is optioneel: vul het mailadres in, de interne notitie gaat niet mee.",
      "Foto's en meldingen gaan wel mee naar de klant.",
    ],
    route: "/opdracht/:id/opleveren",
    interactie: "scroll-onder",
  },
];
