-- KSV Demo (Kluslus) - Compleet systeem blok 16: verzendgeschiedenis van het opleverrapport.
--
-- Tot nu toe overschreef elke nieuwe verzending de ontvanger op `opleveringen` (rapport_email /
-- klant_rapport_email). Daardoor was niet terug te zien wat eerder waarheen ging. Deze tabel houdt
-- elke verzending als losse, append-only regel bij: doelgroep (klant of zaak), naar welk adres,
-- wanneer en welke PDF. Zelfde zichtbaarheid als de opdracht (mag_opdracht-keten). Idempotent.
-- Draai op test-DB en productie.

create table if not exists public.rapport_verzendingen (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  opdracht_id uuid not null references public.meldingen (id) on delete cascade,
  doelgroep   text not null check (doelgroep in ('klant', 'zaak')),
  naar        text not null,
  rapport_url text,
  door_id     uuid
);

create index if not exists rapport_verzendingen_opdracht_idx
  on public.rapport_verzendingen (opdracht_id);

alter table public.rapport_verzendingen enable row level security;

-- Lezen: kantoor/opdrachtgever van de zaak, of de toegewezen monteur. Schrijven: elke ingelogde
-- gebruiker (de route draait onder de monteur die opleverde; de select-policy schermt het lezen af).
drop policy if exists rapport_verzendingen_select on public.rapport_verzendingen;
drop policy if exists rapport_verzendingen_insert on public.rapport_verzendingen;

create policy rapport_verzendingen_select on public.rapport_verzendingen
  for select
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

create policy rapport_verzendingen_insert on public.rapport_verzendingen
  for insert
  with check (auth.uid() is not null);

-- PostgREST z'n schema-cache laten herladen, zodat de REST-laag de nieuwe tabel meteen kent.
notify pgrst, 'reload schema';
