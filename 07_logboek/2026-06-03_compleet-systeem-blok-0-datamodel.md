# Compleet systeem blok 0: datamodel-fundament gebouwd

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, `PLAN-COMPLEET-0-datamodel.md`

## Aanleiding

Start van Route A (eerst het complete systeem afbouwen). Het design stond op "klaar voor
plan-fase". Dit is het eerste bouwblok: het gedeelde datamodel-fundament voor de
opdrachtgeverskant (dashboard + planbord). Bewust solo en als eerste, want dashboard (blok 1)
en planbord (blok 3) bouwen er allebei op voort; parallel werk kan pas hierna veilig.

## Vooraf opgeruimd

Losse, niet-gecommitte wijzigingen vastgelegd in vijf commits: de handtekening-dataverlies-fix
(2 juni), de foto-telling-fix in het rapport, het bevestigd-statuskleur-token, en de design-
en logboek-artefacten van de plan-sessies. Boom schoon voor het nieuwe blok.

## Gemaakte datamodel-keuzes

1. `meldingen`-tabel uitgebreid, niet gesplitst naar een aparte `opdrachten`-tabel
   (design-regel "uitbreiden, niet herbouwen"). Een opdracht is nog steeds een rij met `bron='pdf'`.
2. Nieuwe kolom `dashboard_status` (levenscyclus opdrachtgeverskant), los van de bestaande
   monteur-status. Enum: binnen, concept_gepland, gepland, bevestigd, opgeleverd, geannuleerd.
3. Planning-velden `startdatum`, `starttijd` (mag leeg = dagblok), `duur_dagen`. Eén invoermodel.
4. Marker `gewijzigd_te_versturen` + `bevestigd_at` voor de verstuur-poort en bevestiging.
5. Geen aparte klanten-tabel: keukenhistorie via query op referentienummer.

Datalaag is multi-opdrachtgever-klaar gehouden (scoping-velden aanwezig), de afscherming per
klant landt in een later blok zonder herbouw.

## Wat gebouwd is (TDD, alle stappen RED -> GREEN)

- `supabase/schema-compleet-0.sql`: idempotente migratie (kolommen + check-constraint + indexen
  op dashboard_status en referentienummer + meenemen bestaande rijen).
- `src/lib/db.ts`: type `DashboardStatus`, velden op `Melding`, `PlanningInput`, en functies
  `getOpdrachtenVoorDashboard`, `getOpdrachtById`, `zoekOpReferentie`, `planOpdracht`,
  `verstuurNaarMonteurs`, `bevestigOntvangst`, `wijzigOpdracht`, `annuleerOpdracht`.
- `src/lib/opdracht-status.ts`: pure helpers `statusStijl`, `isActief`, `moetOpnieuwVersturen`.
- `src/lib/dashboard-scope.ts`: pure `scopeVoorDashboard` (actief altijd, opgeleverd/geannuleerd
  laatste 14 dagen, injecteerbare peildatum). Verplaatsbaar naar een DB-filter bij grote schaal.
- `src/lib/te-doen.ts`: pure `teDoenTelling` (te plannen, te versturen, niet bevestigd, aandacht).
- Mock-harness in `db.test.ts` uitgebreid met `in` (bulk-versturen in één query).

## Verificatie

- `npm test`: 265 tests groen (was 233, +32).
- `npm run build`: slaagt, alle schermen typechecken.

## Open / vervolg

- Reinier draait `supabase/schema-compleet-0.sql` (zie `OCHTEND-CHECKLIST-COMPLEET-0.md`).
  Niet dringend: er hangt nog geen scherm aan, mag vlak voor blok 1.
- "Niet bevestigd"-teller telt nu alle `gepland`; de "te lang open"-verfijning vraagt een
  verstuurd-tijdstempel dat we nog niet bewaren, later toe te voegen.
- Volgende blok: blok 1 (dashboard-overzicht) of blok 3 (planbord), met de goedgekeurde mockups.
