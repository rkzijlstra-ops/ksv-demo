# Planbord: week-slepen, intuïtieve duur, weekend-knop, en maand-mockups

Datum: 2026-06-22 (nacht-sessie, autonoom afgewerkt)
Branch: `planbord-maand-weekend`

## Wat is gebouwd (af, getest, op de test-omgeving)

**Fix 1 — naar volgende/vorige week slepen landt op MAANDAG.**
Sleep je een klus via de rand-strook naar de volgende week, dan begon hij voorheen weer op
dezelfde weekdag (vrijdag bleef vrijdag). Nu landt hij op de maandag van de doelweek.
Pure functie `weekschuifNaarMaandag(iso, weken)` (planbord.ts), getest.

**Fix 2 — duur veranderen intuïtief gemaakt (-/+ knoppen).**
Het slepen van de rechterrand over het weekend was vaag (helemaal naar de schermrand slepen).
Nu staat op elke montage-balk een `−  N dagen  +`: één klik = één werkdag erbij/eraf, minimaal 1,
en het loopt vanzelf door over de weekgrens (de balk knipt op vrijdag, de rest verschijnt de week
erna). De rand-sleep blijft bestaan voor snel binnen-de-week bijstellen. Een al verstuurde klus die
korter/langer wordt, gaat opnieuw "te versturen" (zelfde mechaniek als de resize, gedeelde
`pasDuurToe`). Pure functie `duurNaStap`, getest; e2e "+ knop maakt een dag langer" groen.

**Weekend aan/uit (knop op het planbord).**
Knop "Weekend aan/uit" in de toolbar toont/verbergt za en zo als extra kolommen (7 i.p.v. 5).
Montages blijven werkdagen (weekend wordt overgeslagen); service-klussen kun je wel op za/zo zetten.
Weekendkolommen krijgen een lichte tint. Voorkeur onthouden in localStorage, hydratie-veilig via
`useSyncExternalStore` (server-snapshot = false, geen mismatch). Pure `weekDagen(maandag, metWeekend)`
getest; e2e "weekend-knop toont za/zo" groen.

**Maandoverzicht — 3 mockups klaar (Reinier kiest nog).**
`public/mockups/maand-optie-a-kalender.html` (klassieke maandkalender, 7x5),
`maand-optie-b-zwembanen.html` (monteurs als rijen, hele maand als gantt-tijdlijn — aanbevolen voor
"alle monteurs + alle klussen op 1 pagina"), `maand-optie-c-weekstroken.html` (vijf mini-weekborden
onder elkaar). De BOUW van de maandweergave wacht bewust op Reiniers keuze (zie handoff hieronder).

**Meegenomen: de destructieve-e2e-fix (laag 1).**
`planbord-extra.spec.ts` ruimde vóór elke run ALLE meldingen van de test-accounts op (per `toegewezen_aan`
/ `user_id`). Omdat kluslus-test en de CI dezelfde test-DB delen, wiste een CI-run zo Reiniers handmatige
testdata. Nu ruimt het bestand alleen zijn eigen PBX-getagde data op. Bewezen: na een volledige
planbord-extra-run (7 groen) stonden Reiniers twee opdrachten er nog steeds.

## Tests
- Unit: 790 groen (incl. weekschuifNaarMaandag, duurNaStap, weekDagen-weekend).
- E2e planbord.spec: + knop en weekend-knop groen; resize-tests groen. (De bestaande "slepen pool→cel"
  faalt lokaal headless, faalt ook op master, geen regressie; CI is leidend.)
- E2e planbord-extra: 7 groen.

## Afspraak / poort
Alles staat op `omgeving-test` → `kluslus-test.vercel.app` voor Reiniers keuring. NIET naar master
gemerged (de STOP-poort: Reinier keurt eerst). PWA-cache: in een gewoon venster kan de oude versie nog
gecachet zijn, gebruik incognito op `kluslus-test.vercel.app/test-login`.

## Open / vervolg
- Maandweergave bouwen na Reiniers mockup-keuze (zie `HANDOFF-MAANDWEERGAVE.md`).
- PWA zichzelf laten bijwerken bij nieuwe deploys (zodat incognito niet nodig is).
- Eigen CI-database los van kluslus-test (laag 2), zodat delen helemaal verdwijnt.
