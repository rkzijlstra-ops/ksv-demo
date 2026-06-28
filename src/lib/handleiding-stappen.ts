/**
 * Databron voor de monteur-handleiding. Eén bron van waarheid voor de weergave-pagina
 * (/handleiding) én de screenshot-generator (e2e-handleiding/genereer-screenshots.spec.ts).
 * Puur data, geen opmaak. Onderwerpen zijn gegroepeerd; een nieuw onderwerp toevoegen is
 * één regel hier + `npm run screenshots:handleiding`. De pagina hoeft niet verbouwd te worden.
 *
 * - id: stabiele sleutel + anker-id in de pagina.
 * - bestand: bestandsnaam in public/handleiding/, formaat "NN-naam.png".
 * - intro: optionele korte introzin boven de steekwoorden.
 * - punten: korte steekwoorden, snel te scannen.
 * - route: waar de generator naartoe navigeert. ":id" wordt vervangen door de demo-klus-id.
 * - interactie: optionele handeling vóór de screenshot.
 * - nieuw: toont een "nieuw"-label; gebruik tot er een echt scherm/plaatje voor is.
 */
export type Interactie =
  | "handtekening-modal"
  | "scroll-onder"
  | "interne-notitie"
  | "spoed-aan"
  | "documenten-blok";

export type HandleidingOnderwerp = {
  id: string;
  titel: string;
  intro?: string;
  punten: string[];
  bestand: string;
  route: string;
  interactie?: Interactie;
  nieuw?: boolean;
};

export type HandleidingGroep = {
  titel: string;
  onderwerpen: HandleidingOnderwerp[];
};

export const HANDLEIDING_GROEPEN: HandleidingGroep[] = [
  {
    titel: "Aan de slag",
    onderwerpen: [
      {
        id: "kluspool",
        titel: "Je kluspool",
        bestand: "01-kluspool.png",
        intro: "Je klussen: actief bovenaan, geschiedenis eronder.",
        punten: [
          "Een klus komt van de opdrachtgever, of je voegt er zelf een toe.",
          "Tik een klus aan om te openen.",
        ],
        route: "/",
      },
      {
        id: "klus-toevoegen",
        titel: "Klus toevoegen",
        bestand: "02-klus-toevoegen.png",
        intro: "Zelf een klus aanmaken kan op meerdere manieren.",
        punten: [
          "Voeg een PDF toe, dan vult de app de gegevens vanzelf in.",
          "Een foto of tekening kan ook.",
          "Mailen kan ook: stuur de klus naar het klus-mailadres.",
          "Of maak een klus zonder document aan.",
        ],
        route: "/",
        nieuw: true,
      },
      {
        id: "klus-openen",
        titel: "Een klus openen",
        bestand: "03-klus-openen.png",
        intro: "Klantgegevens en adres in beeld.",
        punten: [
          "Knoppen bovenin: bellen, WhatsApp, navigeren.",
          "Wat niet bekend is, zie je niet: geen nummer betekent geen belknop.",
        ],
        route: "/opdracht/:id",
      },
    ],
  },
  {
    titel: "Tijdens de klus",
    onderwerpen: [
      {
        id: "melding-maken",
        titel: "Een melding maken",
        bestand: "04-melding-maken.png",
        intro: "Schade of manco vastleggen: foto, video, ingesproken of getypt.",
        punten: [
          "Gewone melding: komt in het opleverrapport.",
          "Een video opnemen of toevoegen kan ook bij de melding.",
        ],
        route: "/opdracht/:id/melding",
      },
      {
        id: "spoedmelding",
        titel: "Spoedmelding",
        bestand: "05-spoedmelding.png",
        intro: "Voor wat echt niet kan wachten.",
        punten: [
          "Gaat meteen los naar kantoor, buiten de oplevering om.",
          "Komt later ook in het rapport.",
          "Spoed alleen als het echt niet kan wachten.",
        ],
        route: "/opdracht/:id/melding",
        interactie: "spoed-aan",
      },
      {
        id: "documenten-pdf",
        titel: "Documenten / PDF bekijken",
        bestand: "06-documenten-pdf.png",
        intro: "Werkbon of tekening direct in de app openen.",
        punten: [
          "Knijp-zoom en scroll door de PDF.",
          "Documenten staan bij de klus in het documenten-blok.",
        ],
        route: "/opdracht/:id",
        interactie: "documenten-blok",
        nieuw: true,
      },
    ],
  },
  {
    titel: "Afronden",
    onderwerpen: [
      {
        id: "snel-afsluiten",
        titel: "Snel afsluiten",
        bestand: "07-snel-afsluiten.png",
        intro: "Voor een serviceklus. Een verkort rapport, zonder handtekening of voorvertoning.",
        punten: [
          "Komt er nog een vervolg (onderdelen later)? Zet dat vinkje aan.",
        ],
        route: "/opdracht/:id/afronden/snel",
      },
      {
        id: "afsluiten-rapport",
        titel: "Afsluiten + rapport",
        bestand: "08-afsluiten-rapport.png",
        intro: "Volledige oplevering, optioneel met foto, video en handtekening, voor een keuken.",
        punten: [
          "Kies 'Afsluiten + rapport' onderaan de klus.",
          "Foto, video en handtekening zijn altijd optioneel.",
        ],
        route: "/opdracht/:id/afronden",
      },
      {
        id: "handtekening",
        titel: "Handtekening van de klant",
        bestand: "09-handtekening.png",
        intro: "Laat de klant op het scherm tekenen.",
        punten: [
          "De handtekening komt op het rapport.",
          "Geen klant erbij? Sla deze stap over.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "handtekening-modal",
      },
      {
        id: "vervolg-opgeleverd",
        titel: "Vervolg / opgeleverd",
        bestand: "10-vervolg-opgeleverd.png",
        intro: "Een tweede ronde op dezelfde klus.",
        punten: [
          "Een vervolg sluit je af als 'opgeleverd' en krijgt een label.",
        ],
        route: "/opdracht/:id",
        nieuw: true,
      },
      {
        id: "niet-doorgegaan",
        titel: "Niet doorgegaan",
        bestand: "11-niet-doorgegaan.png",
        intro: "Klant niet thuis of werk niet af te ronden. Meld terug met een reden.",
        punten: [
          "De opdrachtgever ziet dat de klus niet is doorgegaan, met jouw reden.",
        ],
        route: "/opdracht/:id/afronden",
        nieuw: true,
      },
    ],
  },
  {
    titel: "Versturen",
    onderwerpen: [
      {
        id: "naar-opdrachtgever",
        titel: "Naar de opdrachtgever",
        bestand: "12-naar-opdrachtgever.png",
        intro: "Onderaan verstuur je het rapport.",
        punten: [
          "Pas dan staat de klus op 'opgeleverd'.",
          "Foto's en meldingen gaan mee.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "scroll-onder",
      },
      {
        id: "klant-versie",
        titel: "Klant-versie",
        bestand: "13-klant-versie.png",
        intro: "Optioneel: stuur de klant ook een versie.",
        punten: [
          "Vul het mailadres in; de interne notitie gaat niet mee.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "scroll-onder",
        nieuw: true,
      },
    ],
  },
];

export const HANDLEIDING_ONDERWERPEN: HandleidingOnderwerp[] =
  HANDLEIDING_GROEPEN.flatMap((groep) => groep.onderwerpen);
