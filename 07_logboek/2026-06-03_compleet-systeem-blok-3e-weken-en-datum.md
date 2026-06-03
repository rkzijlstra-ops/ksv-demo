# Compleet systeem blok 3e: door de weken plannen + standaarddatum vandaag

Datum: 2026-06-03
Project: KSV demo-app

## Uit testfeedback

- Inplannen via het formulier defaultte op de maandag van de getoonde week (kon in het verleden
  liggen). Nu default = **vandaag** als vertrekpunt.
- Je kon alleen binnen de getoonde week plannen. Nu kun je **door de weken**: weeknavigatie is
  client-side (direct, want alle actieve opdrachten zitten al in de data) en je kunt een afspraak
  naar de linker/rechter **rand-sleepzone** slepen om hem een week terug/vooruit te schuiven; de
  weergave schuift mee.

## Wijziging

`PlanbordBord` is nu de hele interactieve planbord-laag: het houdt de getoonde week én een eigen
kopie van de opdrachten in client-state. Weeknavigatie (vorige/vandaag/volgende) en de
verstuur-knop zitten nu in het bord. De pagina is daardoor dunner (alleen header + bord).
Rand-zones `week-prev`/`week-next` zijn droppables; een kaart erheen slepen verplaatst hem +/-7
dagen (optimistisch) en zet de week mee door.

## Verificatie

- `npm test`: 319 groen.
- `npm run build`: slaagt. Geen SQL nodig.

## Open vraag van Reinier: één opdracht naar de monteur mailen

Echte mail is nog niet gebouwd (blok 4). De verstuur-knop doet nu alleen de statussprong naar
gepland. In blok 4 verstuurt de poort echt mail, gebundeld per monteur per ronde (design). Zie de
volgende sessie.
