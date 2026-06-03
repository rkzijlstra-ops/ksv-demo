# Compleet systeem blok 5b: opleverrapport als leesweergave

Datum: 2026-06-03
Project: KSV demo-app

## Wat gebouwd is

Op de opdrachtgever-detailpagina (`/dashboard/opdracht/[id]`) staat nu het volledige
opleverrapport inline, niet meer alleen een PDF-link:

- Eindstaat-foto's in een galerij (klikbaar voor groot), met aantal.
- Video van de oplevering als link (indien aanwezig).
- Opmerking van de monteur.
- Handtekening van de klant als afbeelding.
- Link naar de PDF blijft rechtsboven in de rapportkop.
- Meldingen van de monteur tonen nu hun foto's (galerij) en een rode Spoed-markering.

Hergebruik van `FotoGalerij`. `getOpleveringVoorOpdracht` levert de rapportdata.

## Verificatie

- `npm test`: 334 groen.
- `npm run build`: slaagt. Geen SQL nodig.

## Nog open in blok 5

- 5c: keukenhistorie per referentienummer (eerdere klussen op dezelfde keuken, nieuwste eerst).
