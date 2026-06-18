-- KSV Demo (Kluslus) - Compleet systeem blok 22: terugmeld-pogingen (robuuste historie).
--
-- Tot nu toe leefde een terugmelding alleen als drie velden op de melding zelf (teruggemeld_at/
-- _reden/_toelichting). Die worden nu een TRANSIENTE vlag ("ligt nu teruggemeld bij kantoor") die
-- bij opnieuw uitsturen of opleveren weer gewist wordt. Om de historie tóch te bewaren (Rein koos
-- bewust "robuust: per poging bewaren") legt deze tabel elke terugmelding als losse, append-only regel
-- vast, met een snapshot van klant + reden + welke monteur. Zo blijft de monteur zijn teruggemelde
-- klussen in zijn geschiedenis zien, ook nadat kantoor de klus opnieuw aan een ANDERE monteur gaf, en
-- ziet kantoor alle pogingen los van de huidige toewijzing. Snapshot-velden (klant_naam/_adres/ref)
-- zodat de regel leesbaar is zonder de melding-rij te hoeven lezen (RLS: een monteur ziet een klus die
-- aan een ander is toegewezen niet meer). Idempotent. Draai op test-DB en productie.

create table if not exists public.terugmeld_pogingen (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  opdracht_id       uuid not null references public.meldingen (id) on delete cascade,
  -- het monteur-account dat terugmeldde (identiteit, los van de naam); voor "mijn geschiedenis".
  monteur_id        uuid,
  monteur_naam      text,
  reden             text not null,
  toelichting       text,
  -- snapshot op het moment van terugmelden, zodat de regel leesbaar blijft zonder de melding te lezen.
  klant_naam        text,
  klant_adres       text,
  referentienummer  text
);

create index if not exists terugmeld_pogingen_opdracht_idx
  on public.terugmeld_pogingen (opdracht_id);
create index if not exists terugmeld_pogingen_monteur_idx
  on public.terugmeld_pogingen (monteur_id);

alter table public.terugmeld_pogingen enable row level security;

-- Lezen: kantoor/opdrachtgever (alle pogingen, voor het dossier), of de monteur die zelf terugmeldde
-- (zijn eigen pogingen, ook nadat de klus naar een ander ging). Schrijven: elke ingelogde gebruiker
-- (de terugmeld-route draait onder de monteur; de select-policy schermt het lezen af).
drop policy if exists terugmeld_pogingen_select on public.terugmeld_pogingen;
drop policy if exists terugmeld_pogingen_insert on public.terugmeld_pogingen;

create policy terugmeld_pogingen_select on public.terugmeld_pogingen
  for select
  using (
    public.mijn_rol() in ('beheerder', 'opdrachtgever')
    or monteur_id = auth.uid()
  );

create policy terugmeld_pogingen_insert on public.terugmeld_pogingen
  for insert
  with check (auth.uid() is not null);

-- PostgREST z'n schema-cache laten herladen, zodat de REST-laag de nieuwe tabel meteen kent.
notify pgrst, 'reload schema';
