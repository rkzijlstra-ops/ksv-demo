# Plan: PDF's voor de monteur (en kantoor)

Hoort bij `DESIGN-PDF-MONTEUR.md`. Test-first. Alles in één build, gedeeld monteur + kantoor.
Status: [ ] open, [x] klaar (datum/tijd).

## Randvoorwaarde (eerst)
### T0: Branch pas na melding-flow
- Wacht tot de **melding-flow op master** staat (andere terminal). Daarna: vers worktree/branch
  `pdf-monteur` vanaf master, env kopieren, `npm ci`.
- Lees vooraf de relevante Next-docs in `node_modules/next/dist/docs/` (zie AGENTS.md) voor de
  react-pdf/worker-setup in deze Next-versie.
- Verifieren: `git status` schoon, `npm run test` groen als basis.
- Tijd: 10 min — Status: [ ]

## Datamodel
### T1: Migratie documenten.soort + thumbnail_url
- Bestand: `supabase/<nieuw>.sql`
- Doen: kolommen `soort text default 'overig'`, `thumbnail_url text`. Best-effort `soort` voor
  bestaande rijen uit bestandsnaam. Draai op test + demo via `npm run migrate:test`; prod doet Rein.
- Verifieren: kolommen bestaan op test-DB; bestaande rijen hebben een soort.
- Tijd: 5 min — Status: [ ]

## Helpers
### T2: documentSoort(bestandsnaam)
- Bestand: `src/lib/document-soort.ts` (+ test)
- Test eerst: "Bovenaanzicht…" -> bovenaanzicht; "Leidingschema…" -> leidingschema; "…orderbon…" ->
  orderbon; "klmont-…" -> werkbon; "offerte" -> offerte; .jpg -> afbeelding; onbekend -> overig.
- Verifieren: `npm run test` groen.
- Tijd: 5 min — Status: [ ]

## Mini-voorbeeld (thumbnail)
### T3: Spike server-side PDF -> PNG op de deploy-target
- Doel: bewijs dat pagina-1-render server-side betrouwbaar werkt (pdfjs + canvas) op Vercel, of niet.
- Doen: kleine render-proef; meet uitkomst. Beslis: server-side bij upload OF client-side lazy.
- Verifieren: werkende PNG uit een test-PDF (of duidelijke conclusie "valt terug op client-side").
- Tijd: 5 min — Status: [ ]

### T4: Thumbnail genereren + opslaan
- Bestand: upload-route `src/app/api/opdrachten/[id]/documenten/route.ts` (+ inschieten-route) of een
  client-lazy variant, afhankelijk van T3; opslag `thumbnail_url`.
- Test eerst: integratietest — na upload heeft het document een `thumbnail_url` (of nette null bij
  mislukken). Afbeelding -> thumbnail = (verkleinde) afbeelding.
- Verifieren: integratietest groen tegen test-DB.
- Tijd: 5 min — Status: [ ]

### T5: Thumbnail opruimen bij verwijderen
- Bestand: `src/app/api/documenten/[id]/route.ts` (DELETE) + storage-helper
- Test eerst: verwijderen verwijdert ook het thumbnail-bestand uit storage.
- Verifieren: integratietest.
- Tijd: 4 min — Status: [ ]

## In-app viewer
### T6: react-pdf + pdfjs-dist toevoegen, worker lokaal
- Bestand: package.json, een viewer-init/worker-config
- Doen: dependency erbij, `pdf.worker` lokaal serveren (geen CDN), minimale render-proef.
- Verifieren: een PDF rendert pagina 1 in een testpagina; build groen.
- Tijd: 5 min — Status: [ ]

### T7: PdfViewer-overlay component
- Bestand: `src/components/PdfViewer.tsx` (+ unit voor de geheugen-logica)
- Test eerst (unit): "onthoud laatste pagina per document" (localStorage-key per doc-id).
- Code: overlay over de app, vorige/volgende, paginateller, sluiten; opent op de onthouden pagina.
- Verifieren: unit groen; handmatig in dev; e2e in T14.
- Tijd: 5 min — Status: [ ]

### T8: Afbeeldings-geval in de viewer
- Bestand: `src/components/PdfViewer.tsx`
- Code: bij type afbeelding de afbeelding tonen (zoombaar), geen paginanav.
- Verifieren: e2e T14.
- Tijd: 4 min — Status: [ ]

## Gedeelde UI
### T9: DocumentKaart (voorbeeld + soort-badge)
- Bestand: `src/components/DocumentKaart.tsx` (upgrade van DocumentRij)
- Code: thumbnail of icoon, soort-badge (label/kleur uit T2-map), naam, grootte, Open -> opent PdfViewer
  i.p.v. nieuw tabblad.
- Verifieren: e2e T14.
- Tijd: 5 min — Status: [ ]

### T10: DocumentenBlok (gedeeld, groepering)
- Bestand: `src/components/DocumentenBlok.tsx`
- Code: groepeer op soort (orderbon / tekeningen / overig), bron bovenaan; prop `magOffline`.
- Verifieren: e2e T14.
- Tijd: 5 min — Status: [ ]

### T11: Monteur-kluspagina: blok + samenvatting bovenaan
- Bestand: `src/app/opdracht/[id]/page.tsx`, `src/components/SamenvattingKaart.tsx`
- Code: vervang de oude documentenlijst door DocumentenBlok (magOffline); SamenvattingKaart
  (ref/leverweek/adres/uitvoer) bovenaan.
- Verifieren: handmatig + e2e T14.
- Tijd: 5 min — Status: [ ]

### T12: Kantoor-kluspagina: zelfde blok
- Bestand: `src/app/dashboard/opdracht/[id]/page.tsx`
- Code: DocumentenBlok zonder offline-knop.
- Verifieren: e2e T14.
- Tijd: 4 min — Status: [ ]

### T13: OfflineLaadKnop (monteur)
- Bestand: `src/components/OfflineLaadKnop.tsx`, evt. `public/sw.js` / `src/lib/sw-cache.ts`
- Code: warmt de SW-cache voor alle documenten van de klus; toont voortgang/klaar.
- Verifieren: e2e T14 (knop aanwezig + feedback); offline-gedrag handmatig.
- Tijd: 5 min — Status: [ ]

## Afronding
### T14: E2e gedeeld gedrag
- Bestand: `e2e/pdf-documenten.spec.ts`
- Test: soort-label + groepering (monteur + kantoor); Open -> in-app viewer, GEEN nieuw tabblad;
  bladeren; afbeelding-geval; offline-knop bij monteur aanwezig, bij kantoor afwezig.
- Verifieren: `npm run test:e2e` groen.
- Tijd: 6 min — Status: [ ]

### T15: Registers bijwerken
- Bestand: `TESTDEKKING.md`, `TOESTANDEN.md`
- Doen: regels voor documenten-soort/voorbeeld, in-app viewer, offline-laden, gedeeld component.
- Tijd: 4 min — Status: [ ]

### T16: Suite + omgeving-test, STOP voor keuring
- Doen: `rm -rf .next`, volledige suite, push, naar `omgeving-test`, kluslus-test laten deployen.
  Daarna STOP en Rein vragen te keuren (beide rollen). Niet zelf naar master.
- Tijd: 10 min — Status: [ ]
