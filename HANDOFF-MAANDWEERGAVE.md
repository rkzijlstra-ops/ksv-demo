# Handoff: maandweergave planbord bouwen

Dit is een complete opdracht voor een volgende sessie. Reinier hoeft niets meer te instrueren,
behalve één keuze maken (welke mockup). Lees ook het project-`CLAUDE.md` (werkwijze + poort) en
`docs/OMGEVINGEN.md` (omgevingen) vóór je begint.

## Wat Reinier wil
Een knop op het planbord waarmee je wisselt tussen WEEK- en MAAND-weergave. De maandweergave toont:
- één hele maand in beeld, op één laptop-pagina (zonder veel scrollen),
- ALLE monteurs, ALLE klussen van die maand,
- vorige/volgende-maand-navigatie,
- klikken op een klus opent de detailpagina (zoals het weekbord nu).

## Stap 1 (Reinier): kies een mockup
Open en laat kiezen (ze staan in `public/mockups/`):
```
Start-Process msedge "file:///C:/Users/rkzij/ksv-worktrees/planbord-maand-weekend/public/mockups/maand-optie-a-kalender.html"
Start-Process msedge "file:///C:/Users/rkzij/ksv-worktrees/planbord-maand-weekend/public/mockups/maand-optie-b-zwembanen.html"
Start-Process msedge "file:///C:/Users/rkzij/ksv-worktrees/planbord-maand-weekend/public/mockups/maand-optie-c-weekstroken.html"
```
- A = klassieke maandkalender (7x5), meerdaagse montages als doorlopende balk.
- B = monteur-zwembanen (rijen = monteurs, kolommen = dagen 1..30 als gantt). **Aanbevolen** voor
  "alle monteurs + alle klussen overzichtelijk op 1 pagina".
- C = vijf mini-weekborden onder elkaar (meest vertrouwd, past nipt).

## Stap 2 (Claude): bouwen, test-first
Bouw op deze branch `planbord-maand-weekend` (of een verse branch off master als die al gemerged is).

Hergebruik wat er al is:
- `src/lib/planbord.ts`: `maandagVan`, `weekDagen(maandag, metWeekend)`, `verschuifDagen`,
  `werkdagenVanaf`, `plaatsOpdrachten`, `verdeelLanes`, `vindDubbeleBoekingen`, `weeknummer`.
- `src/components/PlanbordBord.tsx`: de DnD-context, weeknavigatie, zoek, pool, verstuur-knop,
  de weekend-knop, en de nieuwe `pasDuurToe`/resize. De maandweergave is een ANDERE render-modus
  binnen (of naast) deze component.
- `src/components/PlanbordGrid.tsx`: het weekraster met `Kaart` (incl. -/+ knoppen en resize-greep).

Aanpak:
1. Pure laag eerst (test-first in `planbord.test.ts`): functies om een maand te bepalen — bv.
   `maandRaster(ankerInMaand)` die de dagen van de maand teruggeeft (en bij optie A de kalender-cellen
   incl. lege dagen voor/na de maand), en een `plaatsInMaand`-achtige functie die per monteur/dag de
   klussen verdeelt. Houd het puur en getest, net als `plaatsOpdrachten`.
2. Component: een `PlanbordMaand`-component (of een modus-vlag in `PlanbordBord`) die het gekozen
   maand-layout rendert. Een toggle "Week | Maand" in de toolbar (voorkeur onthouden zoals de
   weekend-knop: `useSyncExternalStore` + localStorage, NIET useEffect-setState — dat faalt op lint).
3. Klikbare klussen = `Link` naar `/dashboard/opdracht/[id]?from=planbord&week=...` zoals nu.
4. Maand-navigatie: vorige/volgende maand (verschuif het anker een maand; let op maandgrenzen, UTC).
5. e2e in `planbord.spec.ts`: toggle naar Maand, een geseede klus is zichtbaar, vorige/volgende werkt.

Let op (geleerd deze sessie):
- Lint-regel verbiedt `setState` synchroon in een `useEffect`. Voor localStorage: `useSyncExternalStore`
  (server-snapshot = false) — zie de weekend-knop in `PlanbordBord.tsx` als voorbeeld.
- Refs (`useDraggable`-resultaat) niet als object benaderen in de render (lint `react-hooks/refs`);
  destructure ze (zie `Kaart`).
- Next.js 16 is afwijkend: lees `node_modules/next/dist/docs` bij twijfel (zie `AGENTS.md`).

## Stap 3: testen + opleveren via de juiste poort
- `npx tsc --noEmit`, `npx eslint <gewijzigde bestanden>`, `npx vitest run`, en de relevante
  `npx playwright test e2e/planbord.spec.ts`. De bestaande "slepen pool→cel"-test faalt lokaal
  headless (geen regressie; CI is leidend).
- `rm -rf .next && npm run build` (CI-pariteit).
- Zet het op TEST: `git push -f origin <branch-sha>:refs/heads/omgeving-test`. Dat deployt automatisch
  naar `kluslus-test.vercel.app` (productie-branch van dat Vercel-project staat sinds 2026-06-22 op
  `omgeving-test`). GEEN CI, dus geen DB-wipe.
- STOP-poort: meld het, laat Reinier keuren op `kluslus-test.vercel.app/test-login` (incognito i.v.m.
  PWA-cache). Pas na zijn akkoord mergen naar master (prod + demo). NOOIT zelf mergen.

## Status bij overdracht
Op deze branch staan al af (getest, op test-omgeving): Fix 1 (week→maandag), Fix 2 (-/+ dagknoppen),
de weekend-knop, en de destructieve-e2e-fix. Alleen de maandweergave-bouw is nog open.
