-- KSV Demo - Sessie 2A.5 step 1: auth-laag voorbereiden
-- Voegt user_id-kolom toe aan documenten (meldingen.user_id bestaat al sinds 2A.6).
-- Definieert RLS-policies, maar activeert RLS nog NIET (bestaande rijen hebben nog geen user_id).
-- Step 2 komt na Reins eerste login: bestaande rijen vullen + NOT NULL + FK + RLS aan.
-- Idempotent.

-- 1. documenten.user_id (nullable voor nu)
alter table public.documenten
  add column if not exists user_id uuid;

-- 2. RLS-policy voor meldingen (zowel opdracht-rijen als monteur-meldingen)
--    Lezen/schrijven: eigen rijen OF rijen die aan jou zijn toegewezen.
--    Bij insert/update: user_id moet jouw auth.uid zijn (kan niet andermans rij aanmaken).
drop policy if exists meldingen_eigen on public.meldingen;
create policy meldingen_eigen on public.meldingen
  for all
  to authenticated
  using (auth.uid() = user_id or auth.uid() = toegewezen_aan)
  with check (auth.uid() = user_id);

-- 3. RLS-policy voor documenten
--    Lezen/schrijven: documenten waarvan de OPDRACHT van jou is, of die je zelf hebt aangemaakt.
drop policy if exists documenten_eigen on public.documenten;
create policy documenten_eigen on public.documenten
  for all
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.meldingen m
      where m.id = public.documenten.opdracht_id
        and (auth.uid() = m.user_id or auth.uid() = m.toegewezen_aan)
    )
  )
  with check (auth.uid() = user_id);

-- 4. Indexen voor RLS-performance (filter op user_id wordt vaak gebruikt)
create index if not exists meldingen_user_id_idx on public.meldingen (user_id);
create index if not exists documenten_user_id_idx on public.documenten (user_id);

-- 5. NIET in step 1: enable row level security. Komt in step 2 na data-migratie.
-- alter table public.meldingen enable row level security;
-- alter table public.documenten enable row level security;
