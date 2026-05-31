export interface Keukenzaak {
  naam: string;
  email: string;
}

/**
 * Keukenzaken die een monteur kan kiezen als ontvanger van het opleverrapport.
 * KKS en aanverwanten (Keukensale en Küchen-Dump) delen één service-adres.
 * Naast deze lijst kan een monteur altijd "Anders" kiezen en zelf typen.
 */
export const KEUKENZAKEN: Keukenzaak[] = [
  { naam: "Keukenstudio Voorschoten", email: "service@keukenstudiovoorschoten.nl" },
  { naam: "Keukensale Katwijk", email: "servicemonteur@keukensale.com" },
  { naam: "Küchen-Dump Almere", email: "servicemonteur@keukensale.com" },
];
