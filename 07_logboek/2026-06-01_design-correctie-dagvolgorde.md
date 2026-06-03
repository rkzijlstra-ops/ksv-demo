# Design-correctie: dagvolgorde monteur-app

Datum: 2026-06-01
Document: `01_projecten/keukenstudio-voorschoten-demo/DESIGN-COMPLEET-SYSTEEM.md`

## Aanleiding

Reinier las het pas vastgelegde designdocument (Route A, compleet systeem) terug en vond één punt dat niet klopte: "Monteur-gemak: dagoverzicht op volgorde" stond onder buiten-scope versie 1, terwijl de opdrachten wél in de juiste volgorde in de app moeten staan.

## Analyse

Geen echte tegenstrijdigheid, maar één term met twee betekenissen:

1. **Chronologisch sorteren** (datum, dan tijd). Triviaal, gewoon een sortering op de opdracht-data. Architectuurregel 3 (schone datastructuur met expliciete start/tijd) maakt dit al mogelijk. Onmisbaar, dus hoort in versie 1.
2. **Route-volgorde** (handmatig herschikken, slepen, optimale bezoekvolgorde, navigatie). Zwaar werk, terecht fase 2.

Het document bundelde die twee onder één term, waardoor het leek alsof er in v1 geen volgorde was.

## Wijzigingen

- Nieuwe sectie **Monteur-app** in de functielijst versie 1: werkpool en dagoverzicht automatisch chronologisch gesorteerd (eerst datum, dan tijd; montage als dagblok bovenaan de dag, service op kloktijd; geen handmatig verslepen in v1).
- Buiten-scope-regel aangescherpt naar "handmatig herschikbare dagvolgorde", met verwijzing dat de automatische sortering wél in v1 zit.

## Status

Raamwerk weer kloppend. Klaar voor de plan-fase.
