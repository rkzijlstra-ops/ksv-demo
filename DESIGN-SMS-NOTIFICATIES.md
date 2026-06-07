# Design: SMS-notificaties voor monteurs

Datum: 2026-06-07
Status: ontwerp vastgelegd, klaar voor plan-fase
Context: maakt architectuurregel 5 waar ("Kanaal als instelling. Mail, SMS en WhatsApp omschakelbaar zonder herbouw"), zie `DESIGN-COMPLEET-SYSTEEM.md`. Brainstorm in deze sessie, 2026-06-07.

## Doel

Elke melding die nu per mail naar een monteur gaat, ook als SMS sturen. Reden voor SMS: betrouwbaar, valt op, werkt op elk toestel zonder app of opt-in. De monteur kan SMS in zijn instellingen deels of helemaal uitzetten, gesplitst in werk-kritieke en zachte meldingen. Mail blijft in alle gevallen doorgaan; SMS is een extra kanaal eroverheen.

Buiten dit ontwerp valt WhatsApp (mogelijk later, via dezelfde provider) en push (later, fundament wordt wel voorbereid). Beide schuiven later in dezelfde notificatie-laag zonder herbouw.

## Keuzes (vastgelegd in de brainstorm)

- **Echt versturen, nu.** Geen simulatie als eindbeeld; een betaalde provider wordt gekoppeld en stuurt echte SMS. Wel een dry-run-vangnet voor de demo (zie veiligheidsklep).
- **Provider: CM.com** (Nederlands, EU-hosting, AVG-vriendelijk, en geeft later een pad naar WhatsApp bij dezelfde partij).
- **Knop-model: twee categorieen** ("Werk-kritiek" en "Herinneringen/overig"), beide standaard aan, beide uit te zetten. Beide uit = helemaal geen SMS.
- **Bundelen**, gelijk aan de mail: een verstuurronde wordt een bundel per monteur. Een klus = details in de SMS, meerdere klussen = aantal plus app-link.
- **Push: later, nu voorbereiden.** De notificatie-laag wordt zo gebouwd dat push er als derde kanaal bij kan zonder de routes opnieuw aan te raken.
- **Bevestig-herinnering en scheduler horen bij deze ronde.** De overig-categorie wordt in een keer compleet gebouwd.

## Kosten (ter onderbouwing)

CM.com NL, schatting circa EUR 0,08 per SMS bij laag volume. SMS-teksten worden bewust plat gehouden (geen accenten, geen euro-teken) zodat elk bericht in een deel van 160 tekens past; anders valt het terug op 70 tekens per deel en betaal je dubbel.

Gebundeld kost een opdracht circa EUR 0,06 over zijn hele leven. Bij 80 tot 120 opdrachten per maand komt dat op EUR 5 tot 7 per maand. Verwaarloosbaar tegenover het beoogde abonnement van EUR 150 tot 250 per maand. De kosten zijn dus geen reden om SMS niet te doen; de enige echte hefboom is bundelen, en dat past op hoe de verstuurknop al werkt.

## Architectuur: een dunne notificatie-laag

Regel 5 maken we waar zonder de werkende mail om te bouwen.

1. **Kanaal-zenders.** `mail.ts` blijft de mail-zender (Resend), ongewijzigd. Nieuw: `sms.ts`, de SMS-zender (CM.com), op exact dezelfde manier ingekapseld als Resend, zodat een latere providerwissel alleen dat ene bestand raakt.
2. **Dispatcher.** Nieuw: `notificaties.ts`. Per monteur-gebeurtenis een functie die beslist welke kanalen vuren en ze aanroept. De API-routes (versturen, annuleren, ontplannen, documenten, en het nieuwe cron-endpoint) roepen die dispatcher aan in plaats van direct een mail-functie.
3. **Beslisregel per gebeurtenis:** mail gaat altijd (ongewijzigd). SMS gaat erbij als de monteur een geldig mobiel nummer heeft en de bijbehorende categorie-knop aanstaat.
4. **Best-effort, net als mail nu.** Een SMS-fout wordt een waarschuwing, blokkeert nooit de status-update. Dit volgt het bestaande patroon in de verstuur-route (status eerst, mail secundair).
5. **Push later.** Push schuift als derde kanaal in deze dispatcher. Nu geen pushwerk, wel deze naad.

### Eenheden en hun grens

- `sms.ts`: ruwe verzending. Input: ontvanger-nummer, platte tekst, afzender. Geen kennis van opdrachten of voorkeuren. Afhankelijk van: CM.com en env-config. Te wisselen zonder de rest te raken.
- `sms-teksten.ts`: pure functies die per gebeurtenis onderwerploze SMS-tekst bouwen. Geen IO. Los testbaar. (Parallel aan `monteur-mail.ts` voor de mail-teksten.)
- `notificaties.ts`: de dispatcher. Kent de gebeurtenissen en hun categorie, leest de voorkeuren en het nummer van de monteur, en kiest de kanalen. Afhankelijk van: `mail.ts`, `sms.ts`, `sms-teksten.ts`, de DB-laag.
- De API-routes: kennen alleen de dispatcher, niet de afzonderlijke kanalen.

## Datamodel

Toevoegen via een Supabase-migratie:

- `profielen.sms_werk_kritiek boolean not null default true`
- `profielen.sms_overig boolean not null default true`
- `meldingen.herinnering_verzonden_at timestamptz null` (voor de idempotentie van de bevestig-herinnering)

Plus uitbreiding van de `Profiel`-interface in `db.ts` met de twee booleans.

`telefoon` (bestaat al op het profiel) wordt hergebruikt als SMS-nummer. Bij opslaan in `mijn-gegevens` normaliseren naar internationaal formaat (`+31...`). Geen aparte kolom; het veld toont in de praktijk al een mobiel nummer (placeholder "06-12345678").

Voor push later komen er losse `push_*`-velden bij. Nu bewust geen generieke JSON-kanaalmatrix (overbodig, YAGNI). Expliciete kolommen zijn duidelijker en testbaarder.

## SMS-kanaal (CM.com)

`sms.ts` met een functie `verstuurSms({ naar, tekst, afzender })` die de CM.com Business Messaging API aanroept. Tijdens de bouw de exacte endpoint en payload uit de CM.com-docs halen.

- **Afzender = de keukenzaak** (max 11 tekens, alfanumeriek), zodat het multi-opdrachtgever klopt. Fallback naar `SMS_AFZENDER` uit env. Een alfanumerieke afzender is eenrichting (de monteur kan niet terug-sms'en); dat is prima voor meldingen.
- **Foutafhandeling** zoals bij mail: gooit bij een fout, de dispatcher vangt het en maakt er een waarschuwing van.
- **Veiligheidsklep voor de demo:** `SMS_DRY_RUN` (logt in plaats van verzenden) en `SMS_ALLOWLIST` (alleen verzenden naar nummers op de lijst). Zo kan een demo met nep-monteurs nooit vreemden sms'en. In `.env.test` staat dry-run standaard aan.

### Env-sleutels (in stijl van `.env.example`)

```
# ===== CM.com (SMS-notificaties) =====
CM_PRODUCT_TOKEN=
# Afzendernaam, max 11 tekens, alfanumeriek. Fallback als de zaaknaam ontbreekt.
SMS_AFZENDER=KSV
# Demo-vangnet: "1" logt SMS in plaats van echt versturen.
SMS_DRY_RUN=1
# Optioneel: komma-lijst van nummers waarnaar wel verzonden mag worden (demo).
SMS_ALLOWLIST=
# ===== Bevestig-herinnering (cron) =====
# Geheim waarmee het cron-endpoint zich identificeert (Vercel Cron stuurt dit mee).
CRON_SECRET=
# Na hoeveel uur zonder bevestiging een herinnering volgt.
HERINNERING_NA_UUR=24
```

**Actie vooraf (Reinier):** CM.com-account en product-token aanmaken. Zonder token kan er niet echt verzonden worden (dry-run werkt wel).

## SMS-teksten

Een pure bouwer per gebeurtenis in `sms-teksten.ts`. Bewust plat (geen accenten, geen euro-teken) en onder 160 tekens, zodat elk bericht een deel blijft. Bundel-regel gelijk aan `monteur-mail.ts`: een klus krijgt details (klant, datum, referentie, app-link), meerdere klussen worden "Je hebt N nieuwe/gewijzigde klussen, check de app: link".

Voorbeeld een klus:

```
Hoi Piet, nieuwe klus: Jansen, Voorschoten, ref 7398, di 10 jun. Bevestig in de app: ksv.app/x
```

## Welke SMS, welke categorie

| Gebeurtenis | Kanaal | Categorie / knop | Aanjager |
|---|---|---|---|
| Nieuwe/gewijzigde klus (gebundeld) | mail + SMS | Werk-kritiek | verstuur-route (bestaat) |
| Annulering | mail + SMS | Werk-kritiek | annuleer-route (bestaat) |
| Ontplanning (klus weggehaald) | mail + SMS | Werk-kritiek | ontplan-route (bestaat) |
| Nieuw document bij verstuurde klus | mail + SMS | Overig | documenten-route (nieuwe trigger) |
| Bevestig-herinnering | mail + SMS | Overig | cron-endpoint (nieuw) |
| Uitnodiging / afmelding | mail (blijft) | n.v.t. | onveranderd |

Uitnodiging en afmelding blijven mail-only: bij de uitnodiging is er nog geen nummer, bij de afmelding zijn de instellingen net weg. De monteur-knop gaat dus puur over de operationele meldingen plus de twee overig-meldingen.

## Nieuw-document als melding

De document-upload-route (`api/opdrachten/[id]/documenten`) stuurt nu niets naar de monteur; de "nieuw"-badge uit het ontwerp bestaat nog niet. We haken er een notificatie-aanroep in, met de voorwaarde "alleen als de opdracht al verstuurd is" (status `gepland` of `bevestigd`). Datum en monteur veranderen niet, dus dit dwingt geen herbevestiging af, conform `DESIGN-COMPLEET-SYSTEEM.md`. Loopt door de dispatcher: mail plus SMS in de categorie overig.

## Bevestig-herinnering en scheduler

- **Aanjager: Vercel Cron.** Een `vercel.json` met een cron-schema (bijvoorbeeld elk uur) dat een beschermd endpoint aanroept: `/api/cron/bevestig-herinneringen`. Beschermd met `CRON_SECRET` zodat niemand het publiek kan afvuren. Sluit aan op het bestaande API-route-patroon.
- **Wie krijgt een herinnering:** klussen die verstuurd zijn (status `gepland`), nog niet bevestigd, en waarvan het versturen langer dan `HERINNERING_NA_UUR` geleden is. Per monteur gebundeld in een bericht.
- **Niet dubbel sturen.** De kolom `herinnering_verzonden_at` markeert dat een herinnering is verstuurd; de scan slaat die rijen over. Bij opnieuw versturen of wijzigen wordt de kolom op leeg gezet via de bestaande `markeerVerzonden`, zodat een nieuwe ronde kan beginnen.
- **Kanalen:** mail (altijd) plus SMS (categorie overig), via dezelfde dispatcher.
- **Attentiesignaal bij Ed** bestaat al als de "niet bevestigd"-teller in het Te-doen-overzicht; dat raken we niet aan.

## Instellingen-scherm (monteur)

In het bestaande `mijn-gegevens`-scherm een blok "SMS-meldingen", alleen zichtbaar voor de rol monteur:

- Twee schakelaars: "Werk-kritiek" en "Herinneringen/overig", beide standaard aan.
- Het telefoon-veld krijgt de hint dat het nummer voor SMS wordt gebruikt.
- Geen geldig mobiel nummer ingevuld? Dan staan de schakelaars uit met de hint "vul je mobiele nummer in".
- De `mijn-gegevens`-route slaat de twee booleans op (uitbreiding van `EigenGegevensInput`).

## Toestandsmatrix

`TOESTANDEN.md`, kolom "Bericht/notificatie", per overgang aanvullen met mail plus SMS (en de bijbehorende categorie). Dit volgt het toestand-denken: de notificatie-kolom verandert, dus de matrix mee. De nieuwe gebeurtenissen (nieuw-document, bevestig-herinnering) komen als rijen of notities bij.

## Testen (vier lagen)

- **Unit:** SMS-tekstbouwers (puur, een en meerdere klussen, lengte onder 160, geen accenten); kanaal-keuze in de dispatcher (mock-zenders: nummer wel/niet, knop aan/uit, categorie); CM-client config en foutpad; selectie-logica van de herinnering (welke klussen kwalificeren) als querybare functie.
- **Integratie:** dispatcher samen met de DB-voorkeuren (sms aan/uit, geen nummer levert alleen mail); de cron-scan tegen de zijspoor-test-DB; idempotentie (tweede run stuurt niet opnieuw).
- **E2e:** het instellingen-scherm (schakelaars, nummer-validatie, schakelaars uit zonder nummer).
- Echte CM-verzending blijft in tests gemockt; dry-run als vangnet.

Sluit aan op het bestaande testbeleid (vier lagen, zijspoor-test-DB voor live data).

## Bouwvolgorde (grof, fijnmazig in het plan)

1. Datamodel-migratie (twee booleans, `herinnering_verzonden_at`) plus `Profiel` en `db.ts`.
2. `sms.ts` (CM.com, dry-run, allowlist) met unit-test.
3. `sms-teksten.ts` (pure bouwers) met unit-test.
4. `notificaties.ts` (dispatcher) met unit-test.
5. Bestaande routes (versturen, annuleren, ontplannen) omzetten naar de dispatcher.
6. Nieuw-document-trigger in de documenten-route.
7. Instellingen-scherm plus `mijn-gegevens`-route plus telefoon-normalisatie, met e2e.
8. Cron-endpoint plus `vercel.json` plus herinnering-selectie, met integratie- en idempotentie-test.
9. `TOESTANDEN.md` bijwerken.

## Open punten

- Exacte CM.com-endpoint en payload bij de bouw uit hun docs halen.
- Cron-frequentie (elk uur als startpunt) kan in de review nog wijzigen.
- Of de nieuw-document-melding ook een mail krijgt of alleen SMS: ontwerp zegt mail plus SMS voor consistentie; te bevestigen in de review als dat te veel mail oplevert.
