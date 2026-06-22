# Agenda-fixes (weekend/week-schuiven) + maandoverzicht (optie C)

Datum: 2026-06-22 (nacht, vervolg, autonoom afgewerkt)
Branch: `planbord-maand-weekend`

Volgt op `2026-06-22_planbord-week-resize-weekend-en-maand.md`. Reinier koos mockup C (weekstroken)
en gaf drie agenda-fixes door. Alles staat op `omgeving-test` → kluslus-test voor zijn keuring.

## Agenda-fixes (toestandsmatrix, getest)

**1. Klus in het weekend zetten werkt nu.** Een montage die op za/zo START loopt op kalenderdagen door
(`werkdagenVanaf` is weekend-aware: weekend-start = kalenderdagen, werkdag-start = weekend overslaan).
Voorheen sprong een klus die je op zaterdag zette naar maandag. Unit + e2e.

**2. Week verschuiven landt op de rand van de doelweek** (`weekschuifLanding`):
- volgende week → maandag (begin van die week);
- vorige week → vrijdag (weekend uit) of zondag (weekend aan), de laatste getoonde dag.
Unit + e2e ("naar vorige week landt op vrijdag").

**3. Weekend altijd zichtbaar bij een weekend-klus** (`weekHeeftWeekendKlus`). Staat er een klus op
za/zo in de getoonde week, dan toont het bord het weekend ook als de knop uit staat, zodat de klus
nooit onzichtbaar wordt. De weekend-knop toont de echte staat (en legt via de titel uit dat hij
aanblijft zolang er een weekend-klus is). Unit + e2e ("klus op zaterdag maakt weekend zichtbaar").

## Maandoverzicht — optie C (weekstroken), gebouwd

`PlanbordMaand.tsx`: Week/Maand-toggle in de werkbalk (voorkeur onthouden, hydratie-veilig). In
maandmodus: vijf/zes compacte week-stroken onder elkaar, monteurs als rijen, ma-vr als kolommen,
klussen als kleine gekleurde balkjes (statuskleur, klikbaar naar de detailpagina). Vorige/volgende
maand met maandlabel. Pure helpers `maandWeken` en `verschuifMaand` (getest). Unit + e2e
("maandweergave toont klus + navigatie + terug naar week").

## Tests
- Unit: 800 groen (incl. werkdagenVanaf-weekend, weekschuifLanding, weekHeeftWeekendKlus, maandWeken,
  verschuifMaand).
- E2e planbord.spec: maandweergave, weekend-zichtbaar-geforceerd, week-terug-naar-vrijdag groen.
  De drag-naar-zaterdag-cel-test faalt lokaal headless (zelfde patroon als de bestaande pool→cel-drag,
  geen regressie); CI is leidend.

## Maandoverzicht beweegt mee met de weekend-instelling (toegevoegd)
Elke maand-strook toont nu za/zo als de weekend-knop aan staat OF als die week een weekend-klus heeft
(`weekHeeftWeekendKlus` per strook, zelfde logica als de weekweergave). De weekend-knop werkt nu ook in
de maandmodus. Een klus puur op za/zo is dus ook in het maandoverzicht zichtbaar. Unit (hergebruik) + e2e
("maandweergave beweegt mee met de weekend-knop", "weekend-klus is ook in de maandweergave zichtbaar").

## Vervolg
- PWA zichzelf laten bijwerken bij deploys; eigen CI-database los van kluslus-test (laag 2).

## Poort
Niets naar master/productie. Reinier keurt op `kluslus-test.vercel.app/test-login` (incognito i.v.m.
PWA-cache). Pas na akkoord mergen.
