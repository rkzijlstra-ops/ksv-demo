# Brainstorm: invoer-unificatie

Twee delen. Part 1 = nu bouwen (werk-omschrijving-veld in zelf-invoer). Part 2 = ontwerpen, niet bouwen (alle invoer naar één gecombineerd veld).

## Part 1: werk-omschrijving op een zelf-aangemaakte klus

### Doel (één zin)
Een vrij-tekstveld (typen + spraak) voor "wat moet er gebeuren" op een klus die de monteur zelf aanmaakt, getoond en bewerkbaar op de monteur-detailpagina. Puur intern, niet in het opleverrapport.

### Bewuste keuze: NIET in het rapport (2026-06-14, Rein)
Eerst overwogen om de werk-omschrijving als context bovenin het opleverrapport te zetten. Geschrapt. Reden: dan moet de monteur er steeds op letten dat de tekst klant-net is, en dat dichttimmeren met waarschuwingen vervuilt de app (risico op overweldigen). Het veld blijft dus puur intern, als geheugensteun voor de monteur. Klant-zichtbare context kan hij kwijt in de meldingen, want die gaan wél in het rapport.

### Context
Dit gaat over klussen die een monteur **zelf** aanmaakt, buiten een aangesloten opdrachtgever om (ad-hoc, `opdrachtgever_id` = null). Die staan bewust niet op het dashboard/planbord, alleen in zijn eigen werkpool. Doel: kunnen opleveren naar partijen die niet aangesloten zijn. Een opdrachtgever die het dashboard gebruikt krijgt zijn klussen via het dashboard; dat staat hier los van.

### Hoort NIET bij Part 1
- Het opleverrapport (bewust geschrapt, zie hierboven).
- Dashboard/planbord-invoer of -bewerken (dat is Part 2).
- PDF-parser dit veld laten vullen (ad-hoc klussen hebben vaak geen PDF; later).
- Kantoor-bewerken van de werk-omschrijving.

### Datamodel
Nieuwe kolom `werkomschrijving text` op tabel `meldingen` (de opdracht-rij). Migratie `schema-compleet-19-werkomschrijving.sql`, idempotent (`add column if not exists`). Rein draait die één keer.

Bewust een eigen kolom, los van de `meldingen`-JSON (dat zijn per-artikel service-meldingen, andere betekenis).

### Toestandsmatrix (entiteit: werk-omschrijving op een opdracht)

| Overgang | Data | Monteur-UI | Rapport |
|---|---|---|---|
| Aanmaken (zelf-invoer) | insert `werkomschrijving` | textarea + spraak in OpdrachtAanmaken | niet in rapport |
| Tonen | select * | blok op `/opdracht/[id]` | niet in rapport |
| Wijzigen | update `werkomschrijving` | inline bewerken op `/opdracht/[id]` (textarea + spraak) | niet in rapport |
| Leeg | null | blok verbergen | niet in rapport |

Kantoor-kant van deze cellen = Part 2, bewust later (ad-hoc klussen raken kantoor nu niet).

### Wijzig-tegenhanger / auth
De bestaande `PATCH /api/opdrachten/[id]` is kantoor-only (monteur krijgt 403). De werk-omschrijving moet juist de monteur zelf kunnen aanpassen op zijn eigen klus. Daarom een eigen smalle route `PATCH /api/opdrachten/[id]/werkomschrijving` (patroon zoals `bevestigen`/`annuleren`). Mag: de toegewezen monteur (`toegewezen_aan` = self of `user_id` = self) én kantoor. RLS dekt dit ook af.

### UI-taal
Klus-taal. Label "Wat moet er gebeuren?" (sluit aan bij MeldingForm's "Wat is er aan de hand?"). Placeholder "Bijv. kasten nastellen". Spraak plakt achter bestaande tekst, net als in MeldingForm. SpraakOpname-component hergebruiken.

### Edge cases
- Geen internet: spraak vereist netwerk (SpraakOpname toont dat al); typen werkt offline. Opslaan van de klus vereist in deze flow toch al netwerk.
- Leeg: niet verplicht (niets is verplicht hier). Bij alleen-werkomschrijving telt het wel als "iets ingevuld" (zowel client-guard als server-`heeftVeld` aanpassen).
- Lange tekst: textarea + detailpagina-blok groeien mee.

### Teststrategie
- db-unit (chain-mock): `createOpdracht` stuurt `werkomschrijving` mee; nieuwe `updateWerkomschrijving`.
- route: POST `/api/opdrachten` slaat het op; PATCH werkomschrijving-route (monteur-eigen mag, vreemde monteur geweigerd).
- e2e (Playwright, Rein draait zelf): zelf-invoer met werk-omschrijving → detailpagina toont → bewerken.

## Part 2: alle invoer naar één gecombineerd veld (ALLEEN ONTWERPEN)
Na Part 1 uitwerken: dashboard-inschiet en de bewerk-velden in dashboard/planbord naar hetzelfde gecombineerde invoer-component, zodat kantoor net zo snel handmatig een klus kan invoeren (ref/klant/adres/tel + getypt/gesproken werk) zonder externe PDF. Daarna de losse oude invoer-versies opruimen. Apart design-document (in een verse terminal te starten).

### Vooronderzoek invoerkanalen (2026-06-14)
Alle huidige manieren waarop een klus de app in komt:
1. **Monteur zelf-invoer** (`OpdrachtAanmaken` + `POST /api/opdrachten`): de góede gecombineerde flow (PDF voorvullen + handmatig aanvullen + werk-omschrijving). Landt direct in de werkpool. Dit is het referentie-patroon voor het unified component.
2. **Dashboard-inschiet** (`InschietZone` + `POST /api/dashboard/inschieten`): alleen PDF's slepen, bulk, groepeert op referentie. GEEN handmatig aanvullen, GEEN review. = de "oude losse invoer" om te unificeren.
3. **Inbound-mail** (`POST /api/inbound` + `InboxItem` + `/api/inbound/[id]/bevestigen`): mail met PDF -> geparset tot een `te_verwerken`-voorstel -> monteur bevestigt BLIND (alleen de vlag om; geen nakijken/aanvullen vooraf, hooguit de detailpagina openen). Staat gepauzeerd (wacht op Resend Receiving + DNS; domein nu `klus.kluslus.nl`).
4. **Bewerk-velden** dashboard/planbord (kantoor-correctie `PATCH /api/opdrachten/[id]` + werk-omschrijving-route).

### Inbound hoort hierbij — combineren, niet apart bouwen (advies)
Inbound is gewoon een vierde invoerkanaal. De natuurlijke "bevestig dit voorstel"-stap IS wat Part 2 bouwt: het voorstel openen in het gecombineerde invoer-component, geparste velden nakijken/corrigeren, evt. getypt/gesproken werk erbij, dan bevestigen. Inbound dwingt bovendien een eis af die Part 2 toch al nodig heeft: een **"bestaand record nakijken/bewerken"-modus** (het voorstel bestaat al in de DB) — dezelfde modus als een bestaande klus bewerken. Ze komen dus samen.

**Advies:** bouw GEEN los inbound-review-scherm (zou Part 2 daarna weer ontdubbelen). In plaats daarvan:
- Part 2 = één gecombineerd **klus-invoer/bewerk-component** met twee modi: `nieuw` (aanmaken) en `bestaand` (nakijken/bewerken).
- Consumenten: dashboard-handmatig-invoer (nieuw), zelf-invoer (al deels), **inbound-bevestigen** (nakijken vóór de vlag om), en bestaande-klus-bewerken.
- Bulk-PDF-sleep (`InschietZone`) is een apart snel kanaal voor veel orders tegelijk; in het ontwerp beslissen of die blijft naast het component of erin opgaat.
- Geen druk om inbound los af te bouwen (gepauzeerd), dus prima om mee te nemen.

Te beslissen in het Part 2-ontwerp: scope van het component (welke velden + werk-omschrijving), de twee modi, per kanaal de wiring, wat er met `InschietZone` gebeurt, en welke oude paden daarna weg kunnen.
