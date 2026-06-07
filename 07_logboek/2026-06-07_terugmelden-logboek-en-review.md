# Terugmelden + logboek + brede review (autonome sessie)

Datum: 2026-06-07

Reinier gaf toegang tot de test-DB (runner) en de opdracht: het prullenbak/terugmeld/logboek-model
afmaken, dan alles grondig doorlopen (monteur, Ed, interactie), alle tests draaien, screenshots maken
van rijkere situaties, de mails en het opleverrapport nalopen, fouten repareren, waarschijnlijke
verbeteringen toevoegen, en beslissingen + niet-gedane-maar-waardevolle dingen rapporteren.

## Gebouwd (model afgemaakt)

- **Frats dicht:** de verwijder-route had geen auth/eigendom-check; een monteur kon elke klus wissen.
  Nu mag hij alleen zijn EIGEN ingeschoten klus (user_id = hijzelf) verwijderen; het prullenbakje
  verschijnt navenant alleen bij eigen klussen.
- **Terugmelden (blok 9):** een door kantoor ingeschoten klus kan de monteur niet wissen maar wel
  terugmelden (reden uit lijst + toelichting). De klus gaat uit zijn actieve werkpool naar zijn
  history (met reden terug te zien), verschijnt bij kantoor met een "Teruggemeld"-markering (dashboard,
  planbord, detail-header), en kantoor krijgt een mail. Corrigeren loopt via Ed (geen intrekken-knop).
- **Logboek (blok 8):** immutable gebeurtenissen-tabel (wie deed wat), getoond op de opdracht-detail.
  Logt nu verwijderen en terugmelden. Logboek-lezen is defensief zodat de app niet crasht op een
  nog-niet-gemigreerde DB.
- Migraties 8 (gebeurtenissen) + 9 (teruggemeld-velden), zelf op de test-DB gedraaid via de runner.

## Review-bevindingen (en wat ik deed)

- **Visuele review** met een rijke seed (5 monteurs, ~13 opdrachten, vol planbord, opgeleverd rapport).
  Vond dat een teruggemelde klus nog stil als bevestigd op het planbord/detail stond -> markering
  toegevoegd (waarschijnlijke verbetering).
- **Mails** inhoudelijk nagelopen: degelijk en consistent (monteur-opdracht met historie, uitnodiging,
  spoed, ontplan, annuleer, terugmelden). Alle 7 mail-e2e's groen.
- **Opleverrapport** (PDF + web-preview): strak en professioneel (briefhoofd, secties, badges, foto-
  grid, handtekening, voettekst). Geen wijziging nodig.

## Tests

Unit/route 442, e2e 44 (+7 mail), allemaal groen via de poort. Screenshots in `screenshots/` (gitignored).

## Toegevoegd: afzender per monteur op het rapport (blok 10)

Het rapport toonde overal hardcoded "BKM Keukenmontage". Nu komt de afzender (briefhoofd + voetregel)
uit het profiel van de monteur die opleverde. Elke gebruiker vult zijn eigen bedrijfsnaam/telefoon/mail
in via een nieuw "Mijn gegevens"-scherm (de naam blijft door kantoor ingesteld). Veilig bijwerken via
een SECURITY DEFINER functie op auth.uid(), zodat niemand zijn rol kan wijzigen. Terugval: naam, dan
neutrale kop. Migratie 10. Tests: helper + route + cross-feature e2e.

## Toegevoegd: naam beheren (blok 11)

Vervolg op de afzender-keuze. Ed nodigt uit met een naam, maar de monteur mag die zelf aanvullen/
corrigeren in "Mijn gegevens" (bijv. "Piet" -> "Piet de Vries"). Ed kan in zijn gebruikerslijst ook
hernoemen (inline potlood-knop). Geen open aanmelding. Naam loopt mee in de SECURITY DEFINER functie
(migratie 11, naam wordt nooit leeggemaakt). Tests: route + e2e.

## KRITIEK: productie-migraties

De code staat live, maar de PRODUCTIE-DB heeft de nieuwe migraties nodig. De app crasht niet (defensief),
maar de features werken pas na het draaien van: `schema-compleet-8` (logboek), `schema-compleet-9`
(terugmelden), `schema-compleet-10` (afzender-gegevens) en `schema-compleet-11` (eigen naam). Reinier
meldde 8 + 9 + 10 gedraaid; 11 is nieuw.

## Open beslissingen voor Reinier (niet zelf gemaakt)

- /prullenbak heeft geen rol-gate (data wel RLS-beschermd): beheerder-only maken of zo laten?
- Geen "intrekken"-knop voor de monteur bij terugmelden (corrigeren via Ed): akkoord?
- Hardcoded BKM-gegevens in het rapport-briefhoofd: config maken zodra Kluslus meerdere zaken bedient?
