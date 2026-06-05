# Blok 6c (RLS live) + 6d (oplever-werkpool per persoon)

Datum: 2026-06-05
Project: KSV demo-app (Kluslus)

## 6c: RLS aangezet en geverifieerd

- Migratie `schema-compleet-6c-rls.sql` + noodknop `schema-compleet-6c-RLS-UIT.sql` geschreven.
- Reinier draaide eerst per ongeluk de noodknop (RLS bleef uit). Gediagnosticeerd met een tijdelijk
  service-role-scriptje: rollen klopten (bkm=beheerder, rk=monteur), maar RLS stond uit (anon zag
  19 rijen). Na het draaien van de echte migratie: anon ziet 0 rijen -> RLS staat aan.
- Geverifieerd: beheerder (bkm) ziet nog alles (dashboard vol). Testmonteur (rk) ziet in de
  werkpool alleen zijn ene toegewezen klus (van Dijk), de andere 18 zijn weg. Afscherming werkt.
- Diagnose-scriptje daarna verwijderd (las .env.local, hoort niet in het project).

## 6d: oplever-werkpool toont alleen je eigen klussen

Aanleiding: als beheerder die meewerkt zag Reinier in zijn oplever-app alles (beheerder ziet via
RLS alles). Plus de vraag: hoe blijft zelf-inschieten voor een andere opdrachtgever (bv. KKS, zonder
backend) werken zonder het onoverzichtelijk te maken?

Model bevestigd (past op de bestaande monteur-gerichte, multi-opdrachtgever architectuur):
- Keukenzaak zit op de opdracht (parser/handmatig), niet op de app. KKS = gewoon een opdracht met
  keukenzaak=KKS; rapport + opslag werken hetzelfde, geen aparte backend nodig.
- Twee inschiet-ingangen: dashboard (kantoor/KSV, gaat naar de pool, wordt op het planbord
  toegewezen) en de oplever-app zelf (veld/ad-hoc/KKS, meteen van jou).

Gebouwd (TDD):
- `db.getWerkpoolVoor(userId)`: top-level opdrachten met toegewezen_aan = userId.
- Werkpool-pagina `/` gebruikt dat i.p.v. getMeldingen (schone lijst: jouw klussen).
- `/api/opdrachten` (zelf-inschieten) zet nu `toegewezen_aan = de inschieter`, zodat de opdracht in
  zijn eigen werkpool verschijnt (ook nodig onder RLS, anders zou een monteur zijn eigen
  zelf-ingeschoten klus niet terugzien).

Verificatie: 376 tests groen, build slaagt.

## Gevolg om te weten

Bestaande opdrachten met toegewezen_aan = leeg (de 18 ongeplande testopdrachten) verschijnen niet
meer in de werkpool van de beheerder; die staan op het dashboard. Dat is de bedoeling.

## Open punten

- Ed (opdrachtgever) testen zodra hij een echt account heeft.
- Monteur-mail/spoed nog hardcoded zaaknaam (multi-tenant-opruiming later).
- /api/mensen vs /api/gebruikers folder-rename (los eindje).
