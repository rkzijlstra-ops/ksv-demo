-- KSV Demo - Oplevering: eindstaat-bewijs (foto's + video), handtekening, uitkomst.
-- Nieuwe tabel `opleveringen` (1 per opdracht) + kolom `keukenzaak` op meldingen.
-- Idempotent waar mogelijk, zodat herhaald runnen veilig is. Check zit inline in de
-- create table (geen losse alter-constraint).

-- ====== 1. Kolom keukenzaak op de opdracht-rij (meldingen) ======
alter table public.meldingen
  add column if not exists keukenzaak text;

-- ====== 2. Tabel opleveringen ======
create table if not exists public.opleveringen (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  opdracht_id         uuid not null references public.meldingen(id) on delete cascade,
  uitkomst            text not null default 'afgerond'
                        check (uitkomst in ('afgerond', 'openstaande_punten')),
  eindstaat_foto_urls text[] not null default '{}',
  video_url           text,
  handtekening_url    text,
  rapport_url         text,
  user_id             uuid
);

-- één oplevering per opdracht (upsert-doel)
create unique index if not exists opleveringen_opdracht_id_uniek
  on public.opleveringen (opdracht_id);

-- ====== 3. RLS uit + grants (demo, zelfde lijn als bestaande tabellen) ======
alter table public.opleveringen disable row level security;

grant select, insert, update, delete on public.opleveringen
  to anon, authenticated, service_role;

-- ====== 4. Storage bucket voor oplever-video's ======
insert into storage.buckets (id, name, public)
values ('oplever-videos', 'oplever-videos', true)
on conflict (id) do nothing;
