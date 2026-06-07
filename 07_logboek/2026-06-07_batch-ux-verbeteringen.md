# Batch UX-verbeteringen (7 punten)

Datum: 2026-06-07

Reinier liep het dashboard, het planbord en de detailpagina na en gaf 7 verbeterpunten. Eerst
afgestemd (3 open keuzes via tappable opties), daarna in één sessie uitgevoerd, lichte modus met de
afrond-check per punt en tests/build waar zinvol. Per logische groep gecommit.

## Wat er gedaan is

1. **Kleur-consistentie "niet bevestigd".** Status `gepland` (verstuurd, wacht op bevestiging) was
   oranje, gelijk aan `concept_gepland`. Nu overal geel (statusbadge, dashboard-kaart-strip, planbord-
   balk/rand, filterchip), consistent met de teller en de werkpool-badge. (styling, build geverifieerd)
2. **Planbord breder op desktop** (1040 -> 1500px) en duidelijker scheiding tussen monteur-rijen
   (label-kolom met achtergrond, dikkere scheidingslijn).
3. **Geannuleerde opdrachten inklapbaar** op het dashboard (kopje "Geannuleerd (N)", standaard dicht;
   open bij het geannuleerd-filter). e2e: dashboard-geannuleerd.spec.
4. **Terugknop volgt de herkomst**: vanuit het planbord terug naar het planbord (zelfde week),
   anders naar het dashboard, via ?from=planbord. Kopje "Deze keuken eerder" -> "Eerder op deze
   referentie" (niet altijd een keuken). e2e: terug-navigatie.spec.
5. **Documentbeheer op de detailpagina** (punt 1): documenten openen, verwijderen (met bevestiging,
   ook de bron) en een pdf/afbeelding bijvoegen als bijlage (geen parse). De backend-routes bestonden
   al maar hingen nergens in de UI (los eindje). Tegelijk dichtgezet: de DELETE-route had geen
   auth/rol-check en geen storage-opruiming; nu kantoor-only met best-effort storage-cleanup via
   getDocumentById. POST-route ook kantoor-only. Tests: route-tests uitgebreid + documentbeheer.spec.

## Afrond-check ving een regressie

De ?from=planbord-toevoeging aan de planbord-kaart-link brak 10 e2e's die op de exacte href matchten.
De volledige e2e-run aan het eind ving dit; selectors aangepast naar substring-match (href*=).

## Eindstand

Unit/route: 424 groen. Volledige e2e: groen (na de selector-fix). Build slaagt. Alle keuzes van
Reinier verwerkt (geannuleerd = ingeklapt kopje, pdf bijvoegen = bijlage zonder parse, bron wisbaar).
TESTDEKKING.md bijgewerkt; geen openstaande functionele gaten.
