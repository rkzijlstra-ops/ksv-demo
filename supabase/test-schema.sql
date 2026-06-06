-- test-schema.sql
-- Volledige structuur voor het ZIJSPOOR (apart test-Supabase-project), de migraties in
-- volgorde aan elkaar geplakt. Draai dit EEN keer in de SQL-editor van een VERS test-project.
-- Reproduceert dezelfde structuur + RLS als productie. Seedt geen data (alleen de zaak via 6a).
-- Zie ZIJSPOOR-TEST-DATABASE.md. NIET op productie draaien.

-- ============================================================================
-- schema.sql
-- ============================================================================
-- KSV Demo - meldingen tabel
-- Eén tabel voor zowel PDF-klussen als monteur-meldingen (bron-veld onderscheidt)
-- Geen RLS-policies in sessie 1 (demo, geen productie-veiligheid)
-- TODO sessie 4 of later: RLS aanzetten als demo richting echte versie 1 gaat

create table if not exists public.meldingen (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz       not null default now(),

  -- altijd gevuld
  bron                text              not null check (bron in ('pdf', 'monteur')),

  -- alleen voor monteur
  urgentie            text              check (urgentie in ('rood', 'geel')),

  -- meestal gevuld (uit PDF of monteur-input)
  klant_naam          text,
  klant_adres         text,
  referentienummer    text,
  adviseur            text,

  -- altijd gevuld voor PDF (array van meldingen per artikel)
  -- structuur: [{ keller_code: string, omschrijving: string, melding_tekst: string }]
  meldingen           jsonb             not null default '[]'::jsonb,

  -- sessie 2+: monteur-input velden
  foto_url            text,
  spraak_tekst        text,
  ruwe_tekst          text
);

-- Snelste query voor Eds lijst-weergave: nieuwste eerst
create index if not exists meldingen_created_at_idx
  on public.meldingen (created_at desc);

-- Filter op bron komt vaak voor (Ed wil monteur-meldingen apart kunnen zien)
create index if not exists meldingen_bron_idx
  on public.meldingen (bron);

-- Sessie 1: RLS uitzetten zodat server-side service-key insert mag (geen demo-RLS-policies)
-- Sessie 4 of bij productie: RLS aanzetten + policies opnieuw bekijken
alter table public.meldingen disable row level security;

-- Expliciete grants. Supabase doet dit normaal automatisch op nieuwe public-tabellen,
-- maar belt-and-suspenders na "permission denied" tijdens demo-bouw.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.meldingen to anon, authenticated, service_role;

-- Voor toekomstige tabellen in public: zelfde grants automatisch
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ============================================================================
-- schema-2a.sql
-- ============================================================================
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

-- ============================================================================
-- schema-2a-datums.sql
-- ============================================================================
-- KSV Demo - Sessie 2A: uitvoerdatum toevoegen
-- created_at (aanmaakdatum) bestaat al; dit voegt de geplande uitvoerdatum toe (mag leeg).

alter table public.meldingen
  add column if not exists uitvoerdatum date;

-- Testdata zodat beide situaties in de UI zichtbaar zijn:
-- J. Jansen krijgt een geplande uitvoerdatum, DIAGNOSE blijft leeg ("nog niet gepland").
update public.meldingen set uitvoerdatum = '2026-05-30'
  where id = '9e4d149e-b523-4853-b014-61c4df593217';
update public.meldingen set uitvoerdatum = null
  where id = '36825847-ca3e-492a-95a8-c4a9481639f3';

-- ============================================================================
-- schema-2a-versie.sql
-- ============================================================================
-- KSV Demo - Sessie 2A: versie-nummering voor meldingen
-- Een melding start op versie 1. Elke keer dat een verzonden melding wordt
-- aangepast en opnieuw verzonden, hoogt de versie op (v2, v3, ...).

alter table public.meldingen
  add column if not exists versie integer not null default 1;

-- ============================================================================
-- schema-2a-opdracht-koppeling.sql
-- ============================================================================
-- KSV Demo - Sessie 2A: meldingen koppelen aan één opdracht
-- Principe: een melding hoort altijd bij precies één opdracht. Geen losse meldingen.

-- 1. opdracht_id: verwijst naar de opdracht-rij waar deze melding bij hoort.
--    Opdracht zelf = rij met opdracht_id IS NULL. Melding = rij met opdracht_id gevuld.
alter table public.meldingen
  add column if not exists opdracht_id uuid references public.meldingen(id) on delete cascade;

create index if not exists meldingen_opdracht_id_idx on public.meldingen (opdracht_id);

-- 2. PREVIEW (optioneel): laat zien welke losse monteur-meldingen worden opgeruimd.
select id, klant_naam, urgentie, created_at
from public.meldingen
where bron = 'monteur' and opdracht_id is null;

-- 3. OPRUIMEN: verwijder losse monteur-meldingen (de "Onbekende klant"-testrijen).
--    Deze mogen na de refactor niet meer bestaan (elke melding hoort bij een opdracht).
delete from public.meldingen
where bron = 'monteur' and opdracht_id is null;

-- ============================================================================
-- schema-2a5-auth-step1.sql
-- ============================================================================
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

-- ============================================================================
-- schema-2a5-auth-step2.sql
-- ============================================================================
-- KSV Demo - Sessie 2A.5 step 2: RLS activeren
-- Loopt NA step1 + data-cleanup (delete from meldingen + documenten) of na een
-- backfill van user_id op bestaande rijen. Idempotent.
--
-- Vereisten voor deze migratie:
--   - alle bestaande meldingen/documenten zijn weg, of hebben user_id gevuld
--   - F3.2 (anon-key in API-routes) is uitgerold zodat onze API onder RLS werkt
--
-- Wat deze migratie doet:
--   1. user_id wordt NOT NULL op meldingen + documenten
--   2. Foreign keys naar auth.users (on delete restrict zodat verwijderen van een user
--      pas kan als zijn rijen weg zijn)
--   3. RLS aan op beide tabellen (de policies zelf staan al sinds step1)

-- 1. NOT NULL constraints
alter table public.meldingen
  alter column user_id set not null;

alter table public.documenten
  alter column user_id set not null;

-- 2. FK naar auth.users (idempotent via drop-if-exists)
alter table public.meldingen drop constraint if exists meldingen_user_id_fkey;
alter table public.meldingen
  add constraint meldingen_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

alter table public.documenten drop constraint if exists documenten_user_id_fkey;
alter table public.documenten
  add constraint documenten_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

-- 3. RLS aan (policies bestaan sinds step1)
alter table public.meldingen enable row level security;
alter table public.documenten enable row level security;

-- ============================================================================
-- schema-2a6-documenten.sql
-- ============================================================================
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

-- ============================================================================
-- schema-2a7-spoed.sql
-- ============================================================================
-- KSV Demo - Sessie 2A.7: melding-flow herontwerp (spoed i.p.v. rood/geel-urgentie)
-- Een melding wordt standaard klaargezet voor oplevering. 'spoed' = uitzondering, los verstuurd.
-- 'urgentie' (rood/geel) blijft als kolom bestaan voor oude rijen maar wordt niet meer gebruikt.
-- Idempotent.

alter table public.meldingen
  add column if not exists spoed              boolean not null default false,
  add column if not exists spoed_verzonden_at timestamptz;

-- Snel filteren op opdrachten/meldingen met spoed (werkbak-markering)
create index if not exists meldingen_spoed_idx
  on public.meldingen (spoed) where spoed = true;

-- Grants dekken nieuwe kolommen via bestaande tabel-grant; belt-and-suspenders:
grant select, insert, update, delete on public.meldingen
  to anon, authenticated, service_role;

-- ============================================================================
-- schema-oplevering.sql
-- ============================================================================
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

-- ====== 5. Storage-policies: browser-upload toestaan op deze bucket ======
-- Video's worden rechtstreeks vanuit de browser geupload (niet via de server met
-- service-key), dus storage.objects-RLS geldt. Deze bucket mag door ingelogde
-- gebruikers (en anon, voor de demo) beschreven en gelezen worden.
drop policy if exists "oplever_videos_insert" on storage.objects;
create policy "oplever_videos_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'oplever-videos');

drop policy if exists "oplever_videos_select" on storage.objects;
create policy "oplever_videos_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'oplever-videos');

-- ============================================================================
-- schema-oplevering-v2.sql
-- ============================================================================
-- KSV Demo - Oplevering v2: notitieveld op de oplevering + soft-delete (prullenbak).
-- Idempotent. Draaien na schema-oplevering.sql.

-- Notitie/bijzonderheden op de oplevering (geen melding, vrije tekst).
alter table public.opleveringen
  add column if not exists opmerking text;

-- Soft-delete: opdrachten markeren als verwijderd i.p.v. echt wissen (prullenbak + herstel).
alter table public.meldingen
  add column if not exists verwijderd_at timestamptz;

create index if not exists meldingen_verwijderd_at_idx
  on public.meldingen (verwijderd_at);

-- ============================================================================
-- schema-oplevering-v3.sql
-- ============================================================================
-- KSV Demo - Oplevering v3: instelbaar ontvangstadres voor het rapport (testfase).
-- Monteurs met meerdere klanten kunnen zo per oplevering kiezen waar het rapport heen gaat.
-- Idempotent.

alter table public.opleveringen
  add column if not exists rapport_email text;

-- ============================================================================
-- schema-compleet-0.sql
-- ============================================================================
-- KSV Demo - Compleet systeem blok 0: datamodel-fundament voor de opdrachtgeverskant.
-- Voegt de levenscyclus-status en planning-velden toe aan de opdracht-rij (meldingen, bron='pdf').
-- Idempotent. Draaien na schema-oplevering-v2.sql. Breekt de bestaande monteur-flow niet:
-- de bestaande kolommen status/opdracht_status/uitvoerdatum blijven ongemoeid.

-- 1. Levenscyclus-status van de opdracht (opdrachtgeverskant), los van de monteur-status.
alter table public.meldingen
  add column if not exists dashboard_status text not null default 'binnen';

-- Toegestane waarden afdwingen (idempotent: alleen toevoegen als de constraint nog niet bestaat).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meldingen_dashboard_status_check'
  ) then
    alter table public.meldingen
      add constraint meldingen_dashboard_status_check
      check (dashboard_status in (
        'binnen', 'concept_gepland', 'gepland', 'bevestigd', 'opgeleverd', 'geannuleerd'
      ));
  end if;
end $$;

-- 2. Planning-velden (één invoermodel). starttijd leeg = dagblok (montage),
--    starttijd ingevuld = kaartje op dat uur (service). duur_dagen voor meerdaagse montage.
alter table public.meldingen
  add column if not exists startdatum date;
alter table public.meldingen
  add column if not exists starttijd time;
alter table public.meldingen
  add column if not exists duur_dagen integer not null default 1;

-- 3. Verstuur-poort en bevestiging.
alter table public.meldingen
  add column if not exists gewijzigd_te_versturen boolean not null default false;
alter table public.meldingen
  add column if not exists bevestigd_at timestamptz;

-- 4. Bestaande rijen netjes meenemen.
--    Reeds opgeleverde opdrachten krijgen meteen de juiste levenscyclus-status.
update public.meldingen
  set dashboard_status = 'opgeleverd'
  where bron = 'pdf' and opdracht_status = 'opgeleverd' and dashboard_status = 'binnen';
--    Een al geplande uitvoerdatum wordt de startdatum (planbord toont hem dan meteen).
update public.meldingen
  set startdatum = uitvoerdatum
  where uitvoerdatum is not null and startdatum is null;

-- 5. Indexen voor het dashboard-filter en de keukenhistorie (zoeken op referentienummer).
create index if not exists meldingen_dashboard_status_idx
  on public.meldingen (dashboard_status);
create index if not exists meldingen_referentienummer_idx
  on public.meldingen (referentienummer);

-- ============================================================================
-- schema-compleet-3-monteur.sql
-- ============================================================================
-- KSV Demo - Compleet systeem blok 3: monteur-naam voor de planning.
-- De bestaande kolom toegewezen_aan is van type uuid (koppeling naar een ingelogde gebruiker,
-- voor blok 6). Voor de planning hebben we nu een vrije naam nodig, los van die koppeling.
-- Idempotent. Breekt niets: toegewezen_aan blijft ongemoeid.

alter table public.meldingen
  add column if not exists monteur_naam text;

create index if not exists meldingen_monteur_naam_idx
  on public.meldingen (monteur_naam);

-- ============================================================================
-- schema-compleet-4-verzonden.sql
-- ============================================================================
-- KSV Demo - Compleet systeem blok 4: onthoud de verzonden plek van een opdracht.
-- Zo kan "gewijzigd, nog te versturen" weer uit als de opdracht exact terug wordt gezet op de
-- plek waar hij stond toen hij verstuurd werd. Idempotent. Breekt niets.

alter table public.meldingen
  add column if not exists verzonden_monteur text;
alter table public.meldingen
  add column if not exists verzonden_startdatum date;
alter table public.meldingen
  add column if not exists verzonden_starttijd time;

-- ============================================================================
-- schema-compleet-6a-accounts.sql
-- ============================================================================
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

-- ============================================================================
-- schema-compleet-6c-rls.sql
-- ============================================================================
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

-- ============================================================================
-- schema-compleet-6e-zaak.sql
-- ============================================================================
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
