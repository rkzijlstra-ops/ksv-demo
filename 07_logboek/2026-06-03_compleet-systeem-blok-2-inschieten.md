# Compleet systeem blok 2: PDF inschieten gebouwd

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, `PLAN-COMPLEET-2-inschieten.md`

## Wat gebouwd is

De opdrachtgever kan op het dashboard één of meer PDF's slepen of kiezen. Het systeem leest elke
PDF, groepeert op referentienummer (zelfde ref = één opdracht met meerdere documenten,
verschillende refs = aparte opdrachten, geen ref = eigen opdracht met aandacht-markering) en maakt
de opdrachten aan. Daarna een samenvatting ("2 opdrachten uit 3 documenten") en het dashboard
ververst meteen.

- `src/lib/inschiet-groep.ts` (+ test): `groepeerOpRef`.
- `src/app/api/dashboard/inschieten/route.ts` (+ test): parse -> groepeer -> aanmaken -> samenvatting.
- `src/components/InschietZone.tsx`: sleep/kies-zone met voortgang en samenvatting.
- `src/app/dashboard/page.tsx`: InschietZone tussen header en lijst.

## Aangepast onderweg

`vitest.config.ts`: de `@`-alias toegevoegd. Bestaande tests vielen daar nooit over omdat ze hun
`@/`-imports mockten of als type importeerden; de inschiet-route importeert de echte
`groepeerOpRef` via `@/`, en die werd niet gevonden. Alias hoort er sowieso te staan.

## Verificatie

- `npm test`: 289 groen (was 279, +10).
- `npm run build`: slaagt, `/api/dashboard/inschieten` en `/dashboard` in de routelijst.

## Niet in dit blok (bewust, vervolg)

- Interactieve review/bevestig-stap vóór aanmaken (blok 2b).
- Handmatig invoeren zonder PDF op het dashboard (bestaat al via /api/opdrachten).

## Vervolg

Blok 3: planbord (zelfbouw grid + dnd-kit), zodat opdrachten van binnen naar gepland kunnen.
