# Bevestigen vanaf de werkpool: status-badge + snelknop op de kaart

Datum: 2026-06-06

## Aanleiding

Reinier merkte op dat een monteur in de werkpool elke opdracht één voor één moest openklikken om te
zien of hij al bevestigd was én om te kunnen bevestigen. De werkpool-kaart (`OpdrachtCard`) toonde de
bevestig-status helemaal niet (de gekleurde strip ging alleen over spoed/open/opgeleverd), en de
bevestig-knop (`BevestigOntvangstKnop`) stond alleen op het detailscherm.

Dit was geen bewuste keuze om inhoudelijke beoordeling af te dwingen, maar dezelfde blinde vlek als
bij ontplannen: de overzichts-staat van een actie was weggevallen. Zie [[feedback_volledigheids-check]].

## Keuze

Reinier koos "allebei": bevestigen kan vanaf het overzicht én op het detailscherm. De kaart toont al
klant, adres en datum, dus bevestigen vanaf het overzicht is geïnformeerd, niet blind. Wie eerst de
volledige inhoud wil zien, klikt door en bevestigt op detail (knop blijft daar staan).

## Wijziging

- **Status-badge op elke werkpool-kaart**: geel "Te bevestigen" bij status `gepland`, groen
  "Bevestigd" bij `bevestigd`. Andere statussen geven geen badge. Logica in `urgentie.ts`
  (`bevestigBadgeConfig`), naast de bestaande badge-configs.
- **Snelknop op de kaart** (`BevestigKaartKnop`): "Ontvangst bevestigen", alleen bij status
  `gepland`. Zit in de klikbare kaart en onderschept de klik (preventDefault/stopPropagation), zoals
  het verwijder-icoon, dus klikken navigeert niet naar detail. Gebruikt dezelfde bevestig-route.
- De detail-knop (`BevestigOntvangstKnop`) blijft ongewijzigd.

## Tests

- `urgentie.test.ts`: 3 tests voor `bevestigBadgeConfig` (gepland/bevestigd/overige).
- Volledige unit-suite groen (419 tests). Productie-build slaagt.
- De bevestig-route zelf was al getest. Component-tests bestaan niet in dit project (geen
  jsdom/RTL); de testbare kern is daarom als pure functie in `urgentie.ts` gezet en daar getest.

## Bekend, los hiervan

Een aan een monteur toegewezen maar nog niet verstuurde klus (`concept_gepland`) kan al in zijn
werkpool verschijnen (de werkpool filtert op toewijzing, niet op status). Daar toont de kaart nu
correct geen bevestig-badge en geen knop. Of de monteur zo'n concept überhaupt al moet zien is een
aparte vraag, buiten deze wijziging.
