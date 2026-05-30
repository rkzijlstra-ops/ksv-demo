-- KSV Demo - Oplevering: eindstaat-bewijs (foto's + video), handtekening, uitkomst.
-- Nieuwe tabel `opleveringen` (1 per opdracht) + kolom `keukenzaak` op meldingen.
-- Idempotent waar mogelijk, zodat herhaald runnen veilig is.
-- Zelfde lijn als schema-2a6-documenten.sql (demo: RLS uit, brede grants).

-- ====== 1. Kolom keukenzaak op de opdracht-rij (meldingen) ======
-- Zaaknaam/opdrachtgever van deze opdracht. Parser vult 'm, monteur kan corrigeren.
alter table public.meldingen
  add column if not exists keukenzaak text;

-- ====== 2. Tabel opleveringen ======
create table if not exists public.opleveringen (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  -- de opdracht-rij (meldingen met opdracht_id IS NULL) waar deze oplevering bij hoort
  opdracht_id         uuid not null references public.meldingen(id) on delete cascade,
  uitkomst            text not null default 'afgerond',
  -- bewijs-foto's van de eindstaat
  eindstaat_foto_urls text[] not null default '{}',
  -- link naar opgeslagen video (null = geen video)
  video_url           text,
  -- link naar handtekening-afbeelding (null = overgeslagen)
  handtekening_url    text,
  -- de gegenereerde oplever-PDF (null tot versturen)
  rapport_url         text,
  -- TOEKOMSTVAST (auth): nu altijd null, geen logica
  user_id             uuid
);

-- uitkomst: afgerond | openstaande_punten
alter table public.opleveringen
  drop constraint if exists opleveringen_uitkomst_check;
alter table public.opleveringen
  add constraint opleveringen_uitkomst_check
  check (uitkomst in ('afgerond', 'openstaande_punten'));

-- één oplevering per opdracht (upsert-doel)
create unique index if not exists opleveringen_opdracht_id_uniek
  on public.opleveringen (opdracht_id);

-- ====== 3. RLS uit + grants (demo, zelfde lijn als bestaande tabellen) ======
alter table public.opleveringen disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.opleveringen
  to anon, authenticated, service_role;

-- ====== 4. Storage bucket voor oplever-video's ======
insert into storage.buckets (id, name, public)
values ('oplever-videos', 'oplever-videos', true)
on conflict (id) do nothing;
