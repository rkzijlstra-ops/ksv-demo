# Zelf-invoer: één gecombineerde flow met datum/tijd en e-mail

Datum: 2026-06-13

Stap 1 van het "zelf invoeren makkelijker maken"-spoor (zie de brainstorm met Rein). Doel: een
monteur die buiten zijn betalende klanten om zelf een klus invoert (eigen klusje, voorbereider,
badkamer- of servicemonteur) moet dat in seconden kunnen, ook met onvolledige gegevens. Dat
creëert warme leads.

## Wat

De twee aparte knoppen op de werkpool (PDF uploaden / handmatig invoeren) zijn één **"Klus
toevoegen"**-flow geworden (`OpdrachtAanmaken`):

- Een document (PDF, foto of tekening) is **optioneel**.
- Zit er een PDF bij, dan leest de parser de gegevens alvast in (nieuwe **parse-only-modus** in
  `POST /api/opdrachten` via `actie=parse`, die niets aanmaakt of opslaat) en vult de velden voor.
- Je controleert en vult aan wat je weet, of neemt er genoegen mee. Niets is verplicht zolang er
  een document of minstens één veld is. Ingevulde velden zijn **leidend**: bij opslaan parsen we
  niet opnieuw, zodat correcties blijven staan. Parser-extra's (documenttype, leverweek, adviseur,
  artikelen) gaan als verborgen velden mee zodat niets verloren gaat.
- **E-mailveld** toegevoegd (ontbrak; juist voor leads handig).
- **Datum + tijd** toegevoegd. `createOpdracht` zet `startdatum`/`starttijd` + `uitvoerdatum`. De
  werkpool **sorteert** actieve klussen nu op uitvoerdatum (eerstvolgende boven, gelijke datum op
  starttijd), ongeplande eronder op invoer-moment. Zo komt een zelf ingevoerde klus met datum
  meteen op de juiste plek.

## Grenzen / keuzes

- De oude "upload zonder velden = direct parsen en aanmaken"-weg blijft bestaan voor compatibiliteit
  (en de bestaande API-tests). De nieuwe flow stuurt altijd velden mee, dus die weg wordt vanzelf de
  review-weg.
- Het kantoor-dashboard (`InschietZone`, bulk-inschiet) is niet geraakt; dat blijft instant.
- De screenshot-generator onderdrukt nu het werkpool-welkomblok (anders stond het op het
  handleiding-plaatje). Stap-1-screenshot ververst.

## Verificatie

tsc schoon, 563 unit-tests groen (+5: werkpool-sortering en API parse/velden), nieuwe e2e
`zelf-invoer.spec.ts` (form openen, naam + datum, opslaan, verschijnt in werkpool), CI volledig
groen. Geen migratie: `startdatum`/`starttijd`/`uitvoerdatum`/`klant_email` bestonden al als kolom.

## Volgende (later, stap 2)

Mail-naar-app: doorgestuurde opdrachtgever-mail in een "te verwerken"-bakje dat hetzelfde review-idee
hergebruikt; meerdere klussen in één mail naar review routeren in plaats van blind aanmaken of
blokkeren. Vereist inkomende-mail-infra (Resend is alleen uitgaand) en een keuze daarover.
