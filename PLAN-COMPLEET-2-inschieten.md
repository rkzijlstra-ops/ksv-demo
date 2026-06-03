# Plan blok 2: PDF inschieten (dashboard)

Datum: 2026-06-03
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (functielijst Dashboard: inschieten + groeperen op ref)
Bouwt op: blok 0 (createOpdracht, datamodel) en de bestaande PDF-parser (`parsePdfWithClaude`).

## Aanpak
Eerst parsen, dan groeperen op referentienummer, dan per groep een opdracht aanmaken.
Groeperen op ref is deterministisch en veilig (een ref hoort bij één keuken). De interactieve
"bevestig de groepering vóór aanmaken"-stap is een latere verfijning (blok 2b); ontbrekende
refs vallen op via de aandacht-markering die het dashboard al toont.

## Taken
- B2-1 `src/lib/inschiet-groep.ts` (+ test): `groepeerOpRef` (zelfde ref samen, geen ref apart +
  aandacht-vlag, volgorde = eerste voorkomen).
- B2-2 `src/app/api/dashboard/inschieten/route.ts` (+ test): parse elke PDF, groepeer, maak per
  groep een opdracht met documenten, geef een samenvatting terug. Alias `@` toegevoegd aan
  vitest.config zodat echte (niet-gemockte) `@/`-imports in tests resolven.
- B2-3 `src/components/InschietZone.tsx`: sleep/kies PDF's, voortgang, samenvatting met
  aandacht-markering; `router.refresh()` zodat het dashboard meteen bijwerkt. In de dashboard-pagina.
- B2-4 build/test groen, logboek, commit.

## Niet in dit blok (bewust)
- Interactieve review/bevestig-stap vóór aanmaken (blok 2b).
- Handmatig invoeren zonder PDF op het dashboard (bestaat al monteur-zijde via /api/opdrachten).
- Pre-parsed kop doorgeven om dubbel parsen te voorkomen (niet nodig: nu wordt elk bestand één keer geparsed).
