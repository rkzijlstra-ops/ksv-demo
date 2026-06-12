# Handleiding voor monteurs (in-app, auto-screenshots)

Datum: 2026-06-12

## Wat

Een handleiding voor monteurs in de app zelf, op `/handleiding`, bereikbaar via een knop in het
gebruikersmenu. De pagina toont de kerntaak in zes stappen (werkpool, klus openen, melding
toevoegen, opleveren, handtekening, versturen), elk met een screenshot van het echte scherm en
uitleg eronder.

## Waarom zo

- **Vorm: in de app** (niet een PDF of losse mini-site), zodat de monteur de uitleg met een tik
  bij de hand heeft op zijn telefoon, altijd actueel, ook offline (PWA).
- **Screenshots automatisch**, via een Playwright-generator. Bij een appwijziging draai je een
  commando en zijn alle plaatjes weer vers. Handmatig bijwerken loopt altijd achter.
- **Tegen de test-database** met een vaste nep-opdracht (Fam. Jansen), zodat er nooit een echte
  klant op een screenshot staat.

## Drie losse delen

1. `src/lib/handleiding-stappen.ts` - de inhoud (stappen: titel, uitleg, bestand, route). Eén
   bron van waarheid, puur data.
2. `e2e-handleiding/genereer-screenshots.spec.ts` + `playwright.handleiding.config.ts` - de
   generator (eigen config, eigen testmap, draait niet mee met de gewone e2e).
3. `src/app/handleiding/page.tsx` - de weergave. Toont een placeholder als een plaatje nog
   ontbreekt, zodat de pagina nooit breekt.

Omdat de inhoud losstaat van de weergave, kan een latere deelbare mini-site (optie 3, voor
opdrachtgevers/demo zonder inlog) dezelfde databron en plaatjes hergebruiken. Die optie is bewust
opengehouden, maar nog niet gebouwd.

## Scope versie 1

Alleen de kerntaak van de monteur, screenshot plus tekst, geen pijlen of animaties. Later
uitbreidbaar met meer schermen (profiel, melding bewerken, rapport) en eventueel korte animaties
voor de lastigste handelingen.

## Stand van zaken / open

- Code gebouwd via subagent-gedreven ontwikkeling, twee-traps review per taak. Unit-test (databron)
  groen, typecheck schoon.
- Nog te doen door Rein in PowerShell: de e2e-test draaien (`npx playwright test
  e2e/handleiding.spec.ts`) en de screenshots genereren (`npm run screenshots:handleiding`),
  daarna de PNG's committen.
- Kleine afwijking t.o.v. het plan: `documenttype` van de demo-opdracht is `werkbon_service` (een
  geldige waarde), niet het in het plan genoemde `werkbon_montage` (bestaat niet in de codebase).

Zie `DESIGN-HANDLEIDING-MONTEUR.md`, `PLAN-HANDLEIDING-MONTEUR.md` en `HANDLEIDING-ONDERHOUD.md`.
