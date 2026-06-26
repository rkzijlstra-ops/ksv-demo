# Onderzoek: PDF's voor de monteur (openen en lezen in de app)

Datum: 2026-06-26
Status: documentatie + verbeterrichtingen. Niets gebouwd. Opschoonlijst "keukenzaak" staat los/on hold.

Doel: vastleggen hoe PDF's nu werken, met focus op de monteur die documenten (orderbon,
bovenaanzicht, leidingschema, offerte, werkbon, opleverrapport) tijdens een klus steeds opent en
leest, en waar verbeteringen liggen. Sluit aan op het bestaande multi-pdf-design
(`07_logboek/2026-06-02_design-verstuur-poort-en-multi-pdf.md`) en de veld-extractie
(`docs/plannen/PLAN-KLUS-VELDEN-EXTRACTIE.md`).

## 1. Hoe het nu werkt

**Binnenkomst en uitlezen (kantoor):**
- Kantoor laadt een of meer PDF's via `POST /api/dashboard/inschieten` (max 10MB/bestand).
- Per PDF wordt alleen pagina 1 naar Claude gestuurd (`src/lib/pdf-eerste-pagina.ts`), wat grote
  bestanden (leidingschema 4.9-6.5MB) terugbrengt naar ~300KB voor de parsing.
- Claude (`src/lib/claude-client.ts`, model claude-sonnet-4-6) haalt de kop-velden eruit:
  klant, adres, referentie, adviseur, telefoon, e-mail, leverweek, documenttype, en bij werkbonnen
  de artikel-meldingen (code + omschrijving + meldingstekst). Schema: `src/lib/parser-schema.ts`.
- PDF's met hetzelfde referentienummer worden tot één klus gegroepeerd (`src/lib/order-inlezen.ts`).

**Opslag:**
- De geëxtraheerde tekst landt in de klus-rij (`meldingen`).
- Het PDF-bestand gaat naar Supabase Storage (bucket `opdracht-documenten`), met een rij in tabel
  `documenten` (type, bestandsnaam, publieke_url, is_primair/bron). De PDF-inhoud zelf wordt niet
  opgeslagen, alleen de link.

**Wat al als gewone tekst in de app staat (geen PDF nodig):**
- Klantgegevens, adres, telefoon (met bel/navigatie-knoppen), referentie, leverweek, adviseur.
- "Artikelen uit klus": de uit de PDF gehaalde meldingen (code + omschrijving + meldingstekst).
- "Wat moet er gebeuren": de werkomschrijving.
- Eerdere bezoeken op dezelfde referentie.

**Wat alleen in de PDF zit:**
- De tekeningen en schema's: bovenaanzicht, leidingschema, detail-afbeeldingen, layout.
- Dit is precies waarvoor de monteur de PDF steeds heropent.

**Hoe de monteur een PDF opent (`src/components/DocumentRij.tsx`):**
- Een gewone link: `<a href={publieke_url} target="_blank">`.
- Tikken opent een nieuw tabblad of de externe PDF-viewer van de telefoon. De app (PWA) raakt op de
  achtergrond.
- De service worker (`public/sw.js`) cachet de Storage-URL cache-first, maar pas nadat de monteur de
  PDF minstens één keer online heeft geopend.

## 2. Het kernprobleem: steeds openen en lezen

Afgeleid uit de code, vanuit de monteur op locatie (telefoon, vaak matig netwerk):

1. **Hij verlaat de app bij elke PDF.** `target="_blank"` gooit hem naar een externe viewer;
   terugkomen kost extra taps en hij is zijn plek in de app kwijt.
2. **De PDF wordt elke keer opnieuw opgehaald** tot de cache gevuld is. Een leidingschema van 6,5MB
   op 4G is traag, en juist die grote schema's bekijkt hij het vaakst.
3. **Geen voorbeeld of soort-label.** De lijst toont alleen bestandsnaam + icoon. Bij 4 PDF's is
   "waar is het bovenaanzicht?" zoeken.
4. **Scrollpositie gaat verloren.** De externe viewer onthoudt niets; opnieuw open = weer bovenaan.
5. **Offline mist hij PDF's die hij nog nooit opende.** De cache vult alleen bij eerste online open.

Kort: de monteur opent vaak dezelfde tekening, maar elke open is traag, gooit hem uit de app en
begint bovenaan.

## 3. Verbeterrichtingen (gerangschikt, niets gebouwd)

### Snel en hoge waarde
1. **Soort-label + eerste-pagina-thumbnail per document** in de documentenlijst. De monteur ziet
   direct welke PDF de orderbon, het bovenaanzicht of het leidingschema is. Bestanden:
   `DocumentRij.tsx`, een PDF→afbeelding-util (de eerste-pagina-logica bestaat al).
2. **Belangrijkste velden prominent bovenaan de klus** (referentie, leverweek, adres), zodat hij
   met de feiten begint en de PDF minder vaak nodig heeft. Alleen herindeling, geen nieuwe logica.
   Bestand: `opdracht/[id]/page.tsx`.
3. **Bron-document bovenaan + groeperen op soort** (orderbon / tekening / overig). Sneller de juiste
   tekening vinden. Bestand: `opdracht/[id]/page.tsx` (sortering/groepering).

### Meer werk, groot effect
4. **In-app PDF-viewer** (PDF.js, of een overlay) zodat openen de app niet verlaat en de
   scrollpositie onthouden wordt. Dit raakt het kernprobleem het hardst. Nieuw component +
   integratie in `opdracht/[id]/page.tsx`. Aandacht: bundelgrootte en offline.
5. **Offline vooraf laden** van de documenten van een klus ("download voor offline"), zodat de
   schema's op locatie zonder netwerk werken. Bestanden: `public/sw.js`, `sw-cache.ts`, een knop in
   de UI.

### Klein, handig
6. **Notitie per document** (kantoor) zodat een PDF context krijgt ("originele orderbon").
7. **Parsing-fout zichtbaar** voor kantoor als een PDF niet gelezen kon worden.

## 4. Aanbeveling

Voor de monteur die "steeds opent en leest" geven punt 1 (thumbnail + soort-label) en punt 4
(in-app viewer met scrollgeheugen) samen het meeste rust: snel de juiste tekening vinden en hem
bekijken zonder de app te verlaten. Punt 5 (offline vooraf laden) is de logische derde, want op
locatie is het netwerk vaak slecht en de schema's zijn groot. Punt 2 (samenvatting bovenaan)
vermindert het aantal keer dat hij de PDF überhaupt nodig heeft.

Voorstel volgorde als we dit oppakken: eerst 1 + 2 (klein, direct merkbaar), dan 4, dan 5.

## 5. Open punten
- Welke documentsoorten willen we expliciet labelen (orderbon, bovenaanzicht, leidingschema,
  offerte, werkbon)? Detectie kan op bestandsnaam-patroon of via de parser.
- In-app viewer: eigen PDF.js-bundel (offline-vriendelijk, groter) versus een simpele overlay/iframe
  (kleiner, minder offline). Keuze afhankelijk van hoe zwaar we offline willen leunen.
