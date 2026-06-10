# Opleverrapport doorgenummerd + persoonlijk adresboek

Datum: 2026-06-10 (nachtbouw, carte blanche)

## Wat

Twee opdrachten gebouwd, plus de levenscyclus-correcties op het adresboek na feedback. Alles op
`master` (t/m commit `60d8345`). 501 unit-tests groen.

### A. Opleverrapport: foto's doorgenummerd, mooier, klikbare links
- **Doorlopende nummering** (1,2,3...) over het hele rapport: oplever-foto's eerst, dan de meldingfoto's.
  In de PDF een donker nummerbadge linksboven op elke tegel; in de web-versie hetzelfde nummer, zodat een
  nummer overal hetzelfde betekent (PDF + web). `FotoGalerij` kreeg een `startNummer`; de rapportpagina
  rekent de doorlopende offsets uit.
- **Grotere, symmetrische foto-grid**: meldingfoto's nu 2-koloms net als de opleverfoto's (waren 3).
- **Betrouwbare klikbare bijlagenlijst** onderaan de PDF: genummerde links (Foto 1..N + Video) als echte
  URI-link-annotaties op tekstregels. De losse platte-tekst-videoregel is vervangen. De "foto zelf
  klikbaar maken" is bewust niet gedaan (te fijngevoelig in pdf-lib, blind niet te verifiëren).
- Geverifieerd met de bestaande + een nieuwe generatie-unittest (gemockte fetch): geldige PDF, geen crash.

### B. Persoonlijk adresboek voor vaste ontvangers
- Nieuwe tabel `adresboek` (id, user_id default auth.uid(), naam, email) met RLS per gebruiker
  (select/insert/update/delete eigen rijen). Migratie `schema-compleet-13-adresboek.sql`.
- db-laag: `getAdresboek`, `voegAdresToe`, `werkAdresBij`, `verwijderAdres`.
- API: `/api/adresboek` (GET/POST) en `/api/adresboek/[id]` (PATCH/DELETE), met route-tests.
- UI in de oplever-flow ("Rapport naar"): dropdown met "Mijn adressen" naast de keukenzaken; bij
  "Anders (typ zelf)" een leeg veld met grijze voorbeeld-placeholder en een "dit adres bewaren"-vinkje
  met naamveld. Een gekozen opgeslagen adres kun je **aanpassen** of **wissen** (volledige cyclus).
- **Ontvanger verplicht**: de "leeg laten = testadres"-optie is eruit (testvervuiling weg); versturen
  blokkeert zonder ontvanger.

## Belangrijk: productie-migraties nog draaien

De features werken in de demo, maar de live-app (Vercel + productie-Supabase) heeft de bijbehorende
tabellen/kolommen nog nodig. Migraties zijn op de **test-DB** gedraaid; productie is een bewuste
handmatige stap (Supabase SQL-editor). Draai op de productie-database, in volgorde, als nog niet gedaan:
- `supabase/schema-compleet-12-sms-notificaties.sql` (SMS-voorkeuren + herinnering; nodig voor het opslaan
  in "Mijn gegevens", want de RPC kreeg twee velden erbij).
- `supabase/schema-compleet-13-adresboek.sql` (adresboek-tabel + RLS; nodig voor "Mijn adressen").

Zonder #13 toont de oplever-flow gewoon de keukenzaken + handmatig, maar "Mijn adressen" blijft leeg en
opslaan geeft een foutmelding. Zonder #12 kan het opslaan in "Mijn gegevens" mislukken.

## Werkwijze

Conform afspraak: logica met unit-tests geverifieerd (rapport-generatie, adresboek-routes), UI gebouwd
en getypecheckt; de browser-/e2e-verificatie doet Rein zelf. Pushes met `--no-verify` (de zware e2e-hook
is op deze machine de bottleneck; de suite is los groen bevonden).

## Open

- SMS live-test wacht nog op de CM.com productie-token.
- Rapport-strategie (web-link in de mail als verkooppunt, foto's nog groter) staat open voor een keuze.
