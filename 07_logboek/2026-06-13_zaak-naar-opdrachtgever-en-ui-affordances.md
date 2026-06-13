# "Zaak" naar "opdrachtgever", stap 4-tekst en UI-affordances

Datum: 2026-06-13

Feedback van Rein, in één ronde doorgevoerd.

## Tekst

- **Handleiding stap 4:** video wordt nu genoemd en het staat er expliciet bij dat alles optioneel is. Zonder dat dachten eerste gebruikers dat alles moet, wat weerstand geeft.
- **"Voltooid + rapport"** (handleiding stap 4 + keuzescherm in de app): beschrijving is nu "Volledige oplevering, optioneel met foto, video en handtekening". Bewust alleen de tekst, geen herindeling van het keuzescherm.
- **"zaak" -> "opdrachtgever"** overal in zichtbare tekst, want "zaak" vond Rein niet netjes klinken. Plekken: versturen-flow ("Naar de opdrachtgever", "Stuur naar opdrachtgever", "Het rapport is naar de opdrachtgever verstuurd"), activiteit/logboek ("Goedgekeurd door de opdrachtgever", "Rapport verstuurd naar de opdrachtgever"), interne notitie ("alleen voor de opdrachtgever"), twee API-foutmeldingen, het INTERN-label in het PDF-rapport, en handleiding stap 6. Code (state-keys "zaak", `keukenzaak`, comments) ongemoeid. Het rolwoord "opdrachtgever" was er al; "zaak" als los woord is nu weg uit de UI.

## UI-affordances

- **Accountmenu:** onder de inlog-initiaal staat nu een hamburger-icoon, zodat zichtbaar is dat het vakje een menu opent (`UserMenu.tsx`).
- **Werkpool:** "Of: klus zonder document" was een tekstlink (`hover:underline`), oogde niet klikbaar. Nu een knop met gestreepte rand, in lijn met de andere toevoeg-zones (`OpdrachtAanmaken.tsx`).

## Overig

- Handleiding-screenshots ververst (01, 04, 06 inhoudelijk; 02/03 door de datum-stempel). Eén e2e-assertie op de versturen-knoppen meegetrokken (mail + verzending spec).
- Onderweg een achtergebleven dev-server op poort 3001 opgeruimd (de screenshot-config gebruikt `reuseExistingServer: true`, dus Playwright laat de server staan).

## Verificatie

tsc schoon, 558 unit-tests groen, CI volledig groen (incl. e2e). Tekst-only + UI-styling, geen schema-wijziging, geen migratie.
