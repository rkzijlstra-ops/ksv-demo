# Invoer-unificatie Part 2: backend-fundament gebouwd

Datum: 2026-06-14

## Wat
Eerste bouw-stretch van Part 2 (zie `DESIGN-INVOER-UNIFICATIE-2.md` + `PLAN-INVOER-UNIFICATIE-2.md`),
autonoom, test-eerst. Bewust alleen de **verifieerbare backend/logica-blokken** gebouwd; de UI-blokken
zijn niet blind gebouwd omdat ze e2e-verificatie nodig hebben (die draait Rein, mijn shell laat anders
zombie next-dev-servers achter).

## Gebouwd + geverifieerd (tsc schoon, 611 unit-tests groen, lint schoon)
- **Blok 0 — parser leest ook een foto.** `buildOrderContent(file, mediaType, instruction)` (puur,
  getest) bouwt een document-block (PDF) of image-block (foto), valt terug op PDF. `createParser`
  accepteert nu `(file, mediaType?)`; nieuwe `parseOrderWithClaude`, `parsePdfWithClaude` blijft als
  alias. De parse-endpoint (`/api/opdrachten`, actie=parse + create-uit-document) accepteert nu PDF
  én foto. Bestaande route-tests bijgewerkt op het nieuwe gedrag (foto van een order wordt gelezen).
- **Blok 1 — pure logica.** `order-samenvoegen.ts`: `voegSamen` (vul lege velden, laat gelijke met
  rust, botsing bij verschil zonder te overschrijven), `voegMeldingenSamen` (aanvullen), `andereReferentie`
  (waarschuwing). `invoer-bestemming.ts`: `bestemmingVoor(rol, profiel, gekozenZaak)` → monteur naar
  eigen werkpool (ad-hoc), kantoor naar zaak/te-plannen.
- **Blok 6 — twee gaten dicht.** Gat A: een gegevens-PATCH op een al-verstuurde klus (gepland/bevestigd)
  zet `gewijzigd_te_versturen` (zelfde mechaniek als planning), via `moetOpnieuwVersturen`. Gat B: een
  opgeleverde/geannuleerde klus geeft 409 op bewerken.
- **Blok 3.3 (backend).** `OpdrachtGegevensInput` + `updateOpdrachtGegevens` + PATCH-route accepteren nu
  ook e-mail/adviseur/leverweek/werkomschrijving, en schrijven die alleen als ze meegestuurd zijn (geen
  stil leegmaken). `Db`-interface-signature ook bijgewerkt (anders tsc-fout).

## Bestanden
Nieuw: `src/lib/order-samenvoegen.ts`(+test), `src/lib/invoer-bestemming.ts`(+test),
`src/app/api/opdrachten/[id]/route.test.ts` (uitgebreid). Gewijzigd: `src/lib/claude-client.ts`(+test),
`src/lib/db.ts`, `src/app/api/opdrachten/route.ts`(+test), `src/app/api/opdrachten/[id]/route.ts`.

## Nog te doen (UI + wiring, met de app draaiend voor e2e)
`KlusInvoer`-component (blok 2), dashboard "Nieuwe klus" + rol-bewuste create (3.1/3.2),
`OpdrachtBewerken` → component (3.3 UI), inbound gladtrekken (blok 4, `inbound.ts` niet aanraken),
monteur-wiring (blok 5), opruimen `InschietZone` (blok 7). Statusoverzicht boven in het PLAN-bestand.

## Niet gecommit
Wijzigingen staan klaar in de werkboom; Rein commit zelf (specifieke `git add` per bestand).
