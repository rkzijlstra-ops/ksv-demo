/**
 * Eén bron van waarheid voor de labels en placeholders van de klus-velden. Gedeeld door het
 * aanmaak-formulier (KlusInvoer) en het aanpas-formulier (OpdrachtBewerken), zodat een label- of
 * placeholder-wijziging maar op één plek hoeft en de twee formulieren niet meer uit elkaar lopen.
 *
 * Bewust GEEN styling/volgorde/veldset hier: die verschillen legitiem per formulier. Dit dekt alleen
 * de tekst. De velden die nu per formulier afwijken (bv. de keukenzaak-label "Keukenzaak /
 * opdrachtgever" in het aanmaak-formulier) staan hier niet in; die blijven bewust per formulier.
 */
export const KLUS_VELD = {
  klant_naam: { label: "Klantnaam", placeholder: "Naam van de klant" },
  klant_adres: { label: "Adres", placeholder: "Straat, postcode, plaats" },
  referentienummer: { label: "Referentie", placeholder: "7407" },
  klant_telefoon: { label: "Telefoon", placeholder: "06-12345678" },
  klant_email: { label: "E-mail", placeholder: "klant@voorbeeld.nl" },
  werkomschrijving: {
    label: "Wat moet er gebeuren?",
    placeholder: "Bijv. kasten nastellen. Typ of spreek in.",
  },
  adviseur: { label: "Adviseur", placeholder: "" },
  leverweek: { label: "Leverweek", placeholder: "22/2026" },
} as const;
