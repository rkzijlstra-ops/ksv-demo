@AGENTS.md

## Opleverlat: ga alles na vóór je "klaar" of "werkt" zegt

Kluslus is een af product, geen demo. Het moet vanaf de eerste klant naadloos draaien; een haperende eerste ervaring breekt direct het vertrouwen. Deze lat is niet onderhandelbaar en geldt voor elke wijziging:

1. **Verifieer de héle reis, live, end-to-end** voor je iets klaar noemt. Beide rollen (kantoor én monteur), niet alleen de happy path. "Endpoint geeft 200" is GEEN bewijs dat het werkt: controleer dat de actie echt het juiste resultaat oplevert (data landt in de DB, het bericht komt aan, het scherm klopt, de status gaat over).
2. **Dek in één keer alles in wat redelijkerwijs te voorzien is** (de hele levenscyclus en de tegenhangers, alle statusovergangen, beide kanten). Laat Reinier er niet drie keer op terugkomen; doe de toestand-/keten-check vóór je bouwt en leid de controles daaruit af.
3. **Onderscheid bewust:** een haperend basispad fix je nu; tweaken-naar-smaak of -omstandigheden mag later, maar benoem dat expliciet (bij de demo kun je zeggen dat het kan).
4. **Geen over-engineering:** speculatieve randgevallen niet vooruitbouwen, foreseeable-noodzakelijke wél.

Kort: niet "het zou moeten werken", maar "ik heb de hele keten nagelopen en gezien dat het werkt".

## Logboek

Het logboek van dit project staat in `07_logboek/` in deze projectmap, niet in het Mainframe-logboek. Schrijf hier alle verslagen over de bouw, het ontwerp en de beslissingen van dit project (`YYYY-MM-DD_korte-beschrijving.md`, projectnaam niet nodig in de bestandsnaam). Alleen Mainframe-brede zaken (skills, MCP, backup, omgeving, overkoepelende strategie) gaan naar het Mainframe-`07_logboek/`. Zie de Mainframe-CLAUDE.md, sectie "Logboek-structuur".
