-- Video op een melding (net als de oplevering al een video_url heeft).
-- Een monteur kan voortaan een korte video aan een beschadiging/manco-melding hangen,
-- naast de bestaande foto's. De rapport-PDF toont er een videolink voor.
alter table public.meldingen
  add column if not exists video_url text;
