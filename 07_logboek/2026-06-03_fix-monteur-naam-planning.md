# Fix: monteur-naam voor de planning (los van de uuid-koppeling)

Datum: 2026-06-03
Project: KSV demo-app

## Probleem

Inplannen en slepen faalde met "invalid input syntax for type uuid: 'rein'". De kolom
`toegewezen_aan` is van type uuid (koppeling naar een ingelogde gebruiker, uit auth-stap 2A.5),
geen tekst. Het planbord schreef er een monteur-naam in. Foutieve aanname: dat `toegewezen_aan`
vrije tekst was.

## Oplossing

Aparte tekstkolom `monteur_naam` voor de planning-naam, los van de uuid-koppeling. `toegewezen_aan`
blijft ongemoeid voor blok 6 (accounts per monteur). Overal in de planning- en dashboardlaag
gebruikt nu `monteur_naam`:

- Migratie `supabase/schema-compleet-3-monteur.sql` (kolom + index, idempotent).
- `db.ts`: `Melding.monteur_naam`, `PlanningInput.monteur_naam`; planOpdracht/wijzigOpdracht
  schrijven `monteur_naam` (niet meer `toegewezen_aan`).
- `planbord.ts` (monteurRijen/plaatsOpdrachten), `dashboard-lijst.ts` (zoeken op monteur),
  endpoints /plannen en /verplaatsen, en de componenten PlanbordGrid/PlanbordPool/PlanbordBord
  en OpdrachtDashboardCard.

## Verificatie

- `npm test`: 312 groen.
- `npm run build`: slaagt.

## Te doen door Reinier (volgorde belangrijk)

1. Eerst `supabase/schema-compleet-3-monteur.sql` draaien in Supabase (kolom aanmaken).
2. Daarna pushen zodat de nieuwe code live gaat. Andersom zou plannen falen omdat de kolom
   nog niet bestaat.
