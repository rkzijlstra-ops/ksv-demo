# Werk-omschrijving bij zelf-invoer (Part 1 invoer-unificatie)

Datum: 2026-06-14

## Wat
Een vrij-tekstveld "Wat moet er gebeuren?" (typen + spraak) toegevoegd aan de zelf-invoer van een klus.
Voor klussen die een monteur zelf aanmaakt, buiten een aangesloten opdrachtgever om (ad-hoc), als
geheugensteun. Bijvoorbeeld "kasten nastellen".

Dit is stap 1 van de invoer-unificatie. Part 2 (alle dashboard/planbord-invoer naar één gecombineerd
veld) is bewust alleen nog te ontwerpen, niet gebouwd. Zie BRAINSTORM-INVOER-UNIFICATIE.md.

## Belangrijke keuze: NIET in het rapport
Eerst overwogen om de werk-omschrijving als context bovenin het opleverrapport te zetten. Geschrapt na
overleg met Rein: dan moet de monteur er steeds op letten dat de tekst klant-net is, en dat
dichttimmeren met waarschuwingen vervuilt de app (risico op overweldigen). Het veld blijft puur intern.
Klant-zichtbare context kan de monteur kwijt in de meldingen, want die gaan wel in het rapport.

## Levenscyclus (compleet rond gemaakt)
- Invoeren in de zelf-invoer (`OpdrachtAanmaken.tsx`): textarea + `SpraakOpname` (plakt achter elkaar).
- Tonen op de monteur-detailpagina `/opdracht/[id]` (`WerkomschrijvingBlok.tsx`).
- Bewerken op diezelfde pagina (inline, typen + spraak).
- Leeg = subtiele "Werk-omschrijving toevoegen"-knop.

## Auth-detail
De bestaande `PATCH /api/opdrachten/[id]` is kantoor-only (monteur 403). De werk-omschrijving moet de
monteur juist op zijn eigen klus kunnen aanpassen, dus een eigen smalle route
`PATCH /api/opdrachten/[id]/werkomschrijving`: toegewezen monteur (`toegewezen_aan`/`user_id` = self)
of kantoor (rol != monteur). RLS dekt de zichtbaarheid al af.

## Wijzigingen
- `supabase/schema-compleet-19-werkomschrijving.sql` (nieuw, idempotent): kolom `werkomschrijving text`.
- `src/lib/db.ts`: veld op `Melding` + `OpdrachtInput`, in `createOpdracht`, nieuwe `updateWerkomschrijving`.
- `src/app/api/opdrachten/route.ts`: leest + bewaart het veld; telt mee in de leeg-check.
- `src/app/api/opdrachten/[id]/werkomschrijving/route.ts` (nieuw): bewerk-route met rol/eigendom-check.
- `src/components/OpdrachtAanmaken.tsx`: textarea + spraak in de zelf-invoer.
- `src/components/WerkomschrijvingBlok.tsx` (nieuw) + ingehaakt op `/opdracht/[id]`.
- Tests: db.test, opdrachten/route.test, werkomschrijving/route.test, fixtures werkpool/rapport.test;
  e2e in zelf-invoer.spec.ts. Registers TESTDEKKING.md + TOESTANDEN.md bijgewerkt.

## Status / nog door Rein
- Migratie `schema-compleet-19-werkomschrijving.sql` draaien in Supabase.
- `npm run test:e2e` draaien (zelf-invoer.spec) in PowerShell.
- Commit (Rein commit zelf).
586 unit-tests groen, typecheck schoon, lint schoon op de wijzigingen.
