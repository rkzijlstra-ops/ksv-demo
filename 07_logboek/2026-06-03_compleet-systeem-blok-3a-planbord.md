# Compleet systeem blok 3a: planbord (weergave + inplannen + versturen)

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, `PLAN-COMPLEET-3-planbord.md`, mockup `agenda-planbord.html`

## Wat gebouwd is

Route `/planbord`: een weekraster met monteurs als rijen en ma t/m vr als kolommen. Montage
toont als brede dagbalk (span = aantal dagen), service als compact kaartje op tijd, in de
statuskleuren (concept gestreept oranje, gepland oranje, bevestigd blauw). Plus weeknavigatie
(vorige/vandaag/volgende), een "nog te plannen"-strook en een verstuur-poort-knop.

Hiermee werkt de hele plan-lus: een binnengekomen opdracht inplannen (monteur, startdatum,
aantal dagen, optionele tijd), op het bord zien verschijnen, en in één klik op "gepland" zetten.

- `src/lib/planbord.ts` (+ test): datum-helpers en plaatsing (montage-span, service-kaart,
  knippen op vrijdag, niet-geplande statussen weg).
- `POST /api/opdrachten/[id]/plannen` (+ test): planOpdracht.
- `POST /api/dashboard/versturen` (+ test): verstuurNaarMonteurs (statussprong; mail volgt blok 4).
- `src/components/PlanbordGrid.tsx`, `PlanbordPool.tsx` (inplan-formulier), `VerstuurKnop.tsx`.
- `src/app/planbord/page.tsx` + navlink op het dashboard.

## Keuzes

- Eén invoermodel: tijd leeg = dagblok (montage), tijd ingevuld = kaartje (service).
- Monteurs afgeleid uit `toegewezen_aan` (nog geen monteurs-tabel; blok 6). Inplannen via vrije
  invoer met datalist van bekende namen.
- Inplannen via formulier; slepen-en-neerzetten is blok 3b (dnd-kit).
- Verstuur-knop doet nu alleen de statussprong; de mail naar monteurs is blok 4.

## Verificatie

- `npm test`: 309 groen (was 289, +20).
- `npm run build`: slaagt, `/planbord` in de routelijst.
- Lint: mijn nieuwe bestanden zijn schoon. De enige lint-error zit in het bestaande `NavKnop.tsx`
  (niet aangeraakt, blokkeert de build niet), apart op te pakken.

## Vervolg

- Blok 3b: slepen-en-neerzetten (dnd-kit).
- Of blok 4: mail naar monteurs bij versturen.
