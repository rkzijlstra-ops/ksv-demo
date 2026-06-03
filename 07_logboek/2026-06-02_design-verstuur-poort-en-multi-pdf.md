# Design-aanvulling: verstuur-poort en meerdere PDF's

Datum: 2026-06-02
Project: `01_projecten/keukenstudio-voorschoten-demo`
Aangepast: `DESIGN-COMPLEET-SYSTEEM.md`

## Aanleiding

Reinier zag twee gaten in het complete-systeem-plan (versie 1):

1. Als de planner (Ed) meerdere opdrachten over verschillende monteurs, dagen en tijden inschuift en heen en weer corrigeert, wanneer en hoe gaat de mail naar de monteur? Het plan koppelde "plannen" en "versturen" per ongeluk aan elkaar, dus de monteur zou meldingen krijgen over half werk.
2. Kan een opdracht meerdere PDF's hebben, kan hij er meerdere tegelijk selecteren, en kan hij documenten toevoegen vóór en ná verzending?

## Beslissingen

**1. Verstuur-poort, los van plannen.** De planner schuift vrij op een planbord; opdrachten staan op "concept gepland" en gaan nog niet naar buiten. Pas bij een expliciete knop "Verstuur naar monteurs" gaat de melding eruit en wordt de status gepland (oranje). Bundelen per monteur: één mail per monteur met al zijn opdrachten van die ronde. Wijziging van een al verstuurde opdracht markeert als "gewijzigd, opnieuw versturen" en gaat mee in de volgende verstuur-actie.

Keuze Reinier: **versie 1 strak op alleen-de-knop**, geen schakelaar "stuur direct bij opslaan".

**2. Meerdere PDF's.** Multi-select en slepen kan. Groepering op referentienummer: zelfde ref wordt één opdracht met meerdere documenten, verschillende refs worden aparte opdrachten. Bij twijfel of ontbrekende ref een review-stap waarin Ed de groepering bevestigt. Documenten vrij toevoegen vóór verzending. Een document toegevoegd ná verzending geeft de monteur een melding plus "nieuw"-badge.

Keuze Reinier: **document-update geeft geen herbevestiging** (alleen datum/monteur/annulering valt terug naar te bevestigen).

## Vastgelegd in DESIGN-COMPLEET-SYSTEEM.md

- Functielijst Dashboard: multi-PDF met groepering op ref
- Functielijst Planning: verstuur-poort en bundelen per monteur (vervangt "live doorzetten")
- Functielijst Communicatie: melding afgevuurd door de verstuur-poort, niet bij elke wijziging
- Functielijst Context en dekking: documenten toevoegen vóór en ná verzending
- Statuskleuren: nieuwe sub-staat "concept gepland" (oranje strip, gestreepte rand)
- Flow happy path: stap 1 (multi-PDF), stap 3 (planbord), stap 4 (versturen), stap 9 (wijziging via verstuur-poort, document-uitzondering)

## Volgende stap

Terug naar de mockup-fase: detail-mockup (klantdossier, documenten aanklikbaar) en agenda-mockup. De verstuur-poort en het planbord-onderscheid moeten zichtbaar worden in de agenda-mockup.
