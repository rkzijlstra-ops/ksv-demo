# Bevestigen + annuleren afgebouwd, en de les uit het testgat

## Wat er gebeurde
Reinier liep bij handmatig testen tegen twee dingen aan:
1. Twee op rk geplande+verstuurde klussen leken niet in rk's werkpool te staan. Na reproductie:
   de **code klopt** (data toegewezen aan rk, zichtbaar onder rk's RLS-sessie, op productie
   gereproduceerd). Het was een **verouderde staat op het apparaat**, geen codefout. De
   service-worker is network-first voor de werkpool, dus online altijd vers.
2. De monteur kon de **ontvangst niet bevestigen**, terwijl de opdracht-mail dat wél opdraagt.

Daarbovenop: mijn integratie-test (`test:int`) wist de hele `meldingen`-tabel, en die draaide ik op
de gedeelde (productie-)database terwijl Reinier er net data in had. Precies het risico waarvoor het
zijspoor bestaat. Daarna afspraak: `test:int` niet meer op een database met echte data.

## De echte bug: ontbrekende tegenhangers
Een sweep over alle DB-functies die nergens aan een route/knop hingen, gaf:
- **bevestigOntvangst** — bestond, maar geen route en geen knop. De monteur kon dus niet bevestigen.
- **annuleerOpdracht** — bestond, maar geen route en geen knop. Annuleren kon niet.
- `getMeldingen` (dode code, vervangen door `getWerkpoolVoor`) en `updateMeldingStatus` (restant):
  opruimen, geen functioneel gat.

Beide gaten afgebouwd:
- **Bevestigen:** POST `/api/opdrachten/[id]/bevestigen` + `BevestigOntvangstKnop` op de
  monteur-detailpagina (zichtbaar bij status gepland; daarna "Ontvangst bevestigd").
- **Annuleren:** POST `/api/opdrachten/[id]/annuleren` (alleen kantoor) + `AnnuleerKnop` (twee-staps)
  op de dashboard-detailpagina. Was de klus al verstuurd, dan volgt **automatisch een annuleer-mail
  naar de monteur** (best-effort).

## Testuitbreiding (voor aankomende testen)
- Unit: `annuleer-mail`, de bevestig- en annuleer-routes.
- e2e: `bevestigen.spec` (monteur bevestigt), `annuleren.spec` (kantoor annuleert, niet-verstuurde
  klus zodat de reguliere run niet mailt).
- E2E_MAIL: annuleer-mail end-to-end in `mail-flows.spec`.

## De les
Niet alleen de losse functies testen, maar de **volledige gebruikersreis** nalopen: mail ontvangen →
bevestigen → werken → opleveren → (annuleren). Een mail die een actie belóóft ("bevestig in de app"),
betekent dat die actie moet bestaan én getest is. Vastgelegd in de discipline-skill (volledigheids-
check / teststrategie) en in het geheugen.
