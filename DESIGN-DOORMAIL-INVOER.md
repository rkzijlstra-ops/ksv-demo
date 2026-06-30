# DESIGN: Doormailen als hoofd-invoerweg robuust maken

Datum: 2026-06-30
Branch: `feature/doormail-invoer`
Status: ontwerp, wacht op akkoord Reinier

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

- Feature 1: **alleen waarschuwen** bij vermoeden van meerdere opdrachten. Niet automatisch
  splitsen. Een verkeerd gesplitste klus is erger dan een gemarkeerde; de monteur regelt de
  splitsing zelf (bevestigen als één, of de tweede klus handmatig bijmaken).
- Feature 2: het inbound-adres komt als kopieerbare regel in het **klus-toevoegen-venster**
  (`KlusInvoer`), dat al óp de kluspool staat. Permanent zichtbaar, geen verberg-toggle.
  Microcopy: *"Stuur een opdracht naar dit adres, dan staat de klus vanzelf in je kluspool."*

## Huidige situatie (zoals de code nu werkt)

- Inbound-mail komt binnen op `src/app/api/inbound/route.ts`. PDF's worden per stuk geparsed
  met Claude, daarna gegroepeerd met `groepeerInboundOrder` (`src/lib/inbound-groep.ts`).
  - Hooguit één (of geen) referentienummer -> **alles wordt één klus** (bewust, om te
    voorkomen dat een tweede PDF zoals een leidingadvies een lege klus wordt).
  - Meerdere verschillende refs -> per ref een aparte klus (correct, geen waarschuwing nodig).
  - Geen PDF -> één klus met het onderwerp als hint en de mailtekst in het werk-veld.
- Een **monteur**-mail wordt een voorstel met `te_verwerken = true` in zijn inbox
  (`/inbox`), dat hij eerst bevestigt. Een **kantoor**-mail wordt direct een klus op het
  dashboard.
- Er bestaat al een vergelijkbaar vlag-patroon: `adres_keuze_nodig` + `adres_kandidaten`
  blokkeren plannen tot een mens het juiste adres koos (`schema-compleet-20-adres-kandidaten.sql`).
  De nieuwe waarschuwing volgt exact dat patroon.

## Feature 1: waarschuwing "mogelijk meerdere opdrachten"

### Detectie

Het vermoeden is alleen relevant wanneer de app **samenvoegt tot één klus** of een
**geen-PDF-mail** verwerkt. Bij meerdere verschillende refs splitst de app al correct, dan
is er niets te waarschuwen.

Detectie als vangnet, in volgorde van zekerheid:

1. **PDF-flow, samengevoegd tot één groep terwijl er 2+ PDF's met inhoud waren:** als die
   PDF-koppen onderling verschillende klant-kernen of adressen hebben, is dat een vermoeden.
   (De huidige samenvoeg-regel bestaat juist om leidingadvies-PDF's niet te splitsen; het
   verschil tussen "tweede order" en "bijlage bij dezelfde order" is precies het twijfelgeval.)
2. **Body-tekst, altijd:** een lichte Claude-inschatting over onderwerp + opgeschoonde body
   (+ de al-geparste PDF-koppen) die één vraag beantwoordt: *bevat dit mogelijk meer dan één
   afzonderlijke opdracht?* Geeft `{ vermoeden: boolean, reden: string }` terug.

Afweging: stap 2 kost één extra lichte LLM-call per mail (de flow duurt al 10-30s, dat valt
weg in de ruis). Dat is bewust: een vals-positief is goedkoop (monteur kijkt even en
bevestigt), een gemist geval is juist wat we willen voorkomen. Een puur heuristische check
zonder LLM is broos op vrije mailtekst. Daarom de LLM-inschatting als vangnet, met de
goedkope heuristiek (stap 1) als versterkend signaal.

Bij een vermoeden zetten we de nieuwe vlag op het aangemaakte voorstel/klus. De `reden`
bewaren we kort zodat de waarschuwing kan tonen waaróm.

### Datamodel

Nieuwe migratie `supabase/schema-compleet-<n>-controleer-splitsing.sql`:

- `controleer_splitsing boolean not null default false` op `public.meldingen`.
- `controleer_splitsing_reden text` (korte uitleg voor de UI, mag null).
- Partial index op `controleer_splitsing = true` (analoog aan `meldingen_te_verwerken_idx`).

Draaien op alle drie de databases: test + demo via `npm run migrate:test`, productie doet
Reinier handmatig.

### UI en toestandsovergangen

- **Monteur (inbox-voorstel):** het voorstel toont een duidelijke waarschuwingsregel
  "Controleer: mogelijk meerdere opdrachten in deze mail" + de korte reden. Twee uitwegen:
  - Bevestigen als één klus -> `te_verwerken = false`, `controleer_splitsing = false`. De
    waarschuwing verdwijnt, het wordt een gewone klus.
  - De tweede klus handmatig bijmaken via de bestaande invoer, daarna het voorstel bevestigen.
- **Kantoor (klus op dashboard):** de klus krijgt een zichtbaar label "Controleer splitsing".
  Een expliciete actie "Gecontroleerd / het is er één" wist de vlag.
- De vlag blokkeert niets hard (anders dan `adres_keuze_nodig`); hij waarschuwt alleen. Reden:
  de klus is bruikbaar, alleen mogelijk onvolledig. Hard blokkeren zou de simpele weg juist
  weer omslachtig maken.

### Toestandsmatrix (kort, voor TOESTANDEN.md)

| Situatie | te_verwerken | controleer_splitsing | Wat de gebruiker ziet |
|---|---|---|---|
| Monteur-mail, één opdracht | true | false | Gewoon voorstel in inbox |
| Monteur-mail, vermoeden meerdere | true | true | Voorstel + waarschuwingsregel |
| Monteur bevestigt voorstel | false | false | Gewone klus |
| Kantoor-mail, vermoeden meerdere | false | true | Klus op dashboard + label |
| Kantoor klikt "gecontroleerd" | false | false | Klus zonder label |

## Feature 2: inbound-adres in het klus-toevoegen-venster

Hergebruik van bestaande bouwstenen, geen nieuw mechanisme:

- `inboundAdres(token)` + `ensureInboundToken` (al gebruikt in `mijn-gegevens/page.tsx`).
- `KopieerKnop` (`src/components/KopieerKnop.tsx`), met de `select-all`-regel ervoor.

Aanpak:

- `src/app/page.tsx` (kluspool) en `src/app/dashboard/page.tsx` halen het inbound-adres op
  (zoals `mijn-gegevens` het doet) en geven het als prop `inboundAdres` mee aan `KlusInvoer`.
- `src/components/KlusInvoer.tsx` toont, naast de bestaande opties (bestand kiezen, order
  fotograferen, handmatig), een kopieerbare adresregel met de microcopy hierboven.
- `mijn-gegevens` houdt het adres ook (blijft de "altijd terug te vinden"-plek). Geen toggle,
  geen dubbele bron van waarheid: hetzelfde adres uit dezelfde functie.

## Testaanpak (4 lagen)

1. **Unit:** de detectie-functie (heuristiek op PDF-koppen) en de body-inschatting (met de
   LLM-call gemockt) -> juiste `vermoeden`-uitkomst op representatieve gevallen.
2. **Integratie:** `POST /api/inbound` met een mail die meerdere opdrachten suggereert ->
   `controleer_splitsing = true` op het aangemaakte voorstel; met één opdracht -> false.
3. **E2e:** inbox toont de waarschuwingsregel; bevestigen wist de vlag en levert een gewone
   klus. Voor kantoor: label op het dashboard, "gecontroleerd" wist het. Feature 2: het
   adres + kopieerknop staan in het klus-toevoegen-venster op de kluspool.
4. **Regressie:** een normale één-opdracht-mail (met leidingadvies-PDF erbij) blijft één klus
   zonder waarschuwing; de bestaande adres-keuze-flow blijft werken.

`TESTDEKKING.md` en `TOESTANDEN.md` in dezelfde commit bijwerken.

## Scope / YAGNI

- **Wel:** detectie + waarschuwing + handmatige afhandeling; adres kopieerbaar in het venster.
- **Niet (nu):** automatisch splitsen, een splits-wizard, of het uit elkaar trekken van de
  body in losse klussen. Pas bouwen als blijkt dat handmatig bijmaken te vaak voorkomt.
- **Niet:** de verberg/terugzet-toggle voor het adres. Overbodig zodra het adres op de juiste
  plek staat.

## Openstaand

- Exacte drempel van de heuristiek (stap 1) en de prompt van de body-inschatting (stap 2)
  worden in het PLAN vastgelegd en met echte voorbeeldmails afgesteld.
- Migratienummer `<n>` invullen op het eerstvolgende vrije nummer in `supabase/`.
