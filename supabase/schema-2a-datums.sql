-- KSV Demo - Sessie 2A: uitvoerdatum toevoegen
-- created_at (aanmaakdatum) bestaat al; dit voegt de geplande uitvoerdatum toe (mag leeg).

alter table public.meldingen
  add column if not exists uitvoerdatum date;

-- Testdata zodat beide situaties in de UI zichtbaar zijn:
-- J. Jansen krijgt een geplande uitvoerdatum, DIAGNOSE blijft leeg ("nog niet gepland").
update public.meldingen set uitvoerdatum = '2026-05-30'
  where id = '9e4d149e-b523-4853-b014-61c4df593217';
update public.meldingen set uitvoerdatum = null
  where id = '36825847-ca3e-492a-95a8-c4a9481639f3';
