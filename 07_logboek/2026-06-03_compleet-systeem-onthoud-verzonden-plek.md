# Compleet systeem: onthoud de verzonden plek (gewijzigd-markering opheffen)

Datum: 2026-06-03
Project: KSV demo-app

## Aanleiding (Reinier-vraag 3)

Een verstuurde opdracht die je verplaatst wordt "gewijzigd, nog te versturen". Maar als je hem
exact terugzet op de plek waar hij stond toen hij verstuurd werd, bleef hij ten onrechte
"gewijzigd". De app onthield de verzonden plek niet.

## Opgelost

Bij het versturen onthoudt het systeem nu de plek (monteur + dag + tijd). Verplaats je een
opdracht en zet je hem exact terug op die verzonden plek, dan vervalt de gewijzigd-markering
weer. Elke andere plek = wel gewijzigd.

- Migratie `supabase/schema-compleet-4-verzonden.sql`: kolommen `verzonden_monteur`,
  `verzonden_startdatum`, `verzonden_starttijd`.
- Pure helper `opVerzondenPlek` (TDD; tijd op HH:MM vergeleken).
- `db.markeerVerzonden(id, plek)` (vervangt verstuurNaarMonteurs): status gepland, gewijzigd uit,
  verzonden plek opgeslagen. `wijzigOpdracht` krijgt de verzonden plek mee en zet gewijzigd alleen
  als de opdracht al verstuurd was én niet terug op die plek staat. `ontplanOpdracht` wist de plek.
- Routes: `/verplaatsen` leest status + verzonden plek nu server-side uit de opdracht (niet van de
  client). `/mail-monteur` en `/versturen` slaan de verzonden plek op via markeerVerzonden.
- `PlanbordBord`: optimistische sleep-update gebruikt dezelfde logica, zodat het beeld meteen klopt.

## Verificatie

- `npm test`: 332 groen (was 328, +4).
- `npm run build`: slaagt.

## Te doen door Reinier (volgorde!)

1. Eerst `supabase/schema-compleet-4-verzonden.sql` draaien in Supabase.
2. Daarna pushen. Andersom faalt verplaatsen/versturen omdat de kolommen nog niet bestaan.
