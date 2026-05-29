-- KSV Demo - Sessie 2A.6: documenten per opdracht + opleverflow-velden
-- Lichte uitbreiding: opdracht blijft een meldingen-rij (opdracht_id IS NULL).
-- Nieuwe tabel documenten (meerdere docs per opdracht) + extra kolommen op meldingen.
-- Idempotent waar mogelijk, zodat herhaald runnen veilig is.

-- ====== 1. Extra kolommen op meldingen (opdracht-rij) ======
alter table public.meldingen
  add column if not exists leverweek       text,
  add column if not exists documenttype    text,
  add column if not exists opdracht_status text not null default 'open',
  add column if not exists opgeleverd_at   timestamptz,
  add column if not exists rapport_url     text,
  -- TOEKOMSTVAST (sessie 2A.5 auth): nu altijd null, geen logica.
  add column if not exists user_id         uuid,
  add column if not exists toegewezen_aan  uuid;

-- documenttype: 'orderbevestiging' | 'werkbon_service' | 'tekst' | 'onbekend' | null
alter table public.meldingen
  drop constraint if exists meldingen_documenttype_check;
alter table public.meldingen
  add constraint meldingen_documenttype_check
  check (documenttype is null or documenttype in
    ('orderbevestiging', 'werkbon_service', 'tekst', 'onbekend'));

-- opdracht_status: open | opgeleverd (los van melding-status concept/verzonden)
alter table public.meldingen
  drop constraint if exists meldingen_opdracht_status_check;
alter table public.meldingen
  add constraint meldingen_opdracht_status_check
  check (opdracht_status in ('open', 'opgeleverd'));

create index if not exists meldingen_opdracht_status_idx
  on public.meldingen (opdracht_status);

-- ====== 2. Tabel documenten ======
create table if not exists public.documenten (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  -- de opdracht-rij waar dit document bij hoort
  opdracht_id      uuid not null references public.meldingen(id) on delete cascade,
  type             text not null check (type in ('pdf', 'afbeelding')),
  bestandsnaam     text not null,
  storage_pad      text not null,
  publieke_url     text not null,
  -- referentienummer zoals op dit document (voor latere matching op ref-nr)
  referentienummer text,
  -- precies één primair document per opdracht: de bron van de uitgelezen kop
  is_primair       boolean not null default false
);

create index if not exists documenten_opdracht_id_idx
  on public.documenten (opdracht_id);

-- ====== 3. RLS uit + grants (demo, zelfde lijn als bestaande tabellen) ======
alter table public.documenten disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.documenten
  to anon, authenticated, service_role;
-- nieuwe kolommen op meldingen vallen onder bestaande tabel-grant; belt-and-suspenders:
grant select, insert, update, delete on public.meldingen
  to anon, authenticated, service_role;

-- ====== 4. Storage bucket voor originele documenten ======
insert into storage.buckets (id, name, public)
values ('opdracht-documenten', 'opdracht-documenten', true)
on conflict (id) do nothing;
