-- Controle-checklist bij de oplevering.
-- De klant tekent samen met de monteur per punt af: akkoord of niet akkoord (bv. "buiten de evt.
-- meldingen geen beschadigingen aan keuken, keukenblad, vloer, plafond en muren"). Eén jsonb-array met
-- de afgevinkte punten EN hun tekst, zodat het rapport precies toont wat er die dag is gecontroleerd,
-- ook als de standaardpunten later wijzigen. Vorm: [{ "punt": "...", "akkoord": true|false }].
alter table public.opleveringen
  add column if not exists controle jsonb not null default '[]'::jsonb;
