-- KSV Demo (Kluslus) - Compleet systeem blok 6c: RLS aanzetten (de echte afscherming).
--
-- RISICOVOL (lockout). Draai dit BEWUST en verifieer daarna met testaccounts (monteur + Ed).
-- Werkt het niet zoals verwacht: draai de noodknop `schema-compleet-6c-RLS-UIT.sql`.
--
-- Idempotent: hulpfuncties via create-or-replace, policies via drop-if-exists + create.
-- Expliciet: de oude 2A.5-policies (user_id-gebaseerd) worden eerst weggegooid.
--
-- Afsprakenmodel:
--   beheerder    -> ziet en doet alles (telt ook mee als inplanbare monteur)
--   opdrachtgever -> alle opdrachten van zijn zaak (v1: de enige zaak, dus alles)
--   monteur      -> alleen opdrachten met toegewezen_aan = zijn account, plus de kind-meldingen
--                   en oplevering daarvan

-- ======================================================================
-- 1. Hulpfuncties (SECURITY DEFINER: draaien als eigenaar en omzeilen RLS
--    intern, zodat een policy die profielen/meldingen raadpleegt niet in
--    een oneindige lus belandt).
-- ======================================================================

create or replace function public.mijn_rol()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select rol from public.profielen where id = auth.uid();
$$;

create or replace function public.opdracht_toegewezen_aan_mij(de_opdracht_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.meldingen
    where id = de_opdracht_id and toegewezen_aan = auth.uid()
  );
$$;

-- ======================================================================
-- 2. meldingen (bevat zowel opdrachten als de kind-meldingen)
-- ======================================================================

-- Oude policy uit sessie 2A.5 weg (was user_id-gebaseerd).
drop policy if exists meldingen_eigen on public.meldingen;
-- Nieuwe policies (idempotent).
drop policy if exists meldingen_select on public.meldingen;
drop policy if exists meldingen_insert on public.meldingen;
drop policy if exists meldingen_update on public.meldingen;
drop policy if exists meldingen_delete on public.meldingen;

create policy meldingen_select on public.meldingen
  for select
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or toegewezen_aan = auth.uid()
    or (opdracht_id is not null and public.opdracht_toegewezen_aan_mij(opdracht_id))
  );

-- Invoeren bewust ruim: inschieten/createOpdracht/monteur-melding zetten geen toewijzing.
-- Een ingevoerde rij zie je daarna alleen terug als meldingen_select het toestaat. Geen lek.
create policy meldingen_insert on public.meldingen
  for insert
  with check (auth.uid() is not null);

create policy meldingen_update on public.meldingen
  for update
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or toegewezen_aan = auth.uid()
    or (opdracht_id is not null and public.opdracht_toegewezen_aan_mij(opdracht_id))
  )
  with check (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or toegewezen_aan = auth.uid()
    or (opdracht_id is not null and public.opdracht_toegewezen_aan_mij(opdracht_id))
  );

create policy meldingen_delete on public.meldingen
  for delete
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or toegewezen_aan = auth.uid()
    or (opdracht_id is not null and public.opdracht_toegewezen_aan_mij(opdracht_id))
  );

alter table public.meldingen enable row level security;

-- ======================================================================
-- 3. documenten (hangen aan een opdracht via opdracht_id)
-- ======================================================================

drop policy if exists documenten_eigen on public.documenten;
drop policy if exists documenten_select on public.documenten;
drop policy if exists documenten_insert on public.documenten;
drop policy if exists documenten_update on public.documenten;
drop policy if exists documenten_delete on public.documenten;

create policy documenten_select on public.documenten
  for select
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

create policy documenten_insert on public.documenten
  for insert
  with check (auth.uid() is not null);

create policy documenten_update on public.documenten
  for update
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  )
  with check (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

create policy documenten_delete on public.documenten
  for delete
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

alter table public.documenten enable row level security;

-- ======================================================================
-- 4. opleveringen (hangen aan een opdracht via opdracht_id)
-- ======================================================================

drop policy if exists opleveringen_select on public.opleveringen;
drop policy if exists opleveringen_insert on public.opleveringen;
drop policy if exists opleveringen_update on public.opleveringen;
drop policy if exists opleveringen_delete on public.opleveringen;

create policy opleveringen_select on public.opleveringen
  for select
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

create policy opleveringen_insert on public.opleveringen
  for insert
  with check (auth.uid() is not null);

create policy opleveringen_update on public.opleveringen
  for update
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  )
  with check (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

create policy opleveringen_delete on public.opleveringen
  for delete
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or public.opdracht_toegewezen_aan_mij(opdracht_id)
  );

alter table public.opleveringen enable row level security;

-- ======================================================================
-- 5. profielen (1-op-1 met een auth-gebruiker)
--    Lezen: je eigen rij + beheerder/opdrachtgever alles (nodig voor de
--    monteur-dropdown). Schrijven: alleen beheerder (houdt uitnodigen +
--    rol-wijzigen via db() werkend).
-- ======================================================================

drop policy if exists profielen_select on public.profielen;
drop policy if exists profielen_insert on public.profielen;
drop policy if exists profielen_update on public.profielen;
drop policy if exists profielen_delete on public.profielen;

create policy profielen_select on public.profielen
  for select
  using (
    id = auth.uid()
    or public.mijn_rol() in ('beheerder', 'opdrachtgever')
  );

create policy profielen_insert on public.profielen
  for insert
  with check (public.mijn_rol() = 'beheerder');

create policy profielen_update on public.profielen
  for update
  using (public.mijn_rol() = 'beheerder')
  with check (public.mijn_rol() = 'beheerder');

create policy profielen_delete on public.profielen
  for delete
  using (public.mijn_rol() = 'beheerder');

alter table public.profielen enable row level security;

-- ======================================================================
-- 6. opdrachtgevers (zaken)
--    Lezen: elke ingelogde gebruiker. Schrijven: alleen beheerder.
-- ======================================================================

drop policy if exists opdrachtgevers_select on public.opdrachtgevers;
drop policy if exists opdrachtgevers_insert on public.opdrachtgevers;
drop policy if exists opdrachtgevers_update on public.opdrachtgevers;
drop policy if exists opdrachtgevers_delete on public.opdrachtgevers;

create policy opdrachtgevers_select on public.opdrachtgevers
  for select
  using (auth.uid() is not null);

create policy opdrachtgevers_insert on public.opdrachtgevers
  for insert
  with check (public.mijn_rol() = 'beheerder');

create policy opdrachtgevers_update on public.opdrachtgevers
  for update
  using (public.mijn_rol() = 'beheerder')
  with check (public.mijn_rol() = 'beheerder');

create policy opdrachtgevers_delete on public.opdrachtgevers
  for delete
  using (public.mijn_rol() = 'beheerder');

alter table public.opdrachtgevers enable row level security;

-- ======================================================================
-- 7. Grants (belt-and-suspenders; Supabase geeft deze normaal al).
--    Met RLS aan bepalen de policies wat zichtbaar is; de grant geeft
--    alleen het recht om de tabel te benaderen.
-- ======================================================================

grant select, insert, update, delete on
  public.meldingen, public.documenten, public.opleveringen,
  public.profielen, public.opdrachtgevers
  to authenticated, service_role;
