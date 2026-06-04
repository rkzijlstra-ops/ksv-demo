-- KSV Demo - Compleet systeem blok 6a: accounts, rollen en zaken.
-- Tabellen opdrachtgevers (zaken) en profielen (rol per ingelogde gebruiker).
-- Nog GEEN RLS (komt in 6c). Idempotent.

-- 1. Zaken (opdrachtgevers). Voor nu één: Keukenstudio Voorschoten.
create table if not exists public.opdrachtgevers (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  created_at timestamptz not null default now()
);

insert into public.opdrachtgevers (naam)
select 'Keukenstudio Voorschoten'
where not exists (select 1 from public.opdrachtgevers);

-- 2. Profielen: 1-op-1 met een auth-gebruiker, met rol en (voor monteur/opdrachtgever) de zaak.
create table if not exists public.profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('beheerder', 'opdrachtgever', 'monteur')),
  naam text not null default '',
  opdrachtgever_id uuid references public.opdrachtgevers (id),
  created_at timestamptz not null default now()
);

create index if not exists profielen_opdrachtgever_id_idx on public.profielen (opdrachtgever_id);
create index if not exists profielen_rol_idx on public.profielen (rol);

-- 3. EENMALIG: zet jezelf (Reinier) als beheerder. Vul je eigen e-mailadres in en run dit los.
--    Daarna nodig je de rest uit via het scherm "Mensen" in de app.
-- insert into public.profielen (id, rol, naam, opdrachtgever_id)
-- select u.id, 'beheerder', 'Reinier', (select id from public.opdrachtgevers order by created_at limit 1)
-- from auth.users u
-- where u.email = 'JOUW-EMAIL@HIER'
-- on conflict (id) do update set rol = 'beheerder', naam = excluded.naam;
