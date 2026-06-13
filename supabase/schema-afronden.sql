-- Klus afronden (plan 1): de monteur meldt een klus snel als afgerond, los van de volledige
-- oplevering. Analoog aan teruggemeld_*. Zie DESIGN-KLUS-AFRONDEN.md.
alter table public.meldingen
  add column if not exists afgerond_door_monteur_at timestamptz,
  add column if not exists afgerond_toelichting       text,
  add column if not exists afgerond_vervolg_nodig      boolean not null default false;
