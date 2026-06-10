-- KSV Demo (Kluslus) - blok 13: persoonlijk adresboek per monteur (vaste ontvangers van het rapport).
--
-- Een monteur (of elke gebruiker) slaat eigen adressen op met een naam en kiest ze bij het versturen van
-- het opleverrapport. RLS: iedereen ziet/beheert alleen zijn eigen rijen. Idempotent. Draai op test-DB
-- en productie.

create table if not exists public.adresboek (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  naam text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.adresboek enable row level security;

drop policy if exists "adresboek eigen select" on public.adresboek;
create policy "adresboek eigen select" on public.adresboek
  for select using (user_id = auth.uid());

drop policy if exists "adresboek eigen insert" on public.adresboek;
create policy "adresboek eigen insert" on public.adresboek
  for insert with check (user_id = auth.uid());

drop policy if exists "adresboek eigen delete" on public.adresboek;
create policy "adresboek eigen delete" on public.adresboek
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.adresboek to authenticated;
