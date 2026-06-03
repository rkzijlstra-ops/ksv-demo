# Compleet systeem blok 3c: planbord-polish (uit testfeedback)

Datum: 2026-06-03
Project: KSV demo-app

## Aanleiding

Reinier testte het planbord en gaf feedback: twee opdrachten in één cel overlapten (maar één
zichtbaar), blokken waren niet even groot, je kon een afspraak niet terugslepen naar de pool, en
de stippellijn-betekenis was onduidelijk.

## Opgelost

- **Stapelen i.p.v. overlappen.** Het raster is herbouwd: elke cel (monteur + dag) is nu een
  droppable container met de opdrachten netjes onder elkaar gestapeld. De meerdaagse
  "uitrekkende" balk is losgelaten (botste met stapelen); duur staat nu als tekst ("2 dagen").
- **Uniform formaat.** Alle kaarten hebben hetzelfde formaat (min-hoogte), rustiger beeld.
- **Terugslepen / ontplannen.** De "nog te plannen"-strook is een drop-doel: een afspraak van het
  bord erheen slepen zet hem terug op binnen (planning leeg). Nieuwe db-functie `ontplanOpdracht`
  + endpoint `/api/opdrachten/[id]/ontplannen`.
- **Stippellijn verklaard** (geen codewijziging): gestreept = nog te versturen (concept), vol =
  gepland/bevestigd. Dat is status, niet montage versus service.

## Verificatie

- `npm test`: 315 groen (was 312, +3).
- `npm run build`: slaagt. Geen nieuwe SQL-migratie nodig.

## Bewust uitgesteld naar blok 5

- Klikken op een afspraak gaat nu naar de monteur-opdrachtpagina; de terug-knop daar gaat naar de
  werkpool, niet het dashboard. De opdrachtgever hoort een eigen leesweergave te krijgen met terug
  naar dashboard/planbord. Dat is blok 5 (terugkoppeling + opdrachtgever-detail).

## Vervolg

Blok 4 (mail naar monteurs bij versturen) of blok 5 (opdrachtgever-detail + keukenhistorie).
