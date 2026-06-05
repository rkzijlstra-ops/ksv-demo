# Plan blok 6c: RLS aanzetten (de echte afscherming)

Datum: 2026-06-05
RISICOVOL (lockout). Twee losse bestanden, idempotent, Reinier draait ze bewust.
Pas live als met testaccounts (monteur + Ed) geverifieerd.

## Doel (afsprakenmodel)

- Beheerder (Reinier): ziet en doet alles. Telt ook mee als inplanbare monteur.
- Opdrachtgever (Ed): ziet alle opdrachten van zijn zaak (v1: de enige zaak, dus alles).
- Monteur: ziet alleen opdrachten met `toegewezen_aan = zijn account`, plus de kind-meldingen
  en oplevering van die opdrachten.

## Hoe de app de DB raakt (basis van de policies)

- Bijna alles loopt via `db()` = de sessie van de ingelogde gebruiker, dus RLS telt mee.
- Service-role (omzeilt RLS) alleen voor: storage-upload, account aanmaken/verwijderen
  (admin.deleteUser), e-mailadres opzoeken. Die blijven werken.

## Hulpfuncties (SECURITY DEFINER, omzeilen RLS intern, geen recursie)

```sql
create or replace function public.mijn_rol()
returns text language sql security definer set search_path = public stable as $$
  select rol from public.profielen where id = auth.uid();
$$;

create or replace function public.opdracht_toegewezen_aan_mij(de_opdracht_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.meldingen
    where id = de_opdracht_id and toegewezen_aan = auth.uid()
  );
$$;
```

## Policies

### meldingen (bevat opdrachten EN kind-meldingen)
- Eerst weg: oude `meldingen_eigen` (drop if exists).
- LEZEN (USING):
  `mijn_rol() in ('beheerder','opdrachtgever')
   or toegewezen_aan = auth.uid()
   or (opdracht_id is not null and opdracht_toegewezen_aan_mij(opdracht_id))`
- WIJZIGEN en VERWIJDEREN (USING): zelfde als lezen.
- INVOEREN (WITH CHECK): `auth.uid() is not null`. Bewust ruim: inschieten/createOpdracht/
  monteur-melding zetten geen toewijzing; je ziet een ingevoerde rij alleen terug als lezen het
  toestaat. Geen lek, minder lockout-risico.

### documenten en opleveringen (hangen aan opdracht_id)
- Eerst weg: oude `documenten_eigen` (drop if exists).
- LEZEN/WIJZIGEN/VERWIJDEREN (USING):
  `mijn_rol() in ('beheerder','opdrachtgever') or opdracht_toegewezen_aan_mij(opdracht_id)`
- INVOEREN (WITH CHECK): `auth.uid() is not null`.

### profielen
- LEZEN (USING): `id = auth.uid() or mijn_rol() in ('beheerder','opdrachtgever')`.
- INVOEREN/WIJZIGEN/VERWIJDEREN: `mijn_rol() = 'beheerder'` (houdt uitnodigen + rol-wijzigen
  via db() werkend; verwijderen gaat meestal via cascade/service-role).

### opdrachtgevers
- LEZEN (USING): `auth.uid() is not null`.
- SCHRIJVEN: `mijn_rol() = 'beheerder'`.

### Grants
- `grant select, insert, update, delete` op de vijf tabellen aan `authenticated` (idempotent,
  belt-and-suspenders; Supabase doet dit normaal al).

## Noodknop

Apart bestand `schema-compleet-6c-RLS-UIT.sql`: zet RLS in één plak weer uit op de vijf tabellen.
Plus: `dbAdmin()` (service-role) blijft als ontsnappingsroute, raakt RLS nooit. Beheerder-account
is via service-role-SQL geseed, kan niet buitengesloten raken.

## Bestanden (Reinier draait bewust, in deze volgorde)

1. `supabase/schema-compleet-6c-rls.sql` (drop oude policies + functies + policies + RLS aan + grants)
2. `supabase/schema-compleet-6c-RLS-UIT.sql` (noodknop, alleen bij problemen)

## Testplan (kan Reinier niet solo)

1. Beheerder (Reinier): nog steeds alles zien, plannen, gebruikers beheren.
2. Testmonteur (prive-account): inloggen, alleen de aan hem toegewezen klussen zien, niet de rest;
   melden en opleveren werkt op zijn eigen klus.
3. Ed (opdrachtgever, later): dashboard/planbord zien, monteur-kant niet.
Tot dit bevestigd is: "aan op eigen risico". Bij twijfel: noodknop.

## Bekende open punten (bewust later)

- `meldingen.opdrachtgever_id` per-zaak filtering (nu één zaak, dus opdrachtgever ziet alles).
- Monteur die top-level opdracht aanmaakt op de werkpool ziet die daarna niet (toewijzing leeg);
  edge, geen lek.
- Schrijf-policies zijn per rol; INVOEREN bewust ruim gehouden voor minder lockout-risico.
