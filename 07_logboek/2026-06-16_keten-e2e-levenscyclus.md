# Keten-e2e levenscyclus + audit (2026-06-16)

Autonome run (Rein sliep, opdracht: bouw + test + documenteer, neem logische beslissingen zelf).

## Aanleiding
Rein wilde de hele klus-levenscyclus scenario voor scenario doorlopen en checken: klopt de status
overal na een actie, gaan de juiste mails/SMS uit, wordt het naar de monteur doorgestuurd. Eerst is
er een testdekkings-audit gedaan (toestandsmatrix langs de échte testbestanden, niet alleen de docs).

## Audit-uitkomst
De levenscyclus was al breed gedekt (status, mail-toon, SMS-toon per overgang, beide rollen). Echte
gaten:
1. Geen enkele e2e draaide de HELE keten in één doorloop (alles per-overgang).
2. Verzet/wissel hadden geen UI-e2e (alleen unit).
3. Cron-herinnering: selectie (I) en verzending (U) los getest, maar de cron-route die ze aaneenrijgt
   had geen eigen test.
4. Werkpool-geheugensteun "rapport naar zaak nog versturen" (monteur) niet gebouwd.
5. Doc-achterstand: privacy-gate en verzend-flow waren inmiddels wél door verzending.spec gedekt.

## Gebouwd (PR #11, branch feature/levenscyclus-e2e)
- **e2e/levenscyclus.spec.ts** — de hele happy-path in één doorloop, cross-rol (twee browsercontexten:
  beheerder + monteur), met status-check bij elke overgang: inschieten (UI "Nieuwe klus") →
  plannen → versturen → monteur bevestigt (UI) → opleveren → kantoor ziet het opleverrapport (UI).
- **e2e/verzet-wissel.spec.ts** — monteur-UI na verzet (nieuwe datum → "Te bevestigen", oude datum weg)
  en na wissel (klus uit de werkpool van de eerste monteur na opnieuw versturen).
- **src/app/api/cron/bevestig-herinneringen/route.test.ts** — auth (CRON_SECRET), bundeling per
  monteur, markeren als verzonden, klussen zonder monteur overgeslagen.

## Bewuste keuzes (autonoom genomen)
- **Mail-triggerende stappen in de keten via de db-laag, niet de UI.** Versturen/zaak-rapport mailen
  echt; in de gewone CI-run wil je dat niet. Dezelfde db-functies die de routes ná een geslaagde mail
  aanroepen, drijven hier de overgang. De mail/SMS-toon is al unit-gedekt; echt versturen zit in de
  M-laag (E2E_MAIL). Zo blijft de keten-e2e snel en stuurt CI geen echte berichten.
- **Foto/handtekening-opleveren via db-concept in de keten.** Die UI is al door opleveren.spec gedekt;
  in de keten zou het alleen flakiness toevoegen. De keten test de cross-rol status-propagatie.
- **Inschieten, bevestigen en de dashboard-eindcontrole gaan wél via de echte UI** (de cross-rol-handoffs).
- **Gat 4 (geheugensteun-feature) NIET gebouwd.** Dat is een nieuwe UI-feature met ontwerpkeuzes, geen
  test; niet iets om ongezien 's nachts te bouwen. Staat als aanbevolen volgende stap.

## Resultaat
Lokaal groen: tsc, 661 unit-tests (incl. cron-route-test). In CI groen: 661 unit, 15 integratie,
build, en 78 e2e — inclusief levenscyclus.spec (1 doorloop, 7,4s) en verzet-wissel.spec (beide). Eerste
poging groen, geen iteratie nodig. PR #11 staat klaar voor merge.

## Nog open (aanbevolen volgende stap)
- Werkpool-geheugensteun voor de monteur: "rapport naar zaak nog versturen" (privé). Vereist een
  ontwerpkeuze over plek/vorm; daarom met Rein bespreken voor bouwen.
- Optioneel: bij "bevestigen" krijgt kantoor bewust geen actieve melding (ontwerpkeuze, geen gat).
