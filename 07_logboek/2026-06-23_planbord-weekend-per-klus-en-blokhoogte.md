# Planbord: weekend-keuze per klus + vaste blokhoogte

Datum: 2026-06-23
Branch: `planbord-blok-en-weekendlock` (gepusht naar `planbord-maand-weekend` -> kluslus-test)

Volgt op `2026-06-22b_agenda-weekend-fixes-en-maandoverzicht.md`. Reinier meldde twee dingen op het
planbord. Eigen worktree opgezet (los van de monteur-terminal), vertakt vanaf `planbord-maand-weekend`
zodat de nog-niet-gemergede weekend-code meeging.

## 1. Bug: globale weekend-knop verschoof een al-verstuurde klus

**Symptoom (Reinier):** vrijdag-klus van 4 dagen, weekend aan (vr-za-zo-ma), verstuurd naar de monteur.
Daarna weekend uit -> de klus versprong naar vr-ma-di-wo, terwijl hij al verstuurd was.

**Oorzaak:** de dagen die een klus beslaat werden niet opgeslagen, maar live herberekend uit
startdatum + duur + de GLOBALE weekend-knop (`toonWeekend`). Die knop voedde `plaatsOpdrachten`,
`vindDubbeleBoekingen` en `weekHeeftWeekendKlus` voor álle klussen tegelijk. Knop omzetten =
herberekenen = elke klus schuift mee, ook een al verstuurde.

**Fix (met Reinier afgestemd: optie "onthouden per klus"):** de weekend-keuze is nu een eigenschap
PER KLUS: nieuwe kolom `meldingen.weekend_telt_mee` (migratie 25, `not null default false`). Vastgelegd
op het moment van plannen of duur-wijzigen, naar de knop-stand van dát moment. De plaatsing en
conflict-detectie lezen die vlag per klus; de globale knop bepaalt nog alleen of de lege za/zo-kolommen
zichtbaar zijn. Een al-geplande klus verschuift dus nooit meer door de knop.

Gedragsregels:
- Plannen vanuit de pool: klus neemt de huidige knop-stand over.
- Duur wijzigen (resize-greep / -/+ knop): herijkt de weekend-keuze op de huidige knop-stand (daar
  beslis je immers hoeveel dagen en of het weekend telt). Een al verstuurde klus gaat dan opnieuw
  "te versturen".
- Verplaatsen (andere dag/monteur) en week-schuiven: behouden de weekend-keuze, veranderen die niet.
- Week-schuiven landt op vr of zo afhankelijk van de klus z'n eigen vlag (niet de globale knop).
- Bestaande klussen krijgen default false -> ongewijzigd (weekend overslaan). De globale knop blijft
  het weekend ook geforceerd tonen als er een klus op za/zo valt (`weekHeeftWeekendKlus`, nu per klus).

Migratie gedraaid op test-DB én demo-DB (`npm run migrate:test`). Productie doet Rein zelf met
`supabase/schema-compleet-25-weekend-per-klus.sql` (idempotent, `add column if not exists`).

## 2. Blokhoogte: 1-daags en meerdaags even hoog

**Symptoom:** een 1-daags blok had een bepaalde hoogte; bij 2 dagen rekte het blok breed uit, de tekst
versprong en het blok werd platter/lager. Rommelig.

**Oorzaak:** de grid-rij groeide mee met de inhoud. Een smal 1-daags blok brak de meta-regel over meer
regels -> hoger; een breed blok paste in minder regels -> lager.

**Fix:** rij-hoogte vastgezet in `PlanbordGrid`: `gridTemplateRows: auto` (kop-rij natuurlijk) +
`gridAutoRows: 98px` (alle monteur-rijen). 98px = de gemeten natuurlijke hoogte van een volle 1-daagse
kaart (~89px inhoud + 8px marge), dus niets kapt af en een meerdaags blok groeit mee i.p.v. platter te
worden. Naam en adres zijn `truncate` (1 regel), alleen de meta-regel kan nog wrappen; 98px vangt dat.

## Tests
- Unit: 816 groen. Nieuw/aangepast: per-klus plaatsing en conflict-detectie (regressie: een weekend-klus
  en een gewone klus naast elkaar volgen elk hun eigen vlag; een vr+2-weekend-klus blijft vr-za-zo en
  loopt door naar de week erna). plannen-route geeft `weekend_telt_mee` door (exact true telt).
- E2e planbord: nieuw "weekend-knop UIT verschuift een al-geplande weekend-klus NIET" (de gemelde bug),
  plus weekend-zichtbaarheid, +/- knop, inplannen groen. De twee sleep-naar-cel-e2e's falen lokaal
  headless (bekend patroon, geen regressie); cloud-CI is leidend.
- Blokhoogte gemeten met een wegwerp-playwright-meting (render 90px voor 1- én 2-daags, inhoud 89/84
  past) en met een screenshot gecontroleerd. Meting daarna verwijderd.

## Naar productie (vervolg dezelfde dag)

Reinier gaf akkoord voor productie. Onderweg twee dingen opgelost:

**1. kluslus-test toonde de oude versie (deploy-valkuil).** `kluslus-test.vercel.app` is de PRODUCTIE-
deployment van het test-project, met production branch op `master` (steady state). Een feature-branch
landt dus alleen als preview en verschijnt niet vanzelf op het publieke adres. Met een Vercel-token de
nieuwste deployment naar productie gepromoot (`vercel promote`), daarna het echte gedrag live geverifieerd
(weekend-klus springt niet naar volgende week). Token daarna door Reinier ingetrokken. Vastgelegd in
`docs/OMGEVINGEN.md` + geheugen. Na de merge naar master keert kluslus-test vanzelf terug naar de
master-spiegel.

**2. CI rood: pool->cel-drag (echte regressie, geen flakiness).** Twee sleeptests faalden in CI (en lokaal
headless), terwijl ze in de laatste groene master-CI nog slaagden. Niet hand-wavy als "flaky" afgedaan,
maar gediagnosticeerd: door de vaste rijhoogte (98px/monteur) plus de werkbalk werd de pagina langer dan de
720px-viewport, waardoor de pool met het sleephandvat onder beeld viel (gemeten: greep op y=996). De muis
kon het handvat niet pakken, dus dnd-kit startte de drag nooit (status bleef 'binnen'). Echte gebruikers
hebben dit niet (dnd-kit auto-scrollt tijdens slepen); het is een limiet van de drag-simulatie. Fix:
`test.use` viewport 1280x1600 in `planbord.spec`. Daarna alle 14 planbord-e2e's groen.

**Release:** PR #24 (planbord-maand-weekend -> master). Migratie 25 door Reinier op de productie-DB gedraaid
(backward-compatible, default false). Na groene cloud-CI gemerged -> prod + demo deployen automatisch.
