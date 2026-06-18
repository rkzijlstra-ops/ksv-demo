# Plan: terugmeld-keten compleet (sessie 2026-06-17)

TDD per taak: test eerst (rood), dan code (groen). Status: [ ] open, [x] klaar.
Migratie blok 22 al op test-DB gedraaid. Productie-SQL draait Rein morgen (zie onderaan).

## Datalaag

- [x] T1. Migratie `terugmeld_pogingen` (blok 22) + op test-DB. (klaar)
- [x] T2. db.ts: type `TerugmeldPoging`, `markeerTeruggemeld` uitgebreid (snapshot-poging insert +
  status reset naar "binnen" + planning leeg), `getTerugmeldPogingenVoor(userId)`. Unit: db.test.ts.
- [x] T3. db.ts: `markeerVerzonden` wist transiënte terugmeld-vlag. Unit: db.test.ts.
- [x] T4. db.ts: `registreerZaakRapport` ruimt op (terugmeld-vlag weg + dashboard_status uit "binnen"
  naar "opgeleverd"). Unit: db.test.ts.

## Route

- [x] T5. terugmelden/route.ts: snapshot (klant/ref/monteur) meegeven aan markeerTeruggemeld. Route-test.

## Kantoor-UI

- [x] T6. dashboard-lijst.ts: StatusFilter + "teruggemeld" (pseudo-filter op teruggemeld_at). Unit:
  dashboard-lijst.test.ts.
- [x] T7. DashboardLijst.tsx: chip "Teruggemeld" + telling.
- [x] T8. OpdrachtDashboardCard.tsx: reden + toelichting tonen bij een teruggemelde klus.
- [x] T9. PlanbordPool.tsx: "Teruggemeld"-markering + reden in de pool-kaart.

## Monteur-UI

- [x] T10. page.tsx + HistorySection: teruggemeld-pogingen in de geschiedenis tonen (uit
  getTerugmeldPogingenVoor, gededupliceerd tegen de werkpool).
- [x] T11. TerugmeldKnop.tsx: flits-bug (preventDefault op alle modal-knoppen) + bevestiging na
  terugmelden.

## Tests + afronding

- [x] T12. e2e terugmelden.spec.ts uitbreiden: status→binnen + pool-markering + filter-tab +
  herkansing-keten (opnieuw uitsturen → actief bij ontvangende monteur) + opleveren-na-terugmelden.
- [x] T13. Volledige unit+integratie-suite groen (`npm test`, `npm run test:int`). e2e draait Rein.
- [x] T14. TOESTANDEN.md + TESTDEKKING.md bijwerken; logboek-entry.

## Productie-migratie (Rein, morgen)

Draai in de Supabase SQL-editor van het PRODUCTIE-project, in deze volgorde:
1. `supabase/schema-compleet-22-terugmeld-pogingen.sql`
Daarna mergen. De SQL is idempotent (veilig bij herhalen).
