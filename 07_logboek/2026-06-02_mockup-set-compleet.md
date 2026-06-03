# Mockup-set compleet voor de opdrachtgever-kant + ontwerp-consistentiecheck

Datum: 2026-06-02
Project: `01_projecten/keukenstudio-voorschoten-demo`
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` en de mockups in `public/mockups/`
Eerdere logs vandaag: `2026-06-02_design-verstuur-poort-en-multi-pdf.md`, `2026-06-02_agenda-optie1-en-invoermodel.md`

## Wat er nu ligt

De mockup-set voor de opdrachtgever-kant (het systeem rond de bestaande monteur-PWA) is compleet en onderling doorklikbaar, allemaal in de stijl van de PWA (Lexend, anthraciet + oranje accent, harde hoeken, statuskleuren):

1. `index.html` — overzicht van alle mockups
2. `dashboard.html` — opdrachtenoverzicht: inschieten (multi-PDF), "Te doen"-overzicht met tellers, zoek/filter, statusgroepen (incl. concept gepland), archief-affordance (14 dagen). Kaarten linken door naar de details.
3. `agenda-planbord.html` — **gekozen agenda-richting (optie 1)**: weekraster per monteur, "nog te plannen"-strook, inplannen-paneel (startdatum, aantal dagen, tijd optioneel), verstuur-knop met teller, montage als dagbalk, service als kaartje met tijd, meerdere services per dag op tijd gesorteerd, gewijzigd-markering.
4. `agenda-plankaart.html` — verworpen alternatief (optie 2), bewaard ter vergelijking.
5. `opdracht-binnen.html` — detail van een net ingeschoten opdracht: parser-velden (controleerbaar), meerdere PDF's met toevoeg-knop, dossier-check-attentie, "Inplannen op planbord".
6. `opdracht-opgeleverd.html` — opleverdossier als leesweergave, in dezelfde opbouw als de echte PDF: Oplevering/rapportage (eindstaat-foto's, handtekening, video, opmerking) en Meldingen (tekst + eigen foto's), documenten, keukenhistorie per ref.

## Belangrijkste ontwerpkeuzes deze sessie (samenvatting)

- Verstuur-poort: plannen en versturen losgekoppeld, één knop, bundelen per monteur, teller incl. gewijzigde opdrachten.
- Multi-PDF inschieten met groepering op referentienummer.
- Eén invoermodel voor tijd/duur (geen tijd = dagblok, wel tijd = kaartje); kloktijd-beleid per zaak uitgesteld, geen KSV-uitzondering in v1.
- "Te doen"-overzicht bundelt alle wachtende acties.
- Lijst-scoping: actief altijd zichtbaar, opgeleverd/geannuleerd laatste 14 dagen, ouder in archief, zoeken op ref.
- Referentienummer = per keuken; service erna behoudt de ref; context reist met de ref, niet met de monteur.
- Keukenhistorie wordt toegevoegd aan de bestaande monteur-PWA (HistorySection + OpdrachtCard), niet opnieuw gebouwd.

## Consistentiecheck (gedaan)

Hele ontwerp nagelopen. Drie kleine scheefheden uit oudere versies rechtgezet: Planning-regel naar het nieuwe invoermodel, status-opsomming aangevuld met "concept gepland" en "gewijzigd", en "eerdere opleverpunten" vervangen door "meldingen en opmerkingen" (opleverpunten als checklist was fictie; het echte rapport heeft meldingen + vrije opmerking). Eerder deze sessie ook twee echte documentfouten hersteld (kapotte flow-stap 6, oude "intern 07-15"-regel).

## Volgende stap

Het ontwerp is rond en consistent, klaar voor de plan-fase. Concreet hierna:
1. **Open beslispunt eerst onderzoeken: de agenda-component** (zelf bouwen versus FullCalendar o.i.d.). Dit bepaalt veel van de bouw en staat bewust nog open.
2. Daarna een geschreven bouwplan volgens de projectstart-discipline (brainstorm → plan → TDD), gefaseerd: datastructuur/migratie eerst, dan dashboard, dan agenda/planbord, dan de verstuur-poort en meldingen.
3. Pas dan code. Tot nu toe is er bewust niets in de broncode gewijzigd; alleen ontwerp en mockups.
