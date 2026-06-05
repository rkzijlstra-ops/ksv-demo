-- NOODKNOP voor blok 6c. Zet de afscherming (RLS) in een keer weer UIT.
--
-- Gebruik dit ALLEEN als de app na het draaien van `schema-compleet-6c-rls.sql` niet meer werkt
-- (bv. schermen blijven leeg of je komt er niet in). Plak dit in de Supabase SQL-editor en run.
-- Daarna is alles weer open zoals voor 6c: elke ingelogde gebruiker kan alles zien.
--
-- Dit is een tijdelijke terugval. Fix daarna de policy en draai `schema-compleet-6c-rls.sql`
-- opnieuw om de afscherming weer aan te zetten. De policies zelf blijven staan (ze doen niets
-- zolang RLS uit is); alleen het slot gaat eraf.

alter table public.meldingen disable row level security;
alter table public.documenten disable row level security;
alter table public.opleveringen disable row level security;
alter table public.profielen disable row level security;
alter table public.opdrachtgevers disable row level security;
