# Afschermingsmatrix, negatieve RLS-tests en de test-DB-runner

Datum: 2026-06-07

Vervolg op de poort/toestandsmatrix-sessie. Reinier zag scherp dat de echte winst in het test-fundament
zit, niet in snelheid: de handmatige productie-stap detecteert geen fout die ik en de tests al misten.
Wat het zaak-lek ving was niet zijn oog, maar een geautomatiseerde test op de test-DB. Dus de focus:
zorgen dat de tests de gevaarlijke eigenschappen (afscherming) systematisch bewaken.

## Afschermingsmatrix (TOEGANG.md)

Wie mag wat zien/muteren, per tabel/pagina en rol, met de test die het bewaakt. Bij beveiliging is de
"mag-NIET"-kant het vangnet. De matrix legde bloot dat de afscherming maar half getoetst was: opdracht-
zichtbaarheid en pagina-rol-gates wel, maar de kind-data (documenten, oplevering), de mutatie-acties en
de profielen niet.

## Negatieve RLS-tests (e2e/afscherming.spec.ts)

Nieuw patroon: rol-geauthenticeerde clients (anon key + signInWithPassword met het test-wachtwoord) die
de RLS DIRECT toetsen, los van de UI. Dat is het echte vangnet, want het vangt een RLS-fout ook als de
UI hem zou maskeren. Alle tests bleken GROEN (de RLS klopt; geen lekken), en bewaken hem nu tegen
toekomstige migraties:
- monteur ziet documenten/oplevering van andermans klus NIET (sanity: eigen wel)
- opdrachtgever ziet die van een andere zaak NIET (sanity: eigen zaak wel)
- monteur kan andermans klus NIET wijzigen/verwijderen (geverifieerd: rij ongewijzigd)
- monteur ziet alleen zijn eigen profiel, niet de namen/rollen van anderen
- /gebruikers is beheerder-only (monteur + opdrachtgever weggestuurd)

## Test-DB-runner (scripts/migrate.mjs, npm run migrate:test)

Draait een .sql tegen de TEST-database via een directe Postgres-connectie (`pg`), zodat migraties op het
zijspoor zonder handwerk te testen zijn. Bewust ALLEEN test (SUPABASE_TEST_DB_URL in .env.local,
gitignored); productie blijft een handmatige, bewuste stap. Want, zoals Reinier vaststelde: de mens-stap
is governance, geen foutdetectie. De zekerheid komt van de negatieve tests, niet van het plakken.

## Open punten (Reinier's input nodig)

- **/prullenbak heeft geen rol-gate** (data wel RLS-beschermd). Ontwerpvraag: beheerder/kantoor-only maken?
- **Runner activeren**: test-DB-connectiestring in .env.local zetten (zie .env.example).

## Eindstand

Unit/route 429, e2e 41 (+7 mail), allemaal groen via de poort. Geen nieuwe DB-migratie nodig (de
afscherming-tests toetsen de bestaande RLS).
