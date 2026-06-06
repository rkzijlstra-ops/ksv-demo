# Testdekking (levend register)

Per feature/flow welke testlagen en welk(e) testbestand(en) hem dekken. Werk dit bij in dezelfde
commit als elke nieuwe feature of wijziging (afrond-check uit de skill projectstart-discipline).
Dit is het overzicht; de testbestanden zelf zijn de uitvoering. Laatst bijgewerkt: 2026-06-06.

Lagen: **U** = unit (vitest, gemockt), **I** = integratie (test-DB), **E** = browser-e2e (Playwright),
**M** = e2e-mail (echt versturen achter `E2E_MAIL=1`).

## Kern-flows (opdrachtgever / kantoor)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Inschieten PDF, parsing, groepering op referentie | U, E | parser-schema.test, claude-client.test, opdrachtgever.spec | groen |
| Dashboard + "Te doen"-overzicht + statusfilter | U | te-doen.test, dashboard-scope.test, dashboard-lijst | groen |
| Planbord plaatsing/lanes/dubbele boeking | U | planbord.test | groen |
| Planbord drag-drop: plannen, verplaatsen, week schuiven | E | planbord.spec, planbord-extra.spec | groen |
| Ontplannen (terug naar pool) + mail bij verstuurd/bevestigd | U, M | ontplannen/route.test, ontplan-mail.test, mail-flows.spec | groen |
| Ontplannen: bevestigingsdialoog op het planbord (drag-naar-pool, Nee/Ja) | E | planbord-ontplannen.spec | groen |
| Versturen naar monteurs (verstuur-poort, gebundeld) | U, M | monteur-mail.test, mail-opdracht.spec | groen |
| Annuleren + mail naar monteur bij verstuurd | U, E, M | annuleren/route.test, annuleren.spec, mail-flows.spec | groen |
| Gebruikersbeheer, rollen, uitnodigen/afmelden | U, M | mail-flows.spec (uitnodiging/afmelding) | grotendeels |

## Kern-flows (monteur / PWA)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Werkpool: alleen eigen klussen (RLS), toegang afgeschermd | E | monteur.spec | groen |
| Bevestigen op de detailpagina | E | bevestigen.spec | groen |
| Bevestigen vanaf de werkpool-kaart (badge + snelknop, geen navigatie) | U, E | urgentie.test (bevestigBadgeConfig), bevestigen.spec | groen |
| Melding toevoegen (incl. spoed) + spoed-mail | U, M | mail-flows.spec (spoed) | grotendeels |
| Oplevering: foto-upload + handtekening-canvas + opmerking als concept (saves geserialiseerd) | U, E | rapport.test, opleveren.spec | groen |
| Rapport genereren + mailen, status opgeleverd | U, M | mail.spec | groen |
| PWA / offline-gedrag | E | monteur-pwa.spec | groen |

## Bekende gaten (eerlijk, nog te dekken)

- Geen openstaande functionele gaten meer. (De eerdere race in de concept-opslag van de oplevering is
  gedicht: de saves zijn geserialiseerd in OpleverFlow; opleveren.spec bewaakt dit met snelle stappen.)
- Component-test-laag (jsdom/RTL) bestaat niet; UI-gedrag hoort daarom in de Playwright-e2e.

## Hoe draaien

- `npm test` — alle unit/route (laag U), snel, geen browser.
- `npm run test:e2e` — Playwright (laag E), tegen de test-DB via `.env.test`.
- `npm run test:mail` — e2e-mail (laag M), verstuurt echt naar de test-mailbox.
- `npm run test:all` — U + I + E in één keer.
