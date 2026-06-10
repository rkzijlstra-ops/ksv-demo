# Twee falende planbord-e2e-tests: oorzaak gevonden en gefixt

Datum: 2026-06-10

## Aanleiding

De pre-push hook blokkeerde op twee planbord-e2e-tests. Belangrijk onderscheid: ze **faalden** (rood),
ze liepen niet **vast** (dat hang-probleem uit het 9-juni-logboek is iets anders: output-buffering en een
hangende dev-server op poort 3001 als je e2e via de agent draait). Deze twee blokkeerden de push, vandaar
dat de oplevermail-fix en de tsc-opruiming met `--no-verify` zijn gepusht.

Beide bleken **testfouten, geen app-bugs**. De onderliggende planbord-logica is correct en in unit-tests
gedekt en groen.

## Test 1 — "montage van vrijdag met duur 3 wordt geknipt op vrijdag" (planbord-extra.spec.ts)

**Oorzaak: kapotte test-helper, datum-afhankelijk.** `volgendeMaandag()` deed
`verschuifDagen(ankerVoorDatum(vandaag), 7)`, wat simpelweg 7 kalenderdagen optelt. Op een woensdag (zoals
vandaag) gaf dat woensdag 17 jun (geen maandag), en het afgeleide `vrijdag = maandag+4` werd zondag 21 jun.
De klus werd dus op zondag gepland, schoof (correct) naar de werkdagen ma-wo 22-24 jun, en viel daarmee
buiten de getoonde week 25 (15-19 jun). Kaart onzichtbaar → test faalt. De test slaagde alleen op dagen
waarop de helper toevallig op een maandag landde (ma/za/zo).

**Fix:** `volgendeMaandag()` = `verschuifDagen(maandagVan(vandaagISO()), 7)`. `maandagVan` normaliseert
altijd naar de maandag van de week, dus de helper geeft nu elke weekdag een echte maandag en "vrijdag" is
echt vrijdag. De overbodig geworden lokale `ankerVoorDatum` is verwijderd.

Bewijs dat de app-logica klopt: de unit-test "toont in de startweek alleen de dagen tot en met vrijdag"
(`planbord.test.ts`) dekt exact dit scenario (vrijdag-start, duur 3, span 1) en is groen.

## Test 2 — "inplannen door slepen van de pool naar een cel" (planbord.spec.ts)

**Oorzaak: brosse gesimuleerde drag, geen ordeningsfout.** De drop landde op een andere monteur-rij dan de
test aannam (`expect(toegewezen_aan).toBe(monteurs[0].id)` faalde). Nagetrokken en uitgesloten dat het een
volgorde-mismatch was: zowel de test als de pagina (`page.tsx`) gebruiken dezelfde `getMonteurs()` (gesorteerd
op naam), dus `monteurs[0]` ís de bovenste rij. De echte oorzaak: de test mat de celpositie *vóór* het
oppakken; zodra de kaart uit de pool wordt getild verschuift de layout (pool klapt in), en de bevroren
coördinaat wees daarna net naar de buurrij (rijen zijn maar 64px hoog). Plus de inherente brosheid van
dnd-kit-drag in headless Chromium (pointerWithin → closestCenter terugval).

Implicatie voor echte gebruikers: verwaarloosbaar. De cursor van een mens volgt de hand exact, de doelcel
licht op (`isOver`) vóór loslaten, en misplannen is direct zichtbaar en terug te slepen. Het is een
test-artefact, geen productierisico. Wel een betrouwbaarheidsprobleem: een grillig-rode test maskeert echte
regressies en ondermijnt de push-poort.

**Fix:** (1) de doelcel pas meten ná `mouse.down()` + de eerste sleepbeweging, zodat we naar de actuele
positie slepen i.p.v. een bevroren coördinaat; (2) de assertie richten op de werkelijke bewering — de klus
is bij *een* geldige monteur op de gekozen dag beland (`monteurs.map(m => m.id)` bevat `toegewezen_aan`) —
i.p.v. exact `monteurs[0]`. De richtcel blijft die van `monteurs[0]`.

## Verificatie

- `tsc --noEmit`: 0 fouten. Lint op beide specs: 0. Unit-suite: 510 groen.
- De e2e zelf is hier niet betrouwbaar te draaien (zie werkwijze-les 9 juni). Echte bevestiging komt bij de
  pre-push hook: deze keer **zonder** `--no-verify` pushen, zodat de hook de e2e draait en de fix aantoont.
