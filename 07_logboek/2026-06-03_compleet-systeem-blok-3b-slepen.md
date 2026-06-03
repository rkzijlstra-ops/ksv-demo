# Compleet systeem blok 3b: slepen-en-neerzetten op het planbord

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, `PLAN-COMPLEET-3-planbord.md`

## Wat gebouwd is

De sleep-laag op het planbord met dnd-kit (zelfbouw grid, geen agenda-bibliotheek):

- Een opdracht uit de "nog te plannen"-strook naar een cel (monteur + dag) slepen plant hem in
  (concept_gepland, dagblok van 1 dag). Precieze invoer (meer dagen, een tijd) blijft via het
  inplan-formulier.
- Een al geplande kaart naar een andere cel slepen verplaatst hem: tijd en duur blijven, de status
  blijft, en een al verstuurde opdracht krijgt de markering "gewijzigd, nog te versturen".
- Klikken op een kaart navigeert nog gewoon naar de opdracht (sleepdrempel van 6px, dus een klik
  start geen sleep).

## Bouwstenen

- `@dnd-kit/core` + `@dnd-kit/utilities` toegevoegd.
- `POST /api/opdrachten/[id]/verplaatsen` (+ test): wijzigOpdracht met behoud van tijd/duur.
- `src/components/PlanbordGrid.tsx`: client, droppable cellen (`DropCel`) + sleepbare kaarten.
- `src/components/PlanbordPool.tsx`: sleepgreep per pool-opdracht.
- `src/components/PlanbordBord.tsx`: DndContext + DragOverlay, handelt het neerzetten af
  (pool -> /plannen, kaart -> /verplaatsen) en ververst.
- `src/app/planbord/page.tsx`: gebruikt nu PlanbordBord.

## Verificatie

- `npm test`: 312 groen (was 309, +3).
- `npm run build`: slaagt, `/planbord` in de routelijst.
- Lint: nieuwe bestanden schoon (alleen de bekende bestaande NavKnop-error blijft).

## Aandachtspunten

- De drag-interacties zijn lastig automatisch te testen zonder DOM; de endpoints en de plaatsings-
  helpers zijn wel getest. Visuele/handmatige check op het planbord aanbevolen.
- Drag is bedoeld voor de laptop (Ed); sleepdrempel houdt klikken op kaarten werkend.

## Vervolg

Blok 4: echte mail naar monteurs bij versturen (nu doet de verstuur-poort alleen de statussprong).
