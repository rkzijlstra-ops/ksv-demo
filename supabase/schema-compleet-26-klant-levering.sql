-- schema-compleet-26-klant-levering.sql
-- Per opdrachtgever: mag de monteur de oplevering ook rechtstreeks aan de klant opleveren?
-- Default AAN; een opdrachtgever die dat niet wil zet het uit via het dashboard. Bij een eigen
-- klus (geen opdrachtgever_id) beslist de monteur zelf, los van deze vlag (zie magKlantLeveren).
alter table public.opdrachtgevers
  add column if not exists klant_levering_toegestaan boolean not null default true;
