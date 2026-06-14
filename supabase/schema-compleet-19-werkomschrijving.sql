-- Werk-omschrijving op een zelf-aangemaakte klus: een vrij-tekstveld (typen + spraak) waarin de monteur
-- noteert wat er moet gebeuren ("kasten nastellen"). Puur intern, komt niet in het opleverrapport.
-- Vooral voor ad-hoc klussen die de monteur zelf inschiet, buiten een aangesloten opdrachtgever om.
-- Idempotent.

alter table public.meldingen
  add column if not exists werkomschrijving text;
