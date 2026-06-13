-- Klus voltooien (plan 2, zaak-kant): de zaak keurt een door de monteur voltooid gemelde klus goed
-- ("Akkoord, klaar" -> Voltooid/afgehandeld). Overlay naast de bestaande dashboard_status.
-- Zie DESIGN-KLUS-AFRONDEN.md en PLAN-KLUS-AFRONDEN-2.md.
alter table public.meldingen
  add column if not exists afgerond_akkoord_at timestamptz;
