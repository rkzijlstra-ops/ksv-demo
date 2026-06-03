# Compleet systeem blok 3d: planbord met lanes (uitrekken + gelijke hoogte)

Datum: 2026-06-03
Project: KSV demo-app

## Aanleiding

Vervolg op testfeedback. Correctie op blok 3c: het uitrekken van meerdaagse montages was juist
gewenst (in 3c per ongeluk losgelaten). Het echte probleem was ongelijke hoogte door meer/minder
tekst. En de overlap bij twee opdrachten op dezelfde dag moest weg.

## Opgelost

- **Uitrekken terug + geen overlap via lanes.** Elke monteur-rij is verdeeld in "lanes"
  (sub-rijen). Meerdaagse montages rekken weer uit over de dagen (kolom-span), en wat op dezelfde
  dag(en) valt komt in aparte lanes onder elkaar, dus geen overlap meer. Pure helper
  `verdeelLanes` (greedy interval-partitionering), met tests.
- **Gelijke hoogte.** Alle kaarten/balken hebben nu een vaste hoogte met afgekapte tekst, zodat
  het beeld rustig en uniform is ongeacht de inhoud.

## Over de stippellijn (punt 4)

Geen bug: gestreept = status `concept_gepland` (nog te versturen), vol = gepland/bevestigd
(al verstuurd). Wie op "Verstuur naar monteurs" drukt, zet alle gestreepte ineens op vol; een
daarna ingeplande opdracht is dan de enige gestreepte. De "te versturen"-tekst op de kaart
maakt het expliciet.

## Verificatie

- `npm test`: 319 groen (was 315, +4).
- `npm run build`: slaagt. Geen SQL-migratie nodig.

## Vervolg

Blok 4 (mail) of blok 5 (opdrachtgever-detail + keukenhistorie, lost ook de terug-naar-dashboard op).
