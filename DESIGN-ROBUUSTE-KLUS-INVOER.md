# Design: robuuste klus-invoer (meerdere/grote PDF's, twee-klussen-detectie, zinnige werkomschrijving)

Datum: 2026-06-20. Branch: `klus-invoer-robuust`. Aanleiding: tijdens testen in kluslus-test bleek dat de
klus-invoer maar één bestand leest, grote/veel bestanden een 413 geven, en de werkomschrijving bij inbound
mail de hele mailtekst dumpt.

## Doel

De klus-invoer bulletproof en soepel maken: meerdere en grote PDF's tegelijk aankunnen, de juiste gegevens
(referentie, telefoon) uit de orderbon halen ook als er tekeningen bij zitten, per ongeluk twee klussen in
één invoer netjes afhandelen (voorgroeperen, invoerder corrigeert), en alleen zinnige tekst in de
werkomschrijving zetten.

## Huidige situatie (bewezen tijdens diagnose)

- **Eén bestand gelezen:** `opdrachten/route.ts` parst alleen de eerste PDF (`files.find(pdf)`). Bij 3
  bestanden (Bovenaanzicht-tekening eerst) leest de app de tekening, niet de orderbon → ref + telefoon leeg.
  Bewezen met de echte parser: orderbon heeft ref 166 + tel 0628572148; de tekening niets.
- **413 bij grote/veel bestanden:** een enkele Leidingschema-PDF is 5-7 MB; Vercel laat een upload naar de
  serverfunctie maar tot ~4,5 MB toe. Grote tekeningen of meerdere bestanden samen overschrijden dat → 413.
  Harde platform-grens, geen instelling.
- **Werkomschrijving dumpt de mail:** `inbound/route.ts:193` = `parsed.werkomschrijving ?? hele mailtekst`.
  Zonder PDF-omschrijving belandt de complete mail (handtekening, disclaimer, reactie-historie) in het veld.
- **Foutreden verborgen:** parse-fout geeft de UI alleen "Kon het document niet automatisch lezen"; de
  echte reden (`body.fout`) wordt weggegooid.

## Ontwerp

### 1. Upload buiten de servergrens om (lost 413 op)

De browser uploadt elk bestand rechtstreeks naar Supabase Storage, niet via de serverfunctie. Patroon
bestaat al voor oplever-video's (`oplever-upload.ts`).

- Nieuw: `POST /api/opdrachten/upload-urls` (auth). Body: lijst `{filename, type, size}`. Valideert aantal
  (max bv. 20) en grootte per bestand (max 10 MB), en geeft per bestand een **signed upload URL** + opslagpad
  terug (server tekent met service-role; `createSignedUploadUrl` op de documenten-bucket).
- De browser PUT't elk bestand naar zijn signed URL (direct naar storage, geen servergrens).
- Daarna roept de browser `POST /api/opdrachten` aan met alleen de **opslagpaden** (kleine JSON-body), niet
  de bytes.
- De server haalt de order-PDF's server-side uit storage voor het inlezen, en legt de documenten-rijen aan
  die naar die paden verwijzen.

### 2. Inlezen + groeperen (één Claude-call, eerste pagina)

- Server pakt de **eerste pagina** van elk PDF (pdf-lib, al een dependency) → kleine buffers. (Foto's:
  ongewijzigd meesturen.) De kop-velden (ref, telefoon, klant, adviseur, leverweek) staan vrijwel altijd op
  pagina 1, dus dit is genoeg én goedkoop/snel.
- Nieuwe parser-functie `groepeerOrders(documenten)`: stuurt alle eerste-pagina's samen naar Claude met een
  tool die een **lijst orders** teruggeeft. Per order: de velden + `document_indices` (welke bestanden erbij
  horen) + documenttype. Bestanden zonder duidelijke order komen in een aparte groep "ongegroepeerd".
- **Vangnet (deterministisch):** een `refKern(ref)`-helper strip niet-cijfers, zodat `166` en `SP166`
  dezelfde kern `166` krijgen; gebruikt om groepen te labelen en om Claude's groepering te corrigeren als
  twee groepen dezelfde ref-kern + klantnaam blijken te hebben (samenvoegen).
- Per groep worden de velden samengevoegd: per veld de eerste niet-lege waarde over de bestanden
  (orderbon wint doorgaans omdat die de kop heeft).

### 3. Keuze-UI: voorgegroepeerd, invoerder corrigeert

In `KlusInvoer` na het inlezen:
- **Eén order gevonden** (de gewone situatie): velden voorgevuld, alle bestanden eronder, normale
  bevestig-/aanmaak-knop. Geen extra stap.
- **Meer dan één order** (of er zijn ongegroepeerde bestanden): toon de voorgestelde klussen gegroepeerd,
  bv. "Klus 166 - van der Velde (3 bestanden)" en "Klus 172 - Bavel (3 bestanden)", plus "Niet toegewezen".
  Elk bestand heeft een eenvoudige keuze (dropdown) "hoort bij: Klus 166 / Klus 172 / Niet toegewezen", zodat
  corrigeren makkelijk is. "Aanmaken" maakt één klus per groep met de toegewezen bestanden; "Niet
  toegewezen" wordt niet aangemaakt tenzij toegewezen.
- Spiegelt de bestaande adres-keuze (app signaleert, mens beslist).

### 4. Zinnige werkomschrijving per invoersoort

- Nieuwe helper `schoonOmschrijving(tekst)`: verwijdert reactie-historie (`> ...`, "Op ... schreef:",
  "Van:/From:"-blokken), handtekeningen ("Met vriendelijke groet", "Verzonden vanaf mijn iPhone") en
  standaard-disclaimers; houdt de eigenlijke boodschap. Deterministisch, geen AI.
- **Inbound mail:** `werkomschrijving = parsed.werkomschrijving ?? schoonOmschrijving(mailtekst)`.
- **PDF-order:** geen ruwe ordertekst in de werkomschrijving (losse velden dekken het); leeg laten.
- **Zelf typen:** ongewijzigd, blijft wat de gebruiker typt.

### 5. Foutreden zichtbaar

`KlusInvoer` toont bij een mislukt inlezen de echte reden uit `body.fout` (afgekort indien lang), in plaats
van alleen de algemene melding. Bestanden blijven bewaard, handmatig invullen blijft mogelijk.

## Componenten (interfaces, isolatie)

| Unit | Doet | Gebruikt door | Hangt af van |
|---|---|---|---|
| `lib/order-groep.ts` (`refKern`, `groepeerVangnet`, `voegVeldenSamen`) | puur groeperen/normaliseren/samenvoegen | parser-flow | niets (puur) |
| `lib/claude-client.ts` (`groepeerOrders`) | Claude-call die orders + groepering teruggeeft | route | Anthropic, schema |
| `lib/parser-schema.ts` (`GeparsteOrdersSchema`) | schema lijst-orders | claude-client | zod |
| `lib/pdf-eerste-pagina.ts` | eerste pagina uit een PDF (pdf-lib) | route | pdf-lib |
| `lib/mail-schoon.ts` (`schoonOmschrijving`) | mailtekst opschonen | inbound | niets (puur) |
| `api/opdrachten/upload-urls/route.ts` | signed upload URLs | KlusInvoer | storage (service-role) |
| `api/opdrachten/route.ts` | klus(sen) aanmaken uit opslagpaden + groepen | KlusInvoer | bovenstaande |
| `components/KlusInvoer.tsx` | upload + keuze-UI + foutreden | — | bovenstaande |

## Datastroom

browser kiest bestanden → `upload-urls` (signed URLs) → browser PUT naar storage → `POST /opdrachten`
(paden + actie=parse) → server: eerste pagina's → `groepeerOrders` → groepen terug → UI toont
(1 order = direct, >1 = keuze) → gebruiker bevestigt/corrigeert → `POST /opdrachten` (actie=aanmaken, per
groep) → klus(sen) + documenten in DB.

## Randgevallen (toestandsmatrix)

| Scenario | Upload | Inlezen/groep | UI | Aangemaakt |
|---|---|---|---|---|
| 1 orderbon | direct | 1 order | velden voorgevuld | 1 klus |
| orderbon + tekeningen (1 klus) | direct | 1 order, velden uit orderbon | voorgevuld, alle bestanden eronder | 1 klus, alle docs |
| 2 klussen gemengd | direct | 2 orders | gegroepeerd + corrigeren | 2 klussen, juiste docs |
| bestand zonder identiteit | direct | ongegroepeerd | "Niet toegewezen", mens wijst toe | naar gekozen klus |
| parse faalt | direct | fout | echte reden + handmatig | 1 klus, lege kop, docs bewaard |
| heel groot/veel | direct (buiten grens) | eerste pagina's | normaal | normaal |

## Teststrategie

- **Unit:** `order-groep` (166/SP166 samen, 172 apart, veld-merge eerste-niet-leeg), `schoonOmschrijving`
  (handtekening/quote/disclaimer eruit), upload-urls-validatie (aantal/grootte).
- **Route:** `upload-urls` (auth + geeft signed URLs), `opdrachten` aanmaken-uit-paden (groep → N klussen,
  juiste docs per klus), inbound werkomschrijving (schoongemaakt).
- **E2e:** invoer-flow met de keuze-stap (2 klussen → corrigeren → 2 klussen aangemaakt); 1-klus-flow
  (orderbon + tekening → ref/telefoon ingevuld).
- Register `TESTDEKKING.md` + toestanden in `TOESTANDEN.md` bijwerken.

## Buiten scope (bewust, YAGNI)

- Volledige drag-drop tussen groepen (een dropdown per bestand volstaat en is robuuster/testbaarder).
- Pagina's voorbij pagina 1 inlezen (kop-velden staan op pagina 1; uitbreiden kan later als nodig).
- Foto's downscalen / OCR-tuning.
- Samenvoegen over losse uploads heen (één upload-sessie = één groepering).

## Risico's / open punten

- **Storage-rechten:** de documenten-bucket moet signed upload URLs toestaan (service-role tekent; client
  PUT). Verifiëren dat de bucket/policy dat aankan; zo niet, policy toevoegen.
- **pdf-lib eerste pagina:** sommige PDF's (beveiligd/corrupt) laten zich niet splitsen; dan het hele bestand
  (of een nette fout) terugvallen.
- **Claude-groepering:** bij rommelige bestandsnamen/inhoud kan de groepering missen; daarom de
  corrigeer-stap als vangnet (de mens beslist altijd).
