# DESIGN - Handleiding voor monteurs (in-app, auto-screenshots)

Datum: 2026-06-12
Status: ontwerp akkoord in brainstorm, klaar voor review en daarna implementatieplan
Sessie-context: nieuwe functie. Geen vervanging van bestaande flow.

## Aanleiding

Monteurs hebben een uitlegbron nodig voor de KSV-app: hoe loop je de kerntaak door, van
inloggen tot het versturen van het rapport. De handleiding moet er professioneel uitzien,
voor de monteur makkelijk te bereiken zijn, en bij elke appwijziging eenvoudig actueel te
houden. Handmatig screenshots bijwerken is te foutgevoelig en loopt altijd achter, dus de
plaatjes worden automatisch gegenereerd.

## Kernbeslissingen uit de brainstorm

1. **Vorm: een Handleiding-pagina in de app zelf** (route `/handleiding`), niet een losse
   mini-site en niet een PDF. De monteur is al ingelogd op zijn telefoon en bereikt de
   uitleg met een tik. Altijd actueel, werkt offline (PWA).
2. **Optie "losse mini-site" blijft open.** De inhoud wordt losgekoppeld van de
   weergave, zodat dezelfde bron later zonder dubbel werk als statische deelpagina
   geexporteerd kan worden (voor opdrachtgevers/demo's, zonder inlog).
3. **Screenshots worden automatisch gegenereerd** door een Playwright-script dat als
   monteur inlogt, in telefoon-formaat door de kern-flow klikt en per stap een plaatje
   schiet. Hergebruikt de bestaande Playwright-setup en monteur-auth.
4. **Screenshots draaien tegen de test-database** met een vaste demo-opdracht met
   nepgegevens (bijvoorbeeld "Fam. Jansen, Voorbeeldstraat 1"). Nooit een echte klant op
   een screenshot.
5. **Scope versie 1: alleen de kerntaak.** Opgezet om later schermen bij te schuiven
   (profiel, melding bewerken, rapport bekijken).
6. **Versie 1 is screenshot + tekst.** Geen pijlen/markeringen of animaties. Die kunnen
   later toegevoegd worden voor de lastigste handelingen (handtekening, spraak inspreken).

## Scope

### Wat erin zit (versie 1)
- Een `/handleiding` route, bereikbaar voor de monteur via een knop in het menu.
- De kern-flow in stappen, elk met een screenshot en uitlegtekst:
  1. Inloggen en de werkpool zien
  2. Een opdracht openen
  3. Een melding toevoegen (foto maken, spraak inspreken, urgentie)
  4. Naar opleveren gaan
  5. Foto's en handtekening zetten
  6. Versturen naar klant en zaak
- Een Playwright-script dat de screenshots ververst.
- Een vaste demo-seed in de test-database voor herhaalbare, schone screenshots.
- Een voorgekauwd commando om de screenshots opnieuw te genereren.

### Wat er (nu) niet in zit
- Pijlen, markeringen of overlays op de screenshots.
- Animaties of schermopnames.
- Schermen buiten de kerntaak (profiel, melding bewerken, rapport-preview).
- De losse mini-site-export zelf (wel: de inhoud wordt zo opgezet dat dit later kan).
- Handleidingen voor de rollen opdrachtgever en beheerder.

## Architectuur: drie losgekoppelde delen

Bewust gesplitst zodat elk deel los aanpasbaar is.

### 1. De inhoud (databron)
Eén bestand met de stappen. Elke stap bevat: een titel, de naam van het bijbehorende
screenshot-bestand, en de uitlegtekst. Dit is het bestand dat aangepast wordt als de
woorden moeten veranderen, zonder kennis van de weergave-code. De databron bevat geen
JSX/opmaak, alleen tekst en verwijzingen, zodat hij ook door een latere mini-site-generator
te lezen is.

### 2. De screenshot-maker (Playwright-script)
Een script (in `e2e/` of een aparte `scripts/`-map, te bepalen in het plan) dat:
- inlogt met de bestaande monteur-auth-sessie,
- een mobiele viewport zet (telefoon-formaat, zoals de monteur het ziet),
- naar de vaste demo-opdracht navigeert,
- per stap uit de databron het juiste scherm opent en een screenshot schrijft naar
  `public/handleiding/`.

De screenshot-bestandsnamen komen overeen met de namen in de databron, zodat weergave en
plaatjes gekoppeld blijven.

### 3. De weergave-pagina (`/handleiding`)
Een server-component die de databron uitleest en per stap de screenshot toont met de tekst
eronder, in een mobielvriendelijke verticale lijst. Plus een "Handleiding"-knop in het
menu (Skelet/UserMenu, exacte plek in het plan), zichtbaar voor de monteur.

## Demo-data en privacy

De screenshots worden gemaakt tegen de test-database (het bestaande `.env.test`-zijspoor),
niet tegen productie. Er komt een vaste demo-seed met:
- een demo-opdracht met nepgegevens (naam, adres, referentie),
- desgewenst een voorbeeld-melding en een voorbeeld-oplevering, zodat de schermen gevuld
  ogen.

Zo staat er op elke screenshot hetzelfde verzorgde voorbeeld en nooit een echte klant. De
seed is herhaalbaar (idempotent): opnieuw draaien geeft hetzelfde resultaat.

## Onderhoud (de "makkelijk aanpasbaar"-eis)

- **Tekst wijzigen:** open de databron, pas de zin aan. Klaar.
- **Een scherm is veranderd:** draai het voorgekauwde commando, het script ververst alle
  screenshots in `public/handleiding/`.
- **Nieuw scherm met uitleg:** voeg een stap toe in de databron en, indien nodig, een
  navigatiestap in het script. Klein, afgebakend handwerk.

## Foutafhandeling en randgevallen

- **Script faalt op een scherm:** het script stopt met een duidelijke melding welke stap
  misging, zodat plaatjes nooit half-ververst en stil verouderd raken.
- **Test-DB loopt achter op productie-schema:** bekend risico in dit project
  (schema-drift). Het script en de seed gaan uit van het actuele test-schema; bij een
  schema-fout volgt een duidelijke melding in plaats van een stille mislukking.
- **Ontbrekend screenshot-bestand:** de weergave-pagina toont een nette placeholder met de
  stapnaam in plaats van een gebroken plaatje, zodat een vergeten regeneratie zichtbaar is
  maar de pagina niet breekt.
- **Toegang:** `/handleiding` is bereikbaar voor de monteur (en beheerder). Geen
  gevoelige data, dus geen strikte rol-gate nodig; wel achter inlog zoals de rest van de
  app.

## Testen

Volgens de projectlijn (testen vast in de planning, meerdere lagen):
- **Unit:** de databron is geldig (elke stap heeft titel, screenshot-naam en tekst; geen
  dubbele namen).
- **E2e (Playwright):** de `/handleiding`-pagina laadt voor de monteur, toont alle stappen
  in volgorde, en elke verwachte screenshot-verwijzing is aanwezig.
- **Het screenshot-script zelf** is geen test maar een gereedschap; het draait los en
  faalt luid bij problemen.

## Hoe optie 3 (mini-site) later meekomt

Omdat de inhoud (deel 1) puur data is, kan later een kleine generator dezelfde databron en
dezelfde screenshots omzetten naar een losse statische HTML-pagina. Geen herschrijven van
teksten of opnieuw maken van plaatjes. Dit zit niet in versie 1, maar de opzet sluit het
niet uit.

## Open punten voor het implementatieplan
- Exacte plek van het screenshot-script (`e2e/` versus `scripts/`).
- Exacte plek van de "Handleiding"-knop in het menu.
- Vorm van de databron (TypeScript-bestand met een typed array ligt voor de hand, past bij
  de codebase en geeft meteen validatie).
- Of de demo-seed de bestaande e2e-seed hergebruikt of een eigen, los seed-script krijgt.
