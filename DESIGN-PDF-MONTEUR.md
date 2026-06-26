# Design: PDF's voor de monteur (en kantoor)

Datum: 2026-06-26
Status: design, wacht op akkoord Rein voor plan-uitvoering. Niets gebouwd.
Hoort bij `ONDERZOEK-PDF-MONTEUR.md` en de mockup `scratchpad/pdf-monteur-mockup.html`.

## Aanleiding
De monteur opent documenten (orderbon, bovenaanzicht, leidingschema, offerte, werkbon, opleverrapport)
nu via een link die de app verlaat (`DocumentRij.tsx`, `<a target="_blank">`). Hij heropent vooral de
tekeningen steeds, die zijn traag (tot 6,5MB), gooien hem uit de app en beginnen weer bovenaan.

## Scope (alles in één build)
1. **Samenvatting-kaart bovenaan de klus**: referentie, leverweek, adres, uitvoerdatum prominent.
2. **Documenten met soort-label + mini-voorbeeld (eerste pagina), gegroepeerd**, bron-PDF bovenaan.
3. **In-app PDF-viewer**: PDF in een overlay over de app, paginanavigatie, onthoudt je plek; geen nieuw
   tabblad meer.
4. **Offline vooraf laden** van alle documenten van een klus (alleen monteur).
5. Eén **gedeeld documenten-component** voor monteur (`/opdracht/[id]`) én kantoor
   (`/dashboard/opdracht/[id]`); de offline-knop verschijnt alleen bij de monteur.

## Niet in scope
- Wijziging van de PDF-intake/parsing (claude-client) zelf.
- De site-brede "keukenzaak -> opdrachtgever" opschoning (aparte taak, on hold).
- Deep-link naar een specifieke pagina vanuit buiten de app.

## Keuzes (met motivatie; Rein: ga voor de beste/betrouwbaarste optie)
- **Viewer = PDF.js via `react-pdf`** (wrapper om `pdfjs-dist`). Beste controle: eigen paginanavigatie,
  scroll-/pagina-geheugen, en het rendert vanuit bytes, dus het werkt met de bestaande offline-cache.
  Een simpele iframe/overlay kan dat niet betrouwbaar (geen pagina-API, slecht offline). De extra
  bundel is dat waard en laadt alleen op het kluspad. De `pdf.worker` zetten we lokaal (geen CDN).
- **Mini-voorbeeld = server-side gegenereerd bij upload**, opgeslagen als kleine PNG in storage met
  `thumbnail_url` op het document. Reden: de monteur op 4G mag niet eerst de hele 6,5MB-PDF downloaden
  om een voorbeeldje te zien. Risico: server-side PDF->PNG vraagt een render-lib (pdfjs + canvas) die
  op Vercel native bindings nodig heeft. Daarom een **spike als eerste bouwtaak**; lukt server-side
  renderen niet betrouwbaar op de deploy, dan val ik terug op **client-side lazy thumbnail** (PDF.js
  rendert pagina 1 klein en cachet het), met dezelfde UI. Afbeeldingsdocumenten: thumbnail = de
  afbeelding zelf (verkleind).
- **Soort herkennen = op bestandsnaam-patroon bij upload**, opgeslagen in `documenten.soort`
  (orderbon | bovenaanzicht | leidingschema | offerte | werkbon | tekening | afbeelding | overig).
  De echte bestandsnamen zijn consistent ("Bovenaanzicht…", "Leidingschema…", "…orderbon…",
  "klmont-…"). Simpel en betrouwbaar; later eventueel met de parser verfijnen. De primair/bron-vlag
  bestaat al.

## Datamodel-wijziging (tabel `documenten`)
- Nieuw: `soort text` (default 'overig'), `thumbnail_url text null`.
- Migratie op ALLE drie de databases: prod (Rein, handmatig), test + demo (ik, `npm run migrate:test`).
- Bestaande documenten: `soort` afleiden uit bestandsnaam in de migratie (best effort), thumbnail
  lazy bijwerken; oude rijen zonder thumbnail tonen gewoon het icoon.

## Componenten
- `DocumentSoort` helper (bestandsnaam -> soort) + label/kleur-map. Puur, los te testen.
- `DocumentKaart` (vervangt/upgrade `DocumentRij`): voorbeeld + soort-badge + naam + grootte + Open.
- `DocumentenBlok` (gedeeld): groepeert op soort, bron bovenaan, prop `magOffline` (alleen monteur).
- `PdfViewer` (overlay): react-pdf, vorige/volgende, paginateller, sluiten, onthoudt laatste pagina
  per document (localStorage).
- `SamenvattingKaart`: bestaande klus-velden, alleen herindeling (monteur-pagina).
- `OfflineLaadKnop`: warmt de service-worker-cache voor alle documenten van de klus.

## Happy path (monteur)
1. Opent de klus, ziet bovenaan de samenvatting (ref, leverweek, adres, datum).
2. Ziet de documenten gegroepeerd, met voorbeeld + soort; vindt direct het leidingschema.
3. Tikt Open -> PDF opent in de app (overlay), bladert, sluit; de app en zijn plek blijven.
4. Optioneel "Laad alles offline" voor onderweg.
Kantoor: zelfde documenten-blok op het dashboard, zonder offline-knop.

## Edge cases
- PDF kapot/beveiligd: thumbnail mislukt -> toon icoon; viewer toont nette foutmelding + "extern openen".
- Heel grote PDF: viewer rendert per pagina (lazy), niet alles ineens.
- Afbeelding i.p.v. PDF: viewer toont de afbeelding (zoombaar), geen paginanav.
- Offline en nog niet gecachet: nette melding "niet beschikbaar offline".
- Geen documenten: bestaande lege staat blijft.
- Rechten: monteur ziet docs van zijn klus; kantoor via bestaande RLS. Offline-knop alleen monteur.

## Volledigheids-check / toestand
- Documenten-levenscyclus: toevoegen (bestaat), tonen (upgrade), openen (nieuw: in-app), verwijderen
  (bestaat) -> bij verwijderen ook de thumbnail uit storage opruimen (tegenhanger meenemen).
- Upload-tegenhanger: bij elke nieuwe upload soort bepalen + thumbnail genereren.
- Beide rollen: monteur en kantoor gebruiken hetzelfde blok (cross-rol getest).

## Test-strategie (4 lagen)
- Unit: `documentSoort()` (bestandsnaam -> soort), thumbnail-pad-helper, samenvatting-veldselectie,
  viewer "laatste pagina onthouden"-logica.
- Integratie (test-DB): upload schrijft `soort` + `thumbnail_url`; verwijderen ruimt thumbnail op.
- Browser-e2e (Playwright): documentenlijst toont soort + groepering (monteur + kantoor); Open ->
  in-app viewer verschijnt, GEEN nieuw tabblad; bladeren; afbeelding-geval; offline-knop aanwezig bij
  monteur, afwezig bij kantoor.
- Registers `TESTDEKKING.md` + `TOESTANDEN.md` bijwerken.

## Coördinatie (belangrijk)
- De **melding-flow** wordt nu op een andere terminal gebouwd en raakt vrijwel zeker dezelfde
  monteur-kluspagina. **Start deze PDF-branch pas als de melding-flow op master staat**, en branch dan
  vers vanaf master. Anders merge-conflicten op `opdracht/[id]/page.tsx`.
- Gedeelde test-DB: draai de CI/e2e van deze branch niet terwijl Rein op kluslus-test keurt.

## Open punten / risico
- Server-side thumbnail op Vercel (native canvas): spike eerst; fallback client-side.
- react-pdf worker-config in deze (gewijzigde) Next-versie: vroeg valideren (zie AGENTS.md: lees de
  Next-docs in node_modules vóór bouwen).
