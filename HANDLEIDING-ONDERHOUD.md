# Handleiding voor monteurs - onderhoud

De handleiding zit in de app op `/handleiding` (menu-knop "Handleiding"). De onderwerpen staan
gegroepeerd (vier groepen) en zijn inklapbaar; standaard alles dicht, met een knop "Alles
openklappen". Drie losse delen:

1. **De inhoud** staat in `src/lib/handleiding-stappen.ts` als `HANDLEIDING_GROEPEN` (groepen met
   onderwerpen), plus de afgeleide platte lijst `HANDLEIDING_ONDERWERPEN` (voor de generator en de
   tests). Een zin aanpassen of een onderwerp toevoegen doe je daar. Een nieuw onderwerp = een
   object met `id`, `titel`, `punten`, `bestand`, `route` (en eventueel `intro`, `interactie`,
   `nieuw`). Zet `nieuw: true` zolang er nog geen screenshot/feature voor is; de pagina toont dan
   een placeholder en de generator slaat het over.
2. **De screenshots** staan in `public/handleiding/` (formaat `NN-naam.png`). Die maak je niet met
   de hand, maar met de generator; ze worden bijgesneden zodat er geen lege witruimte onder staat.
3. **De pagina** (`src/app/handleiding/page.tsx` + de client-component
   `src/components/HandleidingWeergave.tsx`) toont alles automatisch uit de databron. Bij het
   toevoegen van een onderwerp hoef je de pagina dus niet aan te raken.

## Screenshots opnieuw maken (na een appwijziging)

Draai in PowerShell, in de projectmap:

    npm run screenshots:handleiding

Dit logt in als de testmonteur, maakt een nette demo-opdracht (Fam. Jansen, nepgegevens) in de
test-database, schiet de screenshots en ruimt de demo-opdracht weer op. Daarna in git vastleggen:

    git add public/handleiding/*.png
    git commit -m "Handleiding-screenshots ververst"

## Let op

- Er staat nooit een echte klant op de screenshots: ze draaien tegen de test-database
  (`.env.test`), niet tegen productie. Zonder `.env.test` werkt de generator niet zoals bedoeld.
- Ontbreekt een screenshot, dan toont de pagina een nette placeholder met de bestandsnaam,
  zodat een vergeten regeneratie zichtbaar is zonder dat de pagina breekt.
- De screenshots (`.png`) gaan mee in git, zodat de gedeploye app ze toont.
- Een latere losse mini-site (voor opdrachtgevers/demo, zonder inlog) kan dezelfde databron en
  dezelfde plaatjes hergebruiken. Daarom staat de inhoud (`handleiding-stappen.ts`) los van de
  weergave.

## Eerste keer of na een afgebroken run

- De generator heeft de monteur-sessie nodig (`e2e/.auth/monteur.json`). De aparte config draait
  daarvoor zelf de `global-setup`, dus `npm run screenshots:handleiding` regelt dit.
- Faalt een onderwerp met een `interactie` (bv. `handtekening-modal`, `spoed-aan`,
  `documenten-blok`) op de selector, controleer de exacte tekst/rol op het echte scherm en pas de
  betreffende tak in `e2e-handleiding/genereer-screenshots.spec.ts` aan. Lukt een betrouwbare
  screenshot niet, zet het onderwerp dan op `nieuw: true` (placeholder) tot het wel kan.

Zie `DESIGN-HANDLEIDING-HERONTWERP.md` voor het huidige ontwerp (de eerste versie staat in
`DESIGN-HANDLEIDING-MONTEUR.md`).
