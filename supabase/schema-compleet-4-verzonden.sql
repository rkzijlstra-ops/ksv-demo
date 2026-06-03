-- KSV Demo - Compleet systeem blok 4: onthoud de verzonden plek van een opdracht.
-- Zo kan "gewijzigd, nog te versturen" weer uit als de opdracht exact terug wordt gezet op de
-- plek waar hij stond toen hij verstuurd werd. Idempotent. Breekt niets.

alter table public.meldingen
  add column if not exists verzonden_monteur text;
alter table public.meldingen
  add column if not exists verzonden_startdatum date;
alter table public.meldingen
  add column if not exists verzonden_starttijd time;
