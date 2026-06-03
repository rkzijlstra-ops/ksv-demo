# Compleet systeem blok 5c: keukenhistorie per referentienummer

Datum: 2026-06-03
Project: KSV demo-app

## Wat gebouwd is

Op de opdrachtgever-detailpagina staat onderaan een sectie "Deze keuken eerder (N)": de eerdere
klussen op dezelfde keuken (zelfde referentienummer), de huidige uitgezonderd. Elke regel toont
datum, type (montage/service), status en monteur, en linkt naar het eigen dossier van die klus.
Zo heeft de opdrachtgever (en straks de monteur) meteen de keukenhistorie bij de hand.

Gevoed door `zoekOpReferentie` (uit blok 0), gefilterd op de huidige opdracht. Alleen getoond als
er een referentienummer is en er eerdere klussen zijn.

## Verificatie

- `npm test`: 334 groen.
- `npm run build`: slaagt. Geen SQL nodig.

## Daarmee is blok 5 compleet

- 5a: eigen opdrachtgever-detailpagina + terug-knop.
- 5b: opleverrapport als inline leesweergave.
- 5c: keukenhistorie per referentienummer.

Volgende: blok 6 (accounts/rollen per monteur en zaak; dan echte monteur-mailadressen en het
afschermen per opdrachtgever). Eventueel later: automatisch eerdere rapporten meesturen op
referentie naar de monteur, "onthoud verzonden plek"-randgevallen, "monteur onderweg".
