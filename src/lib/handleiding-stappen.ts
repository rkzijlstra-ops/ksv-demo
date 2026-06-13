/**
 * Databron voor de monteur-handleiding. Eén bron van waarheid voor zowel de weergave-pagina
 * (/handleiding) als de screenshot-generator (e2e-handleiding/genereer-screenshots.spec.ts).
 * Puur data, geen opmaak, zodat dezelfde lijst later ook een losse mini-site kan voeden.
 *
 * - bestand: bestandsnaam in public/handleiding/, ook de stabiele sleutel. Formaat: "NN-naam.png".
 * - route: waar de generator naartoe navigeert. ":id" wordt vervangen door de demo-opdracht-id.
 * - interactie: optionele extra handeling vóór de screenshot (modal openen of naar onder scrollen).
 */
export type Interactie = "handtekening-modal" | "scroll-onder";

export type HandleidingStap = {
  bestand: string;
  titel: string;
  uitleg: string;
  route: string;
  interactie?: Interactie;
};

export const HANDLEIDING_STAPPEN: HandleidingStap[] = [
  {
    bestand: "01-werkpool.png",
    titel: "Je werkpool",
    uitleg:
      "In je werkpool staan je klussen, bovenaan de actieve, daaronder je geschiedenis. Een klus kan " +
      "door de opdrachtgever zijn klaargezet, maar je kunt er ook zelf een toevoegen: bovenaan upload " +
      "je een opdracht als PDF of foto, ook van andere opdrachtgevers, of je maakt een klus zonder " +
      "document aan. Zo lever je voor elke opdrachtgever een net rapport op. Tik een klus aan om hem te openen.",
    route: "/",
  },
  {
    bestand: "02-opdracht-openen.png",
    titel: "Een klus openen",
    uitleg:
      "In de klus zie je de klantgegevens en het adres. Met de knoppen bovenin bel je de klant, " +
      "stuur je een WhatsApp of start je de navigatie. Onderaan komen de meldingen van deze klus.",
    route: "/opdracht/:id",
  },
  {
    bestand: "03-melding-toevoegen.png",
    titel: "Een melding toevoegen",
    uitleg:
      "Loop je tegen een schade of manco aan? Voeg een melding toe. Maak een foto, spreek de melding " +
      "in met je stem of typ hem. Zet de urgentie op rood of geel zodat het kantoor de ernst ziet.",
    route: "/opdracht/:id/melding",
  },
  {
    bestand: "04-opleveren.png",
    titel: "Opleveren starten",
    uitleg:
      "Klaar met de klus? Start het opleveren. Leg de eindstaat vast met foto's (en eventueel video), " +
      "vul de controle-checklist in en zet je opmerking erbij. De interne notitie komt nooit bij de klant.",
    route: "/opdracht/:id/opleveren",
  },
  {
    bestand: "05-handtekening.png",
    titel: "Handtekening van de klant",
    uitleg:
      "Laat de klant tekenen op het scherm. De handtekening komt op het opleverrapport. " +
      "Geen klant bij de hand? Je kunt deze stap overslaan.",
    route: "/opdracht/:id/opleveren",
    interactie: "handtekening-modal",
  },
  {
    bestand: "06-versturen.png",
    titel: "Versturen naar klant en zaak",
    uitleg:
      "Onderaan verstuur je het rapport. De zaak-versie gaat naar het kantoor, de klant-versie " +
      "(zonder interne notitie) naar de klant als je het mailadres invult. De klus gaat op 'opgeleverd' " +
      "zodra de zaak-versie verstuurd is.",
    route: "/opdracht/:id/opleveren",
    interactie: "scroll-onder",
  },
];
