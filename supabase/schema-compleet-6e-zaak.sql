-- KSV Demo (Kluslus) - Compleet systeem blok 6e: zaak-scheiding + verzonden-account.
--
-- Voegt opdrachtgever_id toe aan opdrachten (welke kantoor-zaak mag dit zien) en scherpt de RLS aan
-- zodat een opdrachtgever alleen zijn eigen zaak ziet. Plus verzonden_toegewezen_aan (bevinding 3).
-- Idempotent. Draai dit BEWUST. Noodknop blijft schema-compleet-6c-RLS-UIT.sql.

-- ======================================================================
-- 1. Kolommen
-- ======================================================================
alter table public.meldingen add column if not exists opdrachtgever_id uuid references public.opdrachtgevers (id);
alter table public.meldingen add column if not exists verzonden_toegewezen_aan uuid;
create index if not exists meldingen_opdrachtgever_id_idx on public.meldingen (opdrachtgever_id);

-- ======================================================================
-- 2. Hulpfuncties (SECURITY DEFINER, omzeilen RLS intern). mijn_rol() en
--    opdracht_toegewezen_aan_mij() bestaan al uit 6c.
-- ======================================================================

create or replace function public.mijn_opdrachtgever()
returns uuid language sql security definer set search_path = public stable as $$
  select opdrachtgever_id from public.profielen where id = auth.uid();
$$;

-- Hoort de opdracht (top-level) bij mijn zaak? Ad-hoc (opdrachtgever_id leeg) telt nooit mee.
create or replace function public.opdracht_van_mijn_zaak(de_opdracht_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.meldingen
    where id = de_opdracht_id
      and opdrachtgever_id is not null
      and opdrachtgever_id = public.mijn_opdrachtgever()
  );
$$;

-- Mag ik deze meldingen-rij zien/raken? (geldt voor top-level opdrachten en kind-meldingen)
create or replace function public.mag_melding(
  de_opdrachtgever_id uuid, de_opdracht_id uuid, de_toegewezen_aan uuid
) returns boolean language sql security definer set search_path = public stable as $$
  select
    public.mijn_rol() = 'beheerder'
    or (public.mijn_rol() = 'opdrachtgever' and (
         de_opdrachtgever_id = public.mijn_opdrachtgever()
         or (de_opdracht_id is not null and public.opdracht_van_mijn_zaak(de_opdracht_id))
       ))
    or de_toegewezen_aan = auth.uid()
    or (de_opdracht_id is not null and public.opdracht_toegewezen_aan_mij(de_opdracht_id));
$$;

-- Mag ik iets dat aan een opdracht hangt (document, oplevering) zien/raken?
create or replace function public.mag_opdracht(de_opdracht_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select
    public.mijn_rol() = 'beheerder'
    or (public.mijn_rol() = 'opdrachtgever' and public.opdracht_van_mijn_zaak(de_opdracht_id))
    or public.opdracht_toegewezen_aan_mij(de_opdracht_id);
$$;

-- ======================================================================
-- 3. meldingen-policies herzien (select/update/delete via mag_melding).
--    INSERT blijft ruim (auth.uid() not null) zoals in 6c.
-- ======================================================================
drop policy if exists meldingen_select on public.meldingen;
drop policy if exists meldingen_update on public.meldingen;
drop policy if exists meldingen_delete on public.meldingen;

create policy meldingen_select on public.meldingen
  for select using (public.mag_melding(opdrachtgever_id, opdracht_id, toegewezen_aan));
create policy meldingen_update on public.meldingen
  for update using (public.mag_melding(opdrachtgever_id, opdracht_id, toegewezen_aan))
  with check (public.mag_melding(opdrachtgever_id, opdracht_id, toegewezen_aan));
create policy meldingen_delete on public.meldingen
  for delete using (public.mag_melding(opdrachtgever_id, opdracht_id, toegewezen_aan));

-- ======================================================================
-- 4. documenten- en opleveringen-policies herzien (via mag_opdracht).
-- ======================================================================
drop policy if exists documenten_select on public.documenten;
drop policy if exists documenten_update on public.documenten;
drop policy if exists documenten_delete on public.documenten;

create policy documenten_select on public.documenten
  for select using (public.mag_opdracht(opdracht_id));
create policy documenten_update on public.documenten
  for update using (public.mag_opdracht(opdracht_id)) with check (public.mag_opdracht(opdracht_id));
create policy documenten_delete on public.documenten
  for delete using (public.mag_opdracht(opdracht_id));

drop policy if exists opleveringen_select on public.opleveringen;
drop policy if exists opleveringen_update on public.opleveringen;
drop policy if exists opleveringen_delete on public.opleveringen;

create policy opleveringen_select on public.opleveringen
  for select using (public.mag_opdracht(opdracht_id));
create policy opleveringen_update on public.opleveringen
  for update using (public.mag_opdracht(opdracht_id)) with check (public.mag_opdracht(opdracht_id));
create policy opleveringen_delete on public.opleveringen
  for delete using (public.mag_opdracht(opdracht_id));
