# Terugmeld-keten compleet gemaakt

Datum: 2026-06-18. Dirigent: Rein (gaf groen licht om autonoom af te maken, draait morgen de
productie-SQL en merget). Branch: `feature/terugmelden-keten`.

## Aanleiding

Rein testte de oplever-app en vond dat het terugmelden door de monteur maar half af was. De monteur-kant
werkte (klus naar zijn geschiedenis), maar de keten daaromheen niet. Vier klachten, plus een flits-bug.

## Wat er mis was (allemaal bevestigd in de code)

1. **Status bleef hangen.** `markeerTeruggemeld` zette alleen `teruggemeld_*`, niet de
   `dashboard_status`. De klus bleef op het planbord staan als "bevestigd" (blauw) in plaats van terug
   naar "te plannen".
2. **Geen filter-tab "Teruggemeld"** op het dashboard; de reden was alleen in het logboek op de
   detailpagina zichtbaar, niet op de kaart of in de pool.
3. **Herkansing brak.** Stuurde kantoor de klus opnieuw uit (naar dezelfde of een andere monteur), dan
   werd `teruggemeld_at` nergens gewist. De klus belandde in de GESCHIEDENIS van de ontvangende monteur
   in plaats van zijn actieve werkpool.
4. **Opleveren-na-terugmelden** liet strijdige status achter (`teruggemeld_at` én
   `opdracht_status=opgeleverd`), met dubbel-inplan-risico zodra de status-fix er was.
5. **Flits-bug.** Het terugmeld-venster zat als DOM-kind in de klikbare kaart-`<a>` (bovendien ongeldige
   HTML); de bevestig/annuleer-knoppen lieten de kaart alsnog naar de detailpagina navigeren. En na
   terugmelden kreeg de monteur geen enkele bevestiging.

## Beslissingen (door Rein gekozen)

- Status terug naar de bestaande status **"binnen"** (geen nieuwe status), met markering + reden.
- **Robuust: per poging bewaren.** Nieuwe append-only tabel `terugmeld_pogingen` (blok 22) met snapshot.
  De `teruggemeld_*`-velden op de melding worden een transiënte vlag.
- **Opleveren na terugmelden mag** (klant komt toch thuis); opleveren is het eindstation en ruimt op.

## Wat gebouwd is

- **Migratie** `schema-compleet-22-terugmeld-pogingen.sql` (idempotent, RLS: monteur ziet eigen
  pogingen, kantoor alles). Gedraaid op de test-DB.
- **Datalaag** (`db.ts`): `markeerTeruggemeld` legt nu een poging-regel vast én zet de klus terug naar
  de pool; `markeerVerzonden` en `registreerZaakRapport` wissen de transiënte vlag; nieuwe
  `getTerugmeldPogingenVoor`.
- **Route** geeft de snapshot (monteur + klant + ref) mee.
- **Kantoor-UI**: filter-tab "Teruggemeld" (pseudo-filter op de vlag), reden op de dashboard-kaart en in
  de planbord-pool.
- **Monteur-UI**: terugmeld-venster via een React-portal los van de kaart (flits weg) + een bevestiging
  na terugmelden; teruggemelde klussen blijven read-only in de geschiedenis ook na herplannen.

## Verificatie

- Unit: 674 groen (incl. nieuwe db-, route- en dashboard-lijst-tests).
- Integratie tegen de test-DB: 15 groen.
- Typecheck, lint en `next build`: schoon.
- Browser-e2e (`terugmelden.spec` uitgebreid met status→binnen, filter-chip, flits-fix, herkansing-keten
  en opleveren-na-terugmelden): draait Rein zelf (mijn shell laat zombie dev-servers achter).

## Voor Rein (morgen)

1. Draai in de Supabase SQL-editor van het PRODUCTIE-project:
   `supabase/schema-compleet-22-terugmeld-pogingen.sql` (idempotent).
2. Draai de browser-e2e: `npm run test:e2e` (of gericht `e2e/terugmelden.spec.ts`).
3. Merge `feature/terugmelden-keten`.

Toestandsmatrix (TOESTANDEN.md) en testdekking (TESTDEKKING.md) zijn bijgewerkt. Ontwerp en plan staan
in BRAINSTORM-terugmeld-keten.md en PLAN-terugmeld-keten.md.
