# DESIGN: invoer-unificatie Part 2

Status: ONTWERP (nog niet gebouwd). Datum: 2026-06-14.
Vervolg op `BRAINSTORM-INVOER-UNIFICATIE.md` (Part 1 is gebouwd en live).

## Doel (één zin)
Eén gedeeld klus-invoer/bewerk-component met twee modi (nieuw + bestaand), zodat kantoor (Ed) en de monteur op dezelfde manier een klus kunnen typen, een PDF laten inlezen, of een mail laten doorsturen, met getypte/gesproken werk-context, en daarna plannen of zelf uitvoeren.

## Kernidee: één motor, twee gezichten
De **motor** (het component: velden + PDF-parse + werk-veld met typen/spraak) is gedeeld. Het **gezicht** verschilt per context: waar de klus landt, welke defaults, welke vervolgknop. Eén keer goed bouwen, op één rails, meerdere bestemmingen. Sluit aan op de architectuurvoorkeur (kern gedeeld, dun gezicht per context).

### Het verschil monteur vs kantoor

| | Monteur (app) | Kantoor (dashboard, Ed) |
|---|---|---|
| Waarvoor | klussen buiten een aangesloten opdrachtgever om (ad-hoc) | klussen die binnenkomen en gepland/verdeeld moeten worden |
| Waar landt 't | eigen werkpool, meteen doen | "te plannen"-lijst, eerst plannen |
| Eigenaar | `toegewezen_aan` = zichzelf, `opdrachtgever_id` = null | `opdrachtgever_id` = de zaak, `toegewezen_aan` nog leeg |
| Vervolg | zelf opleveren | inplannen + monteur toewijzen |

**Waarom de monteur-invoer telt (geen niche).** Twee redenen, beide kern-business:
1. **Opstartfase:** voordat een keukenzaak meedoet op het dashboard, zetten de monteurs de orders van die zaak **zelf** in de app (ze doen het inschiet-werk van de zaak). Zo draait de app al vóór een zaak is aangesloten.
2. **Niet-aangesloten zaken:** keukenzaken waar Rein wél voor werkt maar die (nog) niet meedoen — die orders wil hij ook via de app opleveren en in zijn eigen overzicht houden.

Gevolg: de monteur-invoer is **order-gedreven** (PDF van de zaak, klant/adres/referentie, een **keukenzaak** als naam zonder dashboard-account), niet een kaal werk-briefje. Het is dus grotendeels **hetzelfde component** als de kantoor-kant; het verschil is alleen de bestemming (eigen werkpool vs "te plannen") en dat de keukenzaak een ingevulde naam is. Zodra een zaak meedoet, doet die het inschieten zelf op het dashboard.

## Scope: wat WEL
- Eén component met twee modi:
  - **nieuw** (aanmaken): leeg of voorgevuld door PDF-parse; create.
  - **bestaand** (nakijken/bewerken): laadt een record dat al in de DB staat; update.
- Vier consumenten op één rails:
  1. **Kantoor handmatig invoeren** (dashboard) — nieuw.
  2. **Monteur zelf-invoer** (app) — nieuw (bestaat al als `OpdrachtAanmaken`, wordt het component).
  3. **Inbound-bevestigen** (mail → voorstel → nakijken) — bestaand.
  4. **Klus bewerken** (kantoor + monteur-werkomschrijving) — bestaand.
- Inbound gladgetrokken (zie aparte sectie).
- Dashboard-rail: Ed krijgt een inbound-adres + een "te verwerken"-strook op het dashboard.
- Werk-veld = hergebruik bestaande `werkomschrijving`-kolom (Part 1), met typen + spraak (`SpraakOpname`).

## Scope: wat NIET
- Slimme splitser voor rommelige multi-adres mails (incidenteel; kantoor regelt dat handmatig). Eén mail = één set voorstellen via de normale groepeer-logica.
- Werk-veld in het opleverrapport (Part 1-beslissing: blijft puur intern).
- Hernoemen van code "opdracht" → "klus" (terminologie-afspraak: UI = klus, code = opdracht blijft).
- Geen nieuwe nag-mechaniek: ongeplande klussen vallen al op via de planbord-pool + dashboard-tellers.

## Velden in het component
- **Kern (altijd zichtbaar):** referentie, klant_naam, klant_adres, klant_telefoon, opdrachtgever/keukenzaak, werk-omschrijving (typen + spraak).
- **"Meer velden" (uitklap):** klant_email, adviseur, leverweek, documenttype. **Standaard open op breed scherm (dashboard/laptop), dicht op smal scherm (telefoon), altijd handmatig te togglen.** Puur op schermbreedte, geen aparte instelling. Zo krijgt Ed op de laptop alles meteen, en is het op de telefoon rustig.
- **Planning** (alleen kantoor, bestaand): via de bestaande planbord-flow (niet in dit component dupliceren).
- **Parser-passthrough:** `meldingen` (niet bewerkbaar, wel bewaard/meegestuurd).

Reden: snel typen op de telefoon moet rustig en kort zijn; de parser-velden (e-mail/adviseur/leverweek) zijn zelden handmatig nodig maar moeten wél corrigeerbaar zijn, en op het brede dashboard is er ruimte genoeg om ze meteen te tonen.

## Indeling (GEKOZEN): één component, twee staten
Eén component dat van staat wisselt afhankelijk van of er al iets is ingevuld. De kracht van indeling 3 (uitnodigende sleep/typ-zone) bij een leeg blok, de rust van indeling 1 (velden voorop) zodra er iets staat.

- **Leeg / nieuw** (Ed begint zelf, niets gemaild): de sleep/typ-zone staat **groot bovenaan met uitleg-tekst** ("Sleep een PDF, of begin gewoon te typen"). De tekst maakt meteen duidelijk wat kan. Dit is de kracht van indeling 3, en zit hem in de tekst, niet in de blokgrootte. Daaronder een **hint met het mail-ontvangstadres** (de derde manier: "stuur een mail naar dit adres, dan staat 'ie hier vanzelf"), zodat alle drie de manieren (typen, slepen, mailen) zichtbaar zijn.
- **Gevuld** (mail binnengekomen, of na een sleep/parse): de velden staan **voorop**, de sleep-zone **krimpt tot een rustige strook** met een kort hintje. Het werk is dan "nakijken en aanvullen", geen afleiding meer.

Responsief: breed (dashboard/laptop) = velden mogen in twee kolommen, "meer velden" open; smal (telefoon) = alles onder elkaar gestapeld, "meer velden" dicht. Eén component, buigt mee.

### Kleine UX-eisen (besloten met Rein)
- **Bij invoer gaat het puur om DE ORDER binnenkrijgen, geen situatie-foto's.** Situatie-/defect-foto's horen later, on-site bij meldingen/oplevering, niet in het invoerblok.
- **Manieren om de order binnen te krijgen:**
  - PDF (slepen/kiezen) → parser leest uit + PDF wordt als document bewaard.
  - Foto van een papieren/uitgeprinte order (mobiel, knop **"Order fotograferen"**) → de app **leest de tekst over** (Claude vision) en vult de velden + bewaart de foto als document. Dit is de enige functie van de camera hier, secundair naast PDF.
  - Typen, en doormailen.
- **Apparaat-afhankelijk:** camera-knop alleen op de telefoon; desktop = slepen + **Bestand kiezen**. Knoplabel moet duidelijk maken dat de foto bedoeld is om de order te lezen, niet om losse foto's bij te voegen.
- **Parser uitbreiden:** order uitlezen uit PDF **of** foto (nu alleen PDF; `parsePdfWithClaude` → ook beeld).
- **Mail-adres kopiëren:** overal waar het inbound-adres getoond wordt (Mijn gegevens én de hint in het lege invoerblok) een **subtiel kopieer-knopje** met "Gekopieerd"-bevestiging, i.p.v. "houd ingedrukt". Ingetogen vormgeven, geen grote balk.
- **Volgorde media-blok:** de **documenten-lijst boven**, de **order-invoer (PDF/foto-knoppen) eronder**.
- **Stijl:** de mock-ups zijn schetsen voor de indeling; de echte bouw neemt **exact de app-stijl** over (tokens uit `globals.css`, bestaande componenten/Tailwind-klassen), dus verfijnder en consistent met de rest.

## Per kanaal de wiring
1. **Kantoor handmatig (nieuw):** "Nieuwe klus"-knop op het dashboard → component in modus nieuw → create met `opdrachtgever_id` = zaak, `toegewezen_aan` leeg → landt in "te plannen".
2. **Monteur zelf-invoer (nieuw):** bestaande knop in de app → component nieuw → create `toegewezen_aan` = self, `opdrachtgever_id` null → werkpool.
3. **Inbound (bestaand):** mail → `/api/inbound` maakt `te_verwerken`-voorstel(len), rol-bewust:
   - monteur-token → in zijn `/inbox`-bakje;
   - kantoor-token → in de dashboard "te verwerken"-strook.
   Openen = component bestaand, voorgevuld → nakijken/aanvullen → bevestigen (vlag uit) → te plannen (kantoor) / werkpool (monteur).
4. **Bewerken (bestaand):** bestaande bewerk-knop → component bestaand → update (nu met alle velden + werk-omschrijving).

## Bulk-PDF-sleep (GEKOZEN: gaat op in het component)
De losse `InschietZone` verdwijnt; de **sleep-zone wordt onderdeel van het component**. Eén sleep-zone, twee gedragingen:
- **Eén PDF (of meerdere van dezelfde keuken/ref):** het formulier opent voorgevuld → nakijken, aanvullen, opslaan.
- **Veel PDF's van verschillende keukens:** de app maakt ze in één klap aan in "te plannen" (gegroepeerd op ref, snel, geen formulier per stuk), elk daarna te openen om werk-tekst of een PDF toe te voegen.

Zo blijft bulk snel én is er één invoerweg. Inbound gebruikt dezelfde groepeer-logica (`groepeerOpRef`), zodat een mail met PDF's zich net zo gedraagt als slepen.

## Inbound gladtrekken (de vier punten uit de analyse)
1. **Groeperen op referentie** via `groepeerOpRef`: 5 PDF's zelfde keuken = één klus + 5 documenten (nu: 5 losse klussen).
2. **Mailtekst → `werkomschrijving`**: de body komt in het werk-veld, zodat doorgestuurde context meteen zichtbaar is.
3. **Bevestigen via het component** (nakijken/aanvullen) i.p.v. de huidige blinde vlag-omzet.
4. **Vreemde mail:** parser leest de body best-effort voor klant/adres/ref; de volledige tekst blijft als terugval in het werk-veld; voorstel krijgt de bestaande `aandacht`-markering ("laat controleren").

## Samenvoegen en botsingen (extra PDF bij een al gevuld blok)
Sleep je een PDF bij een al (deels) gevuld blok (app of dashboard), dan gaat hij door de parser en **vult aan**, hij overschrijft nooit zomaar:
- **Lege velden** → automatisch ingevuld.
- **Gevulde velden die kloppen** → niks.
- **Tegenstrijdig veld** (PDF-waarde ≠ bestaande waarde) → **nooit stil overschrijven**. Het veld krijgt een markering met **beide waarden** ("Adres — mail: Dorpsstraat 14 / PDF: Kerkstraat 9"), met één tik kies je welke. Default blijft de **bestaande** waarde staan.
- De **PDF wordt altijd als document toegevoegd**, ook als hij niets nieuws oplevert.
- Het **werk-veld** (mailtekst) wordt nooit overschreven; PDF-`meldingen` komen erbij, niet eroverheen.
- **Ander referentienummer** dan de klus → waarschuwing ("Deze PDF hoort bij KSV-…-0492, zeker bij deze klus voegen?"), want waarschijnlijk een andere keuken.

Kort: aanvullen waar leeg, met rust laten waar het klopt, bij botsing de gebruiker laten kiezen i.p.v. gokken.

## Twee gaten dichtmaken (besloten met Rein)
- **Gat A — gegevens wijzigen ná versturen waarschuwt de monteur niet.** Nu zet alleen een planning-wijziging (`/verplaatsen`) de `gewijzigd_te_versturen`-markering; een gegevens-PATCH (adres/tel/werk-omschrijving) doet dat niet, de monteur ziet stil oude gegevens. Oplossing: een gegevens-wijziging op een al-verstuurde klus zet óók de "gewijzigd"-markering, zelfde mechaniek als planning. (PDF toevoegen meldt al wel aan de monteur via `notificeerNieuwDocument`.)
- **Gat B — opgeleverde/geannuleerde klussen blijven bewerkbaar.** Nu geen status-slot op `OpdrachtBewerken`/PATCH. Oplossing: bewerken blokkeren of alleen-lezen maken bij status `opgeleverd` en `geannuleerd`.

## Toestandsmatrix (entiteit: binnenkomend/aangemaakt klus-voorstel)

| Overgang | Data | Kantoor-UI | Monteur-UI | Bericht |
|---|---|---|---|---|
| Aanmaken handmatig (kantoor) | insert, `opdrachtgever_id`, geen toewijzing | verschijnt in "te plannen" | n.v.t. | geen |
| Aanmaken handmatig (monteur) | insert, `toegewezen_aan`=self, ad-hoc | n.v.t. | in werkpool | geen |
| Binnenkomen via mail (kantoor) | insert `te_verwerken`, `opdrachtgever_id` | "te verwerken"-strook | n.v.t. | geen |
| Binnenkomen via mail (monteur) | insert `te_verwerken`, `toegewezen_aan`=self | n.v.t. | `/inbox`-bakje | geen |
| Nakijken/aanvullen | update velden | component bestaand | component bestaand | geen |
| Bevestigen voorstel | `te_verwerken`=false | naar "te plannen" | naar werkpool | geen |
| Weggooien voorstel | soft-delete (`verwijderd_at`) | verdwijnt uit strook | verdwijnt uit bakje | geen |
| Bewerken bestaande klus | update velden | component bestaand | werk-omschrijving | bij al-verzonden: bestaande gewijzigd-markering/mail |
| Inplannen | planning + toewijzing | planbord | na versturen zichtbaar | bestaande mail-flow |

Lege cellen zijn bewust n.v.t. (rol raakt die overgang niet).

## Teststrategie (lagen, in de planning opgenomen)
- **Unit:** `groepeerOpRef` hergebruikt in inbound; mailtekst→`werkomschrijving`-mapping; rol-bewuste defaults (`opdrachtgever_id`/`toegewezen_aan`) als pure helper; "vreemde mail"-terugval.
- **Route:** `/api/inbound` (groepeert, vult werk-veld, rol-bewust, aandacht); kantoor-create met `opdrachtgever_id`; uitgebreide PATCH (alle velden + werk-omschrijving); bevestigen zet vlag uit.
- **e2e (Rein draait zelf, PowerShell):** kantoor maakt handmatig een klus → staat in te-plannen → plant; inbound-voorstel openen → aanvullen → bevestigen → te plannen; bewerken met de nieuwe velden.
- **Migratie:** waarschijnlijk geen nieuwe kolom nodig (`werkomschrijving` en `opdrachtgever_id` bestaan al). Verifiëren; als er toch een kolom bijkomt, op BEIDE Supabase-projecten (prod doet Rein, test doe ik) wegens schema-drift-val.

## Opruimen (als laatste, na werkend geheel)
- `OpdrachtBewerken` opgaan in het component (of dunne wrapper eromheen).
- `InboxItem` blinde bevestig-knop vervalt; wordt een link naar het component (bestaand).
- Create-paden ontdubbelen waar mogelijk (`/api/opdrachten` vs `/api/dashboard/inschieten`).
- Pas opruimen als de nieuwe weg bewezen werkt; niet eerder.

## Beslist met Rein (alles akkoord)
1. Velden: kern altijd zichtbaar, "meer velden" responsief (breed open, smal dicht, togglebaar).
2. Indeling: één component, twee staten (leeg = sleep/typ-zone groot met uitleg; gevuld = velden voorop, zone klein).
3. Bulk-sleep gaat op in het component (geen losse InschietZone meer).
4. Samenvoeg-/botsing-regels: aanvullen, nooit stil overschrijven, bij conflict kiezen, ander ref = waarschuwing.
5. Gat A en Gat B allebei dichtmaken.
6. Inbound meenemen in Part 2 (groeperen, mailtekst in werk-veld, review i.p.v. blind, vreemde mail → aandacht).
7. Monteur-doormail blijft bestaan op dezelfde rails, kantoor-doormail is de hoofdweg.

Volgende stap: mock-up bijwerken naar de twee staten + een tegenstrijdig veld, daarna het plan (PLAN-INVOER-UNIFICATIE-2.md) met taken.
