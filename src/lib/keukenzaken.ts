export interface Keukenzaak {
  naam: string;
  email: string;
}

/**
 * Keukenzaken die een monteur kan kiezen als ontvanger van het opleverrapport.
 *
 * LET OP: controleer per zaak welk e-mailadres de opleverrapporten hoort te ontvangen.
 * Dit zijn adressen uit eerdere orders; pas ze hier aan als ze niet kloppen. Voor de
 * testfase kun je ze desgewenst (tijdelijk) op je eigen adres zetten zodat alles bij jou
 * binnenkomt. Naast deze lijst kan een monteur altijd "Anders" kiezen en zelf typen.
 */
export const KEUKENZAKEN: Keukenzaak[] = [
  { naam: "Keukenstudio Voorschoten", email: "info@keukenstudiovoorschoten.nl" },
  { naam: "Keukensale Katwijk", email: "katwijk@keukensale.com" },
  { naam: "Küchen-Dump Almere", email: "almere@kuechendump.nl" },
];
