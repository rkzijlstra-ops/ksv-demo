# Plan blok 3: planbord (eigen agenda)

Datum: 2026-06-03
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (Planning), mockup `public/mockups/agenda-planbord.html`
Besluit: zelfbouw CSS-grid (zie `07_logboek/2026-06-02_agenda-component-onderzoek.md`).

## Opgesplitst
- **Blok 3a:** planbord-weergave (weekraster) + inplannen via formulier + verstuur-poort-knop.
  Volledige plan-lus zonder de zware sleep-laag.
- **Blok 3b (later):** slepen-en-neerzetten met dnd-kit als gebruiksgemak bovenop.

## Blok 3a taken
- B3a-1 `src/lib/planbord.ts` (+ test): datum-helpers (maandagVan, weekDagen, verschuifDagen,
  weeknummer) en plaatsing (monteurRijen, plaatsOpdrachten: montage = dagblok met span,
  service = kaartje, geknipt op vrijdag, niet-geplande statussen weg).
- B3a-2 endpoints (+ tests): `POST /api/opdrachten/[id]/plannen` (planOpdracht) en
  `POST /api/dashboard/versturen` (verstuurNaarMonteurs, statussprong; mail volgt blok 4).
- B3a-3 componenten + `/planbord`: PlanbordGrid (raster), PlanbordPool (te-plannen + inplan-
  formulier: monteur/datum/dagen/tijd), VerstuurKnop, weeknavigatie, navlink op het dashboard.
- B3a-4 build/test groen, logboek, commit.

## Keuzes
- Monteurs = afgeleid uit `toegewezen_aan` van geplande opdrachten (geen monteurs-tabel nog;
  die komt in blok 6). Inplannen via vrije invoer met datalist van bekende namen.
- Inplannen via formulier i.p.v. slepen (3a); slepen is 3b.
- Verstuur-knop doet nu alleen de statussprong; de mail naar monteurs is blok 4.

## Niet in dit blok (bewust)
- Slepen-en-neerzetten (blok 3b, dnd-kit).
- Montage die vóór de getoonde week begon en erin doorloopt (spill-in), later.
- Mail bij versturen (blok 4).
