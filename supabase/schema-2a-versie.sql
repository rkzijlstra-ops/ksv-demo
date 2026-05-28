-- KSV Demo - Sessie 2A: versie-nummering voor meldingen
-- Een melding start op versie 1. Elke keer dat een verzonden melding wordt
-- aangepast en opnieuw verzonden, hoogt de versie op (v2, v3, ...).

alter table public.meldingen
  add column if not exists versie integer not null default 1;
