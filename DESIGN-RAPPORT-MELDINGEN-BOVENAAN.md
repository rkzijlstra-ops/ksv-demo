# Rapport: meldingen bovenaan + foto's downloaden

Feedback van de opdrachtgever (Ed) op het opleverrapport. Drie punten, plus meegenomen: snel-opleveren-variant en de rapport-voorbeelden (app-preview + handleiding).

## Wat verandert

1. **Meldingen bovenaan + duidelijker**
   - Subtiele **meldingen-balk** direct onder de klantgegevens: kleur + Lucide-icoon + tekst.
     - **rood** (`urgent-rood`) als er minstens één spoedmelding is,
     - **oranje** (`accent`) bij gewone meldingen zonder spoed,
     - **groen** (`success`) als er geen meldingen zijn.
   - **Meldingen wordt sectie 1**, Oplevering sectie 2, Controle sectie 3. (Verkorting: Meldingen sectie 1, Oplevering sectie 2; geen controle.)
   - Foto-nummering loopt mee: **meldingen eerst** (1..n), daarna eindstaat.
   - Gewone melding krijgt een subtiel **oranje** linkerrandje + klein "Melding"-label; spoed blijft rood. (Nu heeft een gewone melding geen label.)

2. **Overzicht in rapport-volgorde**
   - Het overzicht (voorheen onder "Oplevering") staat als los blok bovenaan en de regels lopen in de sectie-volgorde: Meldingen, Eindstaat-foto's, Ondertekend, Video, Controle.

3. **Foto's downloaden (alleen opdrachtgever-versie)**
   - Twee actie-kaarten (ActieKaart-stijl) tussen overzicht en meldingen: **Foto's downloaden** en **Video van de oplevering**. De aparte "Bijlagen"-sectie vervalt.
   - "Foto's downloaden" linkt naar een nieuwe publieke pagina `/(publiek)/klus/[id]/fotos`: alle foto's als tegels met vinkje, in rapport-stijl, meldingen bovenaan mét meldingtekst. Knoppen **Download alles** en **Download selectie**, plus alles selecteren/wissen. Download = zip (server-side) met de originelen op volle resolutie; één foto komt los binnen.
   - **Niet** in de klant-versie (opmaak 1+2 wel in beide, downloadknop 3 alleen zaak).

## Reikwijdte / bestanden

- `src/lib/rapport-indeling.ts` (nieuw, pdf-lib-vrij): pure helpers, door alle renderers gedeeld en unit-getest.
  - `meldingenBalk(meldingen)` -> `{ aantal, spoed, status: 'geen'|'gewoon'|'spoed', tekst }`
  - `fotoDownloadGroepen(meldingen, eindstaatFotos)` -> geordende groepen (meldingen eerst) met doorlopend nummer per foto, bron-label en meldingtekst.
- `src/lib/rapport.ts` (PDF): herorden secties, meldingen-balk, actie-knoppen naar boven, kleuren, doelgroep-gate op de download-knop, foto-download-URL. Controle-rendering blijft (was al correct).
- `src/components/RapportWeergave.tsx`: zelfde herindeling; nieuwe optionele velden `fotoDownloadUrl` in `RapportWeergaveData`.
- `src/app/opdracht/[id]/rapport/page.tsx`: geef `fotoDownloadUrl` mee (preview = monteur ziet wat de opdrachtgever krijgt).
- `src/lib/handleiding-voorbeeldrapport.ts` + handleiding-pagina: voorbeeld toont de nieuwe indeling (auto via RapportWeergave); download-knop als demo.
- Nieuw: `src/app/(publiek)/klus/[id]/fotos/page.tsx` (server) + client-component + `route.ts` (zip). `fflate` als zip-lib.
- `src/lib/rapport.ts` foto-download-URL uit `APP_URL` + opdracht-id.

## Toegang / beveiliging

De downloadpagina en zip-route zijn **publiek**, gesleuteld op het opdracht-id (UUID). Dat is dezelfde beveiligingslaag als de al-bestaande publieke foto-URL's en de gemailde PDF-URL: niet-raadbaar, geen login. De zip-route accepteert alleen **indexen** in de eigen foto-lijst van die klus (geen willekeurige URL's), zodat er geen SSRF ontstaat. Bewuste keuze; als het strenger moet kan later een aparte token per klus.

## Waarom download i.p.v. bijlagen in de PDF

Foto's als PDF-bijlage sleep je alleen in Adobe en het maakt de mail-PDF zwaar (bounce-risico bij strenge DMARC). De downloadpagina houdt de PDF licht, werkt in elke viewer en op de telefoon, en laat gericht kiezen.

## Test-strategie (4 lagen)

- **Unit:** `rapport-indeling.test.ts` (balk-status/tekst, groepen + nummering), uitbreiding `rapport.test.ts` (verkorting-volgorde blijft geldig, download-knop-annotatie alleen bij zaak).
- **Component:** licht (via bestaande e2e/preview); geen zware nieuwe RTL-suite.
- **Integratie/route:** zip-route: onbekende klus -> 404, geldige selectie -> zip-bytes (PK-magic), lege selectie -> nette 400.
- **E2e:** later toevoegen op de kluspagina; eerst keuren op test-omgeving.

Bijwerken: `TESTDEKKING.md`, `TOESTANDEN.md`.
