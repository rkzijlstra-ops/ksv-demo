# Agenda-component onderzocht: beslissing zelfbouw

Datum: 2026-06-02
Project: `01_projecten/keukenstudio-voorschoten-demo`
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (open beslispunt "Agenda-component") en `public/mockups/agenda-planbord.html`
Eerdere log vandaag: `2026-06-02_mockup-set-compleet.md`

## Vraag

Laatste open beslispunt uit het ontwerp: de agenda-component voor het planbord zelf bouwen versus een bestaande bibliotheek (FullCalendar o.i.d.). Eisen: eigen agenda als weergave op eigen opdracht-data (architectuurregel 2), weekraster met rijen per monteur en kolommen per dag, montage als meerdaags dagblok zonder tijd, service als kaartje met tijd gesorteerd, slepen vanuit een "nog te plannen"-strook, concept versus verstuurd, stack Next.js 16 + React 19 + Supabase, PWA, offline-vriendelijk.

## Belangrijkste inzicht

Het planbord is geen klassieke agenda (uren verticaal, dagen horizontaal) maar een resource-rooster: rijen per monteur, kolommen per dag, zonder uuras. Precies die weergave zit bij vrijwel elke kant-en-klare bibliotheek achter een betaalmuur.

## Onderzochte opties (juni 2026)

- **FullCalendar**: resource-timeline is Premium, $480 per dev per jaar. Tijd-as, zwaarder dan nodig.
- **Schedule-X**: resource scheduler is premium, EUR 479/jaar (2-3 devs) of EUR 999 lifetime. Modern, actief, React 19-vriendelijk. Tijd-as-model.
- **DayPilot**: Scheduler met resource-rijen zit in Pro ($649 intern / $1199 SaaS). Lite is gratis (Apache 2.0) maar zonder de roosterweergave.
- **SVAR**: MIT-core gratis, maar Resources-view zit in PRO (betaald). Tijd-as.
- **react-big-calendar**: gratis MIT, maar React 19-support onzeker (issue open sinds dec 2024), traag onderhoud, tijd-as-paradigma.
- **dnd-kit**: MIT, React 19 bevestigd, actief onderhouden, de standaard drag-and-drop in 2026. Bouwsteen voor zelfbouw.

## Beslissing (door Reinier)

**Zelfbouw**: het planbord als CSS-grid op basis van de bestaande mockup `agenda-planbord.html`, met dnd-kit voor het slepen vanuit de strook.

Onderbouwing:
1. Bij elke bibliotheek betaal je juist voor de ene feature die je nodig hebt (resource-rijen). Onnodige jaarlast voor een abonnementsproduct.
2. Het ontwerp wijst de bibliotheken af. De zware delen waar ze voor bestaan (uuras, slepen-naar-uur, resize, terugkerende afspraken, tijdzones, maandweergave) gebruik je bewust niet. Tijd voer je in als veld. Sluit aan op architectuurregel 2.
3. De mockup is al een werkend grid dat exact het ontwerp doet. Porten naar React + Tailwind is overzichtelijk.

Wat zelfbouw concreet inhoudt: grid-component (bestaat als HTML/CSS), datumrekenen voor week en meerdaags blok (klein, native of date-fns), slepen met dnd-kit, statuskleuren gestreept-versus-vol in CSS, inplan-formulier. Niet bouwen: uuras, slepen-naar-uur, resize, recurring, tijdzones.

## Status

Beslissing genomen. Nog steeds niets in de broncode gewijzigd. Volgende stap: geschreven bouwplan volgens projectstart-discipline, agenda-component als onderdeel van de gefaseerde bouw (datastructuur eerst, dan dashboard, dan planbord).
