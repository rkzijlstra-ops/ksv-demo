-- KSV Demo - Sessie 2A: meldingen koppelen aan één opdracht
-- Principe: een melding hoort altijd bij precies één opdracht. Geen losse meldingen.

-- 1. opdracht_id: verwijst naar de opdracht-rij waar deze melding bij hoort.
--    Opdracht zelf = rij met opdracht_id IS NULL. Melding = rij met opdracht_id gevuld.
alter table public.meldingen
  add column if not exists opdracht_id uuid references public.meldingen(id) on delete cascade;

create index if not exists meldingen_opdracht_id_idx on public.meldingen (opdracht_id);

-- 2. PREVIEW (optioneel): laat zien welke losse monteur-meldingen worden opgeruimd.
select id, klant_naam, urgentie, created_at
from public.meldingen
where bron = 'monteur' and opdracht_id is null;

-- 3. OPRUIMEN: verwijder losse monteur-meldingen (de "Onbekende klant"-testrijen).
--    Deze mogen na de refactor niet meer bestaan (elke melding hoort bij een opdracht).
delete from public.meldingen
where bron = 'monteur' and opdracht_id is null;
