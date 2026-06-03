-- KSV Demo - Compleet systeem blok 0: datamodel-fundament voor de opdrachtgeverskant.
-- Voegt de levenscyclus-status en planning-velden toe aan de opdracht-rij (meldingen, bron='pdf').
-- Idempotent. Draaien na schema-oplevering-v2.sql. Breekt de bestaande monteur-flow niet:
-- de bestaande kolommen status/opdracht_status/uitvoerdatum blijven ongemoeid.

-- 1. Levenscyclus-status van de opdracht (opdrachtgeverskant), los van de monteur-status.
alter table public.meldingen
  add column if not exists dashboard_status text not null default 'binnen';

-- Toegestane waarden afdwingen (idempotent: alleen toevoegen als de constraint nog niet bestaat).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meldingen_dashboard_status_check'
  ) then
    alter table public.meldingen
      add constraint meldingen_dashboard_status_check
      check (dashboard_status in (
        'binnen', 'concept_gepland', 'gepland', 'bevestigd', 'opgeleverd', 'geannuleerd'
      ));
  end if;
end $$;

-- 2. Planning-velden (één invoermodel). starttijd leeg = dagblok (montage),
--    starttijd ingevuld = kaartje op dat uur (service). duur_dagen voor meerdaagse montage.
alter table public.meldingen
  add column if not exists startdatum date;
alter table public.meldingen
  add column if not exists starttijd time;
alter table public.meldingen
  add column if not exists duur_dagen integer not null default 1;

-- 3. Verstuur-poort en bevestiging.
alter table public.meldingen
  add column if not exists gewijzigd_te_versturen boolean not null default false;
alter table public.meldingen
  add column if not exists bevestigd_at timestamptz;

-- 4. Bestaande rijen netjes meenemen.
--    Reeds opgeleverde opdrachten krijgen meteen de juiste levenscyclus-status.
update public.meldingen
  set dashboard_status = 'opgeleverd'
  where bron = 'pdf' and opdracht_status = 'opgeleverd' and dashboard_status = 'binnen';
--    Een al geplande uitvoerdatum wordt de startdatum (planbord toont hem dan meteen).
update public.meldingen
  set startdatum = uitvoerdatum
  where uitvoerdatum is not null and startdatum is null;

-- 5. Indexen voor het dashboard-filter en de keukenhistorie (zoeken op referentienummer).
create index if not exists meldingen_dashboard_status_idx
  on public.meldingen (dashboard_status);
create index if not exists meldingen_referentienummer_idx
  on public.meldingen (referentienummer);
