# Handleiding voor monteurs - onderhoud

De handleiding zit in de app op `/handleiding` (menu-knop "Handleiding"). Drie losse delen:

1. **De teksten** staan in `src/lib/handleiding-stappen.ts`. Een zin aanpassen of een stap
   toevoegen doe je daar. Een nieuwe stap = een nieuw object met `bestand`, `titel`, `uitleg`,
   `route` (en eventueel `interactie`).
2. **De screenshots** staan in `public/handleiding/`. Die maak je niet met de hand, maar met
   de generator.
3. **De pagina** (`src/app/handleiding/page.tsx`) toont alles automatisch.

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
- Faalt stap 05 (handtekening) op de knop-selector, controleer de exacte knoptekst op de
  oplever-pagina en pas de regex `name: /handtekening/i` in
  `e2e-handleiding/genereer-screenshots.spec.ts` aan.

Zie `DESIGN-HANDLEIDING-MONTEUR.md` voor het ontwerp en `PLAN-HANDLEIDING-MONTEUR.md` voor het
bouwplan.
