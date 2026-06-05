# Plan blok 6e: zaak-scheiding + verzonden-account (bevinding 1 + 3)

Datum: 2026-06-05
Zie DESIGN-COMPLEET-6e-zaak.md. TDD, commit per laag, specifieke git add.

## Migraties (Reinier draait bewust, in volgorde)

- **M1. `supabase/schema-compleet-6e-zaak.sql`** (idempotent):
  - kolom `meldingen.opdrachtgever_id uuid references opdrachtgevers(id)` (nullable).
  - kolom `meldingen.verzonden_toegewezen_aan uuid`.
  - helper `mijn_opdrachtgever()` (SECURITY DEFINER).
  - herzie `meldingen_select` en `meldingen_update`: opdrachtgever-tak wordt
    `opdrachtgever_id = mijn_opdrachtgever()` (i.p.v. alles). Beheerder/monteur ongewijzigd.
- **M2. `supabase/schema-compleet-6e-CLEANUP-testdata.sql`**: wist opleveringen + documenten +
  meldingen (alle test-opdrachten). Profielen en opdrachtgevers blijven.

Noodknop van 6c blijft geldig (zet RLS op alle tabellen uit).

## DB-laag (TDD)

- **T1.** `Melding` + `getOpdrachtenVoorDashboard`: kolommen toevoegen; query filtert
  `opdrachtgever_id is not null` (ad-hoc uit dashboard/planbord). Test.
- **T2.** `OpdrachtInput` + `createOpdracht`: `opdrachtgever_id` meeschrijven. Test.
- **T3.** Bevinding 3: `VerzondenPlek` krijgt `toegewezen_aan`; `markeerVerzonden` schrijft
  `verzonden_toegewezen_aan`; `opVerzondenPlek` vergelijkt op account i.p.v. naam. Tests bij.

## Routes

- **T4.** `/api/dashboard/inschieten`: bepaal de zaak en zet `opdrachtgever_id` per opdracht.
  Opdrachtgever = eigen zaak (uit profiel); beheerder = meegestuurde zaak, of de enige zaak als
  terugval (`getStandaardOpdrachtgever`). Test.
- **T5.** `/api/opdrachten` (werkpool-zelf-inschiet): `opdrachtgever_id = null` (ad-hoc), expliciet.
- **T6.** `versturen` + `verplaatsen`: `verzonden_toegewezen_aan` meegeven in de verzonden plek.

## Client

- **T7.** `PlanbordBord.gewijzigdNa`: vergelijk op `toegewezen_aan` (via `verzonden_toegewezen_aan`)
  i.p.v. monteur_naam, gelijk aan de server.

## Afronding

- **T8.** Hele suite + build groen. Reinier draait M1 en M2. Logboek-entry.

## Bewust later (open punten)

- Keuze-veld "welke zaak" in de inschiet-UI (pas bij 2+ zaken).
- Zaak van een opdracht achteraf wijzigen.
- Filialen als sub-niveau onder een zaak.
- Bevinding 4 (ruime INSERT-policy) en 5 (monteurloze verstuur-markering).
