-- KSV Demo (Kluslus) - Compleet systeem blok 8: gebeurtenissen-logboek (audit-trail).
--
-- Legt per klus vast WIE WAT WANNEER deed (verwijderen, terugmelden, wijzigen, ...), zodat acties
-- achteraf herleidbaar zijn ("fratsen" van twee kanten: ook de monteur kan aantonen dat hij netjes
-- terugmeldde). Immutable: alleen invoegen en lezen, nooit wijzigen/verwijderen.
--
-- Idempotent. Draai op test-DB en productie.

create table if not exists public.gebeurtenissen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  opdracht_id uuid references public.meldingen (id) on delete cascade,
  actie text not null,             -- bv. 'verwijderd', 'teruggemeld', 'gewijzigd', 'geannuleerd'
  door_id uuid,                    -- wie de actie deed (auth-uid)
  door_naam text,
  door_rol text,
  details jsonb                    -- vrije context, bv. { "reden": "klant_niet_thuis", "toelichting": "..." }
);

create index if not exists gebeurtenissen_opdracht_idx on public.gebeurtenissen (opdracht_id);

alter table public.gebeurtenissen enable row level security;

-- Lezen: wie de opdracht mag zien (kantoor van de zaak, of de toegewezen/verzonden monteur), plus je
-- eigen acties. Invoegen: elke ingelogde (de routes loggen onder de user-sessie). Geen update/delete.
drop policy if exists gebeurtenissen_select on public.gebeurtenissen;
drop policy if exists gebeurtenissen_insert on public.gebeurtenissen;
create policy gebeurtenissen_select on public.gebeurtenissen
  for select using (public.mag_opdracht(opdracht_id) or door_id = auth.uid());
create policy gebeurtenissen_insert on public.gebeurtenissen
  for insert with check (auth.uid() is not null);

grant select, insert on public.gebeurtenissen to authenticated, service_role;
