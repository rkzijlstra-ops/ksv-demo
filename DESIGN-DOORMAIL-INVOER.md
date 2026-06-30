# DESIGN: Doormailen als hoofd-invoerweg robuust maken

Datum: 2026-06-30
Branch: `feature/doormail-invoer`
Status: ontwerp, wacht op finaal akkoord Reinier

## Aanleiding

Reinier merkt in de praktijk: een opdracht invoeren door de mail simpelweg door te sturen
naar het persoonlijke inbound-adres is veruit de eenvoudigste weg. Bijlagen (PDF's) en de
beschrijving uit de mailtekst blijven behouden, terwijl je die bij handmatig downloaden en
inschieten kwijtraakt. Twee dingen staan die weg nu in de weg:

1. **Meerdere opdrachten in één mail.** De app voegt die nu stilzwijgend samen tot één klus
   (tenzij de PDF's verschillende referentienummers hebben). Een monteur die dat niet
   doorheeft gaat de fout in: één klus waar er twee hadden moeten zijn. Bij een klant is dat
   gezichtsverlies.
2. **Het inbound-adres is verstopt.** Het staat alleen onder menu > Mijn gegevens. Op het
   moment dat je een klus wilt toevoegen heb je het niet bij de hand.

## Beslissingen (vastgelegd met Reinier)

- **Feature 1: hybride splitsing.** Bij een vermoeden van meerdere opdrachten splitst de app
  niet stilletjes. Hij toont één voorstel met een gele waarschuwing en een knop "Splits in
  aparte klussen". De voorgestelde splitsing is al door de AI bepaald en bewaard; één tik op
  de knop levert de losse voorstellen op (per klus één). "Bevestig als één" houdt het één
  klus. Zo heeft de monteur de controle, maar het splitsen kost één tik in plaats van
  handmatig overtypen.
- **Feature 2: variant A.** Het inbound-adres komt als kopieerbare regel als gelijkwaardige
  derde manier in het klus-toevoegen-venster (`KlusInvoer`), direct onder de twee bestand-
  knoppen ("Bestand kiezen" / "Order fotograferen"). Permanent zichtbaar, geen verberg-toggle.
  Microcopy: *"Of mail de opdracht door — stuur een opdracht naar dit adres, dan staat de klus
  vanzelf in je kluspool."*

## Huidige situatie (zoals de code nu werkt)

- Inbound-mail komt binnen op `src/app/api/inbound/route.ts`. PDF's worden per stuk geparsed
  met Claude, daarna gegroepeerd met `groepeerInboundOrder` (`src/lib/inbound-groep.ts`).
  - Hooguit één (of geen) referentienummer -> **alles wordt één klus** (bewust, om te
    voorkomen dat een tweede PDF zoals een leidingadvies een lege klus wordt).
  - Meerdere verschillende refs -> per ref een aparte klus (correct, geen waarschuwing nodig).
  - Geen PDF -> één klus met het onderwerp als hint en de mailtekst in het werk-veld.
- Een **monteur**-mail wordt een voorstel met `te_verwerken = true` in zijn inbox
  (`/inbox`), dat hij bevestigt voor het een klus wordt (`InboxItem`, `inbound/[id]/bevestigen`).
  Een **kantoor**-mail wordt direct een klus op het dashboard.
- De upload-flow kan al meerdere klussen tonen en documenten per klus toewijzen
  (`MeerKlussen` in `KlusInvoer.tsx`, `POST /api/opdrachten/aanmaken`). Die bouwsteen
  hergebruiken we voor het uitsplitsen.
- Vergelijkbaar vlag-patroon bestaat al: `adres_keuze_nodig` + `adres_kandidaten` (jsonb)
  blokkeren plannen tot een mens het juiste adres koos (`schema-compleet-20`). De nieuwe
  splits-data volgt dat jsonb-patroon.

## Feature 1: vermoeden meerdere opdrachten, met splits-knop

### Detectie (bij binnenkomst)

Het vermoeden is alleen relevant wanneer de app zou **samenvoegen tot één klus** of een
**geen-PDF-mail** verwerkt. Bij meerdere verschillende refs splitst de app al correct.

Detectie als vangnet, in volgorde van zekerheid:

1. **PDF-flow, samengevoegd tot één groep terwijl er 2+ PDF's met inhoud waren:** verschillen
   die PDF-koppen in klant-kern of adres, dan is dat een vermoeden.
2. **Body-tekst, altijd:** een lichte Claude-inschatting over onderwerp + opgeschoonde body
   (+ de al-geparste PDF-koppen) die antwoordt: *bevat dit mogelijk meer dan één afzonderlijke
   opdracht, en zo ja welke?* Geeft `{ vermoeden, reden, delen[] }`.

Afweging: stap 2 kost één extra lichte LLM-call per mail (de flow duurt al 10-30s, dat valt
weg in de ruis). Bewust: een vals-positief is goedkoop (je tikt "Bevestig als één"), een
gemist geval is juist wat we willen voorkomen.

Bij een vermoeden bewaart de app de **voorgestelde splitsing** (welke delen, met per deel de
kop-velden en welke documenten erbij horen) plus de korte reden, en zet de vlag. Er wordt nog
niets uitgesplitst: het blijft één voorstel.

### Datamodel

Nieuwe migratie `supabase/schema-compleet-<n>-controleer-splitsing.sql` op `public.meldingen`:

- `controleer_splitsing boolean not null default false` — de waarschuwingsvlag.
- `controleer_splitsing_reden text` — korte uitleg voor de UI (mag null).
- `splits_voorstel jsonb` — de door de AI voorgestelde delen: per deel de kop-velden en de
  bijbehorende document-id's. Null als er geen splitsing voorgesteld is.
- Partial index op `controleer_splitsing = true` (analoog aan `meldingen_te_verwerken_idx`).

Draaien op alle drie de databases: test + demo via `npm run migrate:test`, productie doet
Reinier handmatig.

### UI en toestandsovergangen

Eén voorstel/klus met de vlag toont een gele waarschuwingsband ("Mogelijk meerdere
opdrachten" + reden) en drie acties:

- **Splits in aparte klussen** -> de bewaarde delen worden losse voorstellen (monteur:
  `te_verwerken = true`; kantoor: gewone klussen op het dashboard). De documenten verhuizen
  mee naar het juiste deel. Het oorspronkelijke voorstel verdwijnt. Op de nieuwe delen staat
  `controleer_splitsing = false`.
- **Bevestig als één** -> `controleer_splitsing = false`. Voor een monteur-voorstel tevens
  `te_verwerken = false` (wordt een gewone klus). De waarschuwing verdwijnt.
- **Weggooien** -> bestaande soft-delete.

De vlag blokkeert niets hard (anders dan `adres_keuze_nodig`); de klus blijft bruikbaar, hij
waarschuwt alleen. Beide rollen krijgen de splits/bevestig-acties: monteur in zijn inbox,
kantoor op het dashboard / de klusdetailpagina.

### Toestandsmatrix (voor TOESTANDEN.md)

| Situatie | te_verwerken | controleer_splitsing | splits_voorstel | Wat de gebruiker ziet |
|---|---|---|---|---|
| Monteur-mail, één opdracht | true | false | null | Gewoon voorstel in inbox |
| Monteur-mail, vermoeden meerdere | true | true | [delen] | Voorstel + gele band + splits-knop |
| Monteur tikt "Splits" | (nieuwe delen: true) | false | null | Losse voorstellen, zoals bij meerdere refs |
| Monteur tikt "Bevestig als één" | false | false | null | Gewone klus |
| Kantoor-mail, vermoeden meerdere | n.v.t. | true | [delen] | Klus op dashboard + label + splits-knop |
| Kantoor tikt "Splits" | n.v.t. | false | null | Losse klussen op het dashboard |

### API

- `POST /api/inbound/[id]/splitsen` — maakt per bewaard deel een nieuwe melding (hergebruikt
  `createOpdracht`), verplaatst de bijbehorende documenten (update `opdracht_id`), zet de vlag
  op de delen uit en verwijdert het origineel. Idempotent / rol-bewust.
- `POST /api/inbound/[id]/bevestigen` (bestaat) — uitbreiden zodat het ook
  `controleer_splitsing` wist.
- Een "bevestig als één / gecontroleerd"-pad voor kantoor (klus stond al op het dashboard):
  wist alleen de vlag.

## Feature 2: inbound-adres in het klus-toevoegen-venster (variant A)

Hergebruik van bestaande bouwstenen, geen nieuw mechanisme:

- `inboundAdres(token)` + `ensureInboundToken` (al gebruikt in `mijn-gegevens/page.tsx`).
- `KopieerKnop` (`src/components/KopieerKnop.tsx`), ingetogen knopje.

Aanpak:

- `src/app/page.tsx` (kluspool) en `src/app/dashboard/page.tsx` halen het inbound-adres op
  (zoals `mijn-gegevens` doet) en geven het als prop `inboundAdres` mee aan `KlusInvoer`.
- `src/components/KlusInvoer.tsx`: direct onder de rij met "Bestand kiezen" / "Order
  fotograferen" een blok "Of mail de opdracht door" met de microcopy, de kopieerbare
  adresregel (mono, `select-all`) en de `KopieerKnop`. Zelfde gestreepte/surface-stijl als de
  bestand-knoppen, zodat het als gelijkwaardige derde manier leest.
- Het adres blijft ook in Mijn gegevens staan (de "altijd terug te vinden"-plek). Eén bron,
  dezelfde functie. Geen toggle.

## Testaanpak (4 lagen)

1. **Unit:** de detectie (heuristiek op PDF-koppen) en de body-inschatting (LLM gemockt) ->
   juiste `vermoeden` + `delen` op representatieve gevallen.
2. **Integratie:** `POST /api/inbound` met een mail die meerdere opdrachten suggereert ->
   `controleer_splitsing = true` + gevuld `splits_voorstel`; één opdracht -> false/null.
   `POST /api/inbound/[id]/splitsen` -> juiste aantal nieuwe klussen, documenten correct
   verdeeld, origineel weg.
3. **E2e:** voorstel met gele band; "Splits" levert losse voorstellen; "Bevestig als één"
   levert één gewone klus. Kantoor: label + splits op het dashboard. Feature 2: adres +
   kopieerknop staan in het klus-toevoegen-venster op de kluspool.
4. **Regressie:** een normale één-opdracht-mail (met leidingadvies-PDF erbij) blijft één klus
   zonder waarschuwing; de bestaande adres-keuze-flow blijft werken.

`TESTDEKKING.md` en `TOESTANDEN.md` in dezelfde commit bijwerken.

## Scope / YAGNI

- **Wel:** detectie + bewaarde splitsing + waarschuwing + splits-knop + "bevestig als één";
  adres kopieerbaar in het venster (variant A).
- **Niet (nu):** een handmatig sleep/verdeel-scherm bij het splitsen (de AI-verdeling is
  leidend; klopt die niet, dan bevestig je als één of gooi je een fout deel weg). Pas bouwen
  als de AI-verdeling te vaak misgaat.
- **Niet:** de verberg/terugzet-toggle voor het adres.

## Openstaand (voor het PLAN)

- Exacte drempel van de heuristiek (stap 1) en de prompt + het schema van de body-inschatting
  (stap 2), af te stellen met echte voorbeeldmails.
- Precieze vorm van `splits_voorstel` (welke kop-velden, hoe de documenten gekoppeld worden).
- Migratienummer `<n>` op het eerstvolgende vrije nummer in `supabase/`.
