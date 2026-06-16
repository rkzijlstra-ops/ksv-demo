-- Adres-keuze bij meerdere adressen op een order. Een order-PDF kan twee adressen bevatten
-- (de montagelocatie waar de keuken geplaatst wordt vs het opdrachtgever-/bouwbedrijf-adres). De
-- parser weet niet altijd zeker welke de montagelocatie is. Bij 2+ unieke adressen moet een mens
-- bewust kiezen (monteur bij zelfinvoer, planner op het dashboard), zodat de monteur nooit naar het
-- verkeerde adres rijdt. Idempotent.

-- Alle gevonden adressen met soort-label, zoals de parser ze teruggaf ([{adres, soort}, ...]).
alter table public.meldingen
  add column if not exists adres_kandidaten jsonb;

-- Vlag: er staan meerdere adressen en er is nog niet gekozen. Zolang true blokkeert het dashboard
-- het plannen/bevestigen. Wordt false zodra iemand het juiste adres koos (klant_adres gezet).
alter table public.meldingen
  add column if not exists adres_keuze_nodig boolean not null default false;

-- Snel de klussen vinden die nog een adres-keuze nodig hebben.
create index if not exists meldingen_adres_keuze_nodig_idx
  on public.meldingen (adres_keuze_nodig)
  where adres_keuze_nodig = true;
