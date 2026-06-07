# Deploy-poort, toestandsmatrix en de werkpool-gaten

Datum: 2026-06-07

Reinier was gefrustreerd dat het ondanks een goede testomgeving steeds op nieuwe vlakken misging, en
wilde structureel leren vastleggen. Daaruit kwam deze sessie.

## Structureel vastgelegd

- **Root cause**: we bouwen/testen verticaal (per feature), de gaten zitten horizontaal (in
  statusovergangen en tussen rollen). Een groene suite bewijst dat losse acties werken, niet dat de
  keten compleet is. Vastgelegd als geheugen [[feedback_toestand-en-keten-denken]] en als verplichte
  toestandsmatrix-stap in de skill projectstart-discipline.
- **Deploy-poort**: pre-push git-hook (`.githooks/pre-push`) draait `npm run test:all`; rode tests
  blokkeren de push naar GitHub en dus Vercel. Lokaal en omzeilbaar met `--no-verify`, maar effectief
  voor een solo-dev. Bewees zich meteen (zie hieronder).
- **Toestandsmatrix** (`TOESTANDEN.md`): de opdracht-levenscyclus per overgang x rol. Legde naast de
  bekende wijziging-na-versturen-bug nog twee gaten bloot die we niet kenden.

## Gaten gedicht (alle in de monteur-werkpool, beide rollen e2e-gedekt)

1. Wijziging na versturen (datum): monteur houdt de afgesproken datum vast tot opnieuw verstuurd.
2. Geannuleerde klus: verdwijnt uit de werkpool (toewijzing blijft voor het dossier).
3. Concept lekte vóór versturen: verborgen tot verstuurd, eigen klussen blijven.
5. Monteur-wissel na versturen: oorspronkelijke monteur houdt de klus tot opnieuw verstuurd. Vereiste
   een RLS-uitbreiding (`schema-compleet-7`) plus een werkpool-query op de effectieve monteur.

## De poort verdiende zich twee keer terug

- Bij de batch UX-verbeteringen ving hij een e2e-regressie (selectors) voor de push.
- Bij gat 5 ving hij een ECHTE fout in mijn RLS-migratie: ik baseerde de policy op de oude 6c-versie
  i.p.v. 6e, waardoor de zaak-afscherming wegviel en een opdrachtgever de opdrachten van een andere
  zaak zou zien (privacy-lek). De opdrachtgever-e2e werd rood, de push geblokkeerd. Gecorrigeerd door
  de monteur-clause bovenop `mag_melding` te zetten (6e behouden). Zonder de poort was dit op
  productie beland.

## Eindstand

Unit/route 429 groen, integratie 10, e2e 35 (+7 mail achter vlag). Test-DB gemigreerd en geverifieerd.
Open actie: de gecorrigeerde `schema-compleet-7` nog op de PRODUCTIE-DB draaien (gat 5 is pas daarna
actief op productie; de code is veilig zonder, breekt niets). Resterend genoteerd open punt: kantoor
krijgt geen actieve melding bij een monteur-bevestiging (laag), en de opnieuw-versturen-keten (S11)
nog niet als volledige e2e.
