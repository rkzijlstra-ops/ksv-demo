# Plan Part 1: werk-omschrijving-veld (zelf-invoer)

Volgorde: TDD per taak (test eerst rood, dan code groen). Rein draait de migratie en de e2e zelf.

## STATUS NA BOUW (2026-06-14)
Alle code-taken klaar en groen: 586 unit-tests, typecheck schoon, lint schoon op de wijzigingen.
- Taak 1 (migratie): bestand klaar, **Rein draait hem in Supabase**.
- Taak 2 t/m 7, 9: afgevinkt (code + tests groen).
- Taak 8 (e2e): spec geschreven (`zelf-invoer.spec.ts`), **Rein draait `npm run test:e2e` zelf** (PowerShell).

## Taak 1: migratie nieuwe kolom
- Bestand: `supabase/schema-compleet-19-werkomschrijving.sql` (nieuw)
- Code: `alter table meldingen add column if not exists werkomschrijving text;` (idempotent)
- Verifiëren: Rein draait 'm in Supabase; geen fout.
- Tijd: 2 min — Status: open

## Taak 2: db-laag — type + createOpdracht
- Bestand: `src/lib/db.ts`, test `src/lib/db.test.ts`
- Test eerst: `createOpdracht` met `werkomschrijving` → `insert` bevat `werkomschrijving`.
- Code: `werkomschrijving` toevoegen aan interface `Melding` en `OpdrachtInput`; meenemen in `createOpdracht`-insert (`?? null`).
- Verifiëren: `npm run test` groen.
- Tijd: 5 min — Status: open

## Taak 3: db-laag — updateWerkomschrijving
- Bestand: `src/lib/db.ts`, test `src/lib/db.test.ts`
- Test eerst: `updateWerkomschrijving(id, "kasten nastellen")` → `update({ werkomschrijving })` op juiste `id`.
- Code: functie `updateWerkomschrijving(id, tekst: string | null)` + in de Db-interface.
- Verifiëren: `npm run test` groen.
- Tijd: 4 min — Status: open

## Taak 4: API POST /api/opdrachten slaat veld op
- Bestand: `src/app/api/opdrachten/route.ts` (+ evt. test)
- Test eerst: POST met `werkomschrijving` in formData → kop bevat het; `heeftVeld`/leeg-check telt het mee.
- Code: `werkomschrijving` uit formData lezen, in `kop` zetten (beide takken), opnemen in de leeg-check.
- Verifiëren: test groen.
- Tijd: 5 min — Status: open

## Taak 5: zelf-invoer UI (typen + spraak)
- Bestand: `src/components/OpdrachtAanmaken.tsx`
- Code: state `werkomschrijving`; textarea "Wat moet er gebeuren?" + `SpraakOpname` eronder (plakt achter bestaande tekst); meesturen in FormData; meenemen in client-`heeftIets`-check; resetten bij `reset()`.
- Verifiëren: build groen; handmatig in dev: typen + inspreken vult het veld.
- Tijd: 5 min — Status: open

## Taak 6: PATCH-route werkomschrijving (monteur-eigen + kantoor)
- Bestand: `src/app/api/opdrachten/[id]/werkomschrijving/route.ts` (nieuw), test ernaast
- Test eerst: toegewezen monteur mag (200, `updateWerkomschrijving` aangeroepen); vreemde monteur geweigerd (403); niet-ingelogd 401.
- Code: PATCH; auth = `toegewezen_aan === userId || user_id === userId` óf rol != monteur (kantoor); roept `updateWerkomschrijving`.
- Verifiëren: route-test groen.
- Tijd: 5 min — Status: open

## Taak 7: detailpagina — tonen + inline bewerken
- Bestand: `src/components/WerkomschrijvingBlok.tsx` (nieuw, client), gebruikt in `src/app/opdracht/[id]/page.tsx`
- Code: toont de tekst; knop "Bewerken" opent textarea + `SpraakOpname`; opslaan PATCH't naar de route, `router.refresh()`. Leeg = subtiele "Werk-omschrijving toevoegen"-knop.
- Verifiëren: build groen; handmatig: tonen, bewerken, leeg-staat.
- Tijd: 5 min — Status: open

## Taak 8: e2e (schrijven; Rein draait)
- Bestand: `e2e/werkomschrijving.spec.ts` (nieuw)
- Code: zelf-invoer met werk-omschrijving → detailpagina toont → bewerken wijzigt.
- Verifiëren: Rein draait `npm run test:e2e` zelf (PowerShell).
- Tijd: 5 min — Status: open

## Taak 9: registers + afronding
- Bestand: `TESTDEKKING.md`, `TOESTANDEN.md`
- Code: regel(s) voor werk-omschrijving (lagen + bestanden); toestandsmatrix-rij.
- Verifiëren: `npm run test` + lint groen; logboek-entry in `07_logboek/`.
- Tijd: 5 min — Status: open
