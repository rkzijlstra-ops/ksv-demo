# Rapport: geautomatiseerd testen (autonome sessie)

Datum: 2026-06-05
Door: Claude Code, met volmacht van Reinier om zelf te beslissen (meest waarschijnlijke keuze),
testen, repareren en hertesten. Dit rapport legt de beslissingen vast zodat we achteraf kunnen
bijsturen.

## Uitkomst in het kort

- **Gevonden en gerepareerd: 1 echte bug** (ontplannen liet de monteur-toewijzing staan).
- **10 integratie-scenario's groen** tegen de echte test-database.
- **395 unit-tests groen**, build slaagt.
- Test-database **schoon achtergelaten** (0 opdrachten/documenten/opleveringen).
- Alles gecommit en gepusht. De bug-fix is code-only (geen migratie), staat dus live.

## De bug die eruit kwam

`ontplanOpdracht` (klus terugslepen naar de pool) zette de status op "binnen" en wiste de planning,
maar liet **`toegewezen_aan`** staan. Sinds blok 6d filtert de werkpool op `toegewezen_aan` (en RLS
doet dat ook), dus een ontplande klus bleef in de oplever-app van die monteur hangen, terwijl hij op
het planbord weer in de pool stond. Inconsistent. **Fix:** ontplannen wist nu ook `toegewezen_aan`
en `verzonden_toegewezen_aan`. Regressie-test toegevoegd (unit + integratie).

## Wat is getest (10 scenario's, echte db-laag)

1. Volume: 7 monteurs, 14 montages over een week. Dashboard toont alle 14; werkpool per monteur klopt.
2. Zaak-scheiding: een ad-hoc/KKS-klus staat in de werkpool van de monteur, niet op het dashboard.
3. Verzonden-plek op account (bevinding 3): zelfde plek = niet opnieuw versturen; gelijknamige andere
   monteur op dezelfde plek = wel opnieuw.
4. Annuleren: status geannuleerd, niet meer actief.
5. Status-flow + ontplannen: concept_gepland -> gepland -> bevestigd -> ontplannen (hier kwam de bug).
6. Vervolgservice: tweede klus op dezelfde referentie krijgt het rapport van de eerste mee.
7. Dubbele-boeking: twee montages zelfde monteur/dag worden gevonden.
8. Service-tijden: twee services zelfde dag, andere tijd = GEEN vals conflict.
9. Herverdelen: verplaatsen naar een andere monteur verhuist de klus tussen de werkpools.
10. Soft-delete: een verwijderde opdracht verdwijnt uit dashboard en werkpool.

## Beslissingen die ik nam (en waarom)

- **Tegen de bestaande test-database, niet een nieuw project.** Reinier zei dat alles wegwerp is en
  een apart test-project pas nodig is als Ed live is. De database wordt voor en na de test geleegd.
- **Data-laag getest via `createDb` (service-role), niet de HTTP-routes.** De routes draaien op de
  ingelogde-gebruiker-sessie (cookies), wat zonder draaiende server + auth-flow lastig na te bootsen
  is. De route-orkestratie is gedekt met unit-tests (mocks); de echte db-queries en pure helpers zijn
  nu ook tegen echt Postgres getest. Afweging: dit vindt data-/logica-bugs (zoals de ontplan-bug),
  maar test de HTTP-laag niet end-to-end.
- **RLS niet automatisch getest.** Een echte sessie voor een monteur minten (zonder wachtwoord/Google)
  is met de Supabase-client lastig. RLS is eerder wel live geverifieerd (de monteur zag alleen zijn
  eigen klus). Een sessie-gebaseerde RLS-test is een vervolgstap.
- **Geen mail verstuurd.** Ik test de pure mail-helpers (afsluiter, historie), niet de Resend-routes.
  Zo wordt er niemand gemaild. Bewuste keuze gezien het geverifieerde domein.
- **Losse monteur-uuids i.p.v. 7 echte accounts aanmaken.** `toegewezen_aan` blijkt geen
  foreign key te hebben, dus arbitraire uuids volstaan voor de data-logica. Scheelt accounts aanmaken
  en opruimen, en voorkomt verweesde testaccounts. `user_id` is wel NOT NULL met auth-koppeling, dus
  daarvoor gebruik ik het echte beheerder-account als seed.
- **Aparte vitest-config** (`vitest.integration.config.ts`) zodat `npm test` nooit de database raakt.
  Het harnas draai je bewust met `npx vitest run --config vitest.integration.config.ts`.

## Wat NIET gedekt is (voor jou om te sturen)

- **RLS automatisch** (sessie-gebaseerd) — wel eerder handmatig geverifieerd.
- **Browser-e2e met Playwright**: het echte slepen op het planbord en het gevoel van de monteur-PWA.
  Dat is de logische volgende testlaag als je het wilt.
- **HTTP-routes end-to-end** met een draaiende server (nu via unit-mocks + data-laag-integratie).
- Eerder genoteerde open punten: monteur-beschikbaarheid, "monteur onderweg", bevinding 4 (ruime
  INSERT-policy) en 5 (monteurloze verstuur-markering).

## Mijn advies voor de volgende stap

De data-logica is nu solide en regressie-gedekt. De grootste resterende blinde vlek is de
**browser-kant (slepen, PWA)**. Als je daar zekerheid over wilt, is Playwright de volgende investering.
Anders zou ik zeggen: dit is een goed moment om met een echte testmonteur de happy-path in de browser
te lopen, want de data eronder is nu getest.
