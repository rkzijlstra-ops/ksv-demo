-- KSV Demo - Compleet systeem blok 3: monteur-naam voor de planning.
-- De bestaande kolom toegewezen_aan is van type uuid (koppeling naar een ingelogde gebruiker,
-- voor blok 6). Voor de planning hebben we nu een vrije naam nodig, los van die koppeling.
-- Idempotent. Breekt niets: toegewezen_aan blijft ongemoeid.

alter table public.meldingen
  add column if not exists monteur_naam text;

create index if not exists meldingen_monteur_naam_idx
  on public.meldingen (monteur_naam);
