-- KSV Demo - Sessie 2A migration
-- Voegt status/history-velden, foto-array, telefoon toe aan meldingen.
-- Idempotent waar mogelijk (if not exists), zodat herhaald runnen veilig is.

alter table public.meldingen
  add column if not exists status text not null default 'concept',
  add column if not exists aangepast boolean not null default false,
  add column if not exists verzonden_at timestamptz,
  add column if not exists foto_urls jsonb not null default '[]'::jsonb,
  add column if not exists klant_telefoon text;

-- Status mag alleen 'concept' of 'verzonden' zijn.
-- Drop + recreate constraint zodat herhaald runnen niet faalt.
alter table public.meldingen
  drop constraint if exists meldingen_status_check;
alter table public.meldingen
  add constraint meldingen_status_check check (status in ('concept', 'verzonden'));

-- Index voor werkbak: snel filteren op status
create index if not exists meldingen_status_idx
  on public.meldingen (status);

-- Grants ook voor de nieuwe kolommen (tabel-grants dekken kolommen, maar belt-and-suspenders)
grant select, insert, update, delete on public.meldingen to anon, authenticated, service_role;

-- ====== Supabase Storage bucket ======
-- Maak bucket 'meldingen-fotos' aan via Dashboard (Storage -> New bucket, public).
-- Of via SQL (storage schema):
insert into storage.buckets (id, name, public)
values ('meldingen-fotos', 'meldingen-fotos', true)
on conflict (id) do nothing;
