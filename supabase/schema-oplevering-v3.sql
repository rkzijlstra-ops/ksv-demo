-- KSV Demo - Oplevering v3: instelbaar ontvangstadres voor het rapport (testfase).
-- Monteurs met meerdere klanten kunnen zo per oplevering kiezen waar het rapport heen gaat.
-- Idempotent.

alter table public.opleveringen
  add column if not exists rapport_email text;
