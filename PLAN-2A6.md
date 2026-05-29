# PLAN Sessie 2A.6 - Blok A: fundament + multi-document

## STATUS (2026-05-29)
- A0 t/m A10: KLAAR. 125 tests groen, tsc schoon, `next build` slaagt.
- A10 live geverifieerd: migratie gedraaid in Supabase; Dijk-order (7407) ingeschoten, kop correct
  geparsd (van Dijk, leverweek 22/2026), PNG-schets erbij via "document toevoegen" -> 2 documenten,
  originelen openen. Server-log: POST /api/opdrachten 200, POST .../documenten 200, geen fouten.
  Nog niet apart aangeklikt maar code+tests dekken: service-PDF (Putman, meldingen) en tekst-only.
- Daarna: Blok B (opleveren/rapport/Resend-mail) in apart plan.

Basis: DESIGN-2A6.md (goedgekeurd 2026-05-29). TDD per taak (RED -> GREEN -> commit -> afvinken).
Migraties draait Rein in Supabase-dashboard; unit-tests mocken Supabase, dus bouwen kan vooruitlopen.
UI-taken (A7+): EERST skill `ui-ux-pro-max` laden (geheugen: verplicht vóór JSX in sessie 2).

Testcommando: `npm test` (vitest run). Bestaande baseline: 91 tests groen.

---

## A0 - Schema-migratie (SQL)
- Bestand: `supabase/schema-2a6-documenten.sql`
- Test eerst: n.v.t. (DDL). Verificatie via select.
- Code: `create table documenten`; `alter table meldingen add` leverweek, documenttype,
  opdracht_status, opgeleverd_at, rapport_url, user_id, toegewezen_aan; bucket
  `opdracht-documenten`; grants + constraints idempotent.
- Verifiëren: Rein runt in Supabase; `select * from documenten` leeg; `\d meldingen` heeft nieuwe kolommen.
- Tijd: 10 min - Status: open

## A1 - Parser-schema uitbreiden
- Bestand: `src/lib/parser-schema.ts` (+ `.test.ts`)
- Test eerst: schema accepteert `documenttype` ('orderbevestiging'|'werkbon_service'|'onbekend')
  + `leverweek` (string|null); JsonSchema spiegelt beide (properties + required); bestaande velden intact.
- Code: velden toevoegen aan `ParsedPdfSchema` + `ParsedPdfJsonSchema`.
- Verifiëren: `npm test parser-schema` groen.
- Tijd: 8 min - Status: open

## A2 - Parser-prompt: type-detectie
- Bestand: `src/lib/claude-client.ts` (+ `.test.ts`)
- Test eerst: mock geeft orderbevestiging (documenttype='orderbevestiging', leverweek='22/2026',
  meldingen=[]) -> correct geparsd; tweede test werkbon_service met gevulde meldingen.
- Code: SYSTEM_PROMPT herschrijven naar type-detectie (orderbevestiging vs werkbon vs onbekend);
  tool-omschrijving + USER_INSTRUCTION generiek maken (niet meer "service-PDF").
- Verifiëren: `npm test claude-client` groen.
- Tijd: 10 min - Status: open

## A3 - Storage: bucket opdracht-documenten
- Bestand: `src/lib/storage.ts` (+ `.test.ts`)
- Test eerst: `uploadOpdrachtDocument(file)` gebruikt bucket 'opdracht-documenten', geeft
  `{ pad, publieke_url }`; faalt netjes bij upload-error (mock supabase storage).
- Code: functie naast bestaande foto-upload; bucketnaam constante.
- Verifiëren: `npm test storage` groen.
- Tijd: 10 min - Status: open

## A4a - db: opdracht-creatie (kop + tekst-only)
- Bestand: `src/lib/db.ts` (+ `.test.ts`)
- Test eerst: `createOpdrachtUitParsed(parsed)` insert opdracht-rij (bron 'pdf', opdracht_id null,
  documenttype/leverweek mee); `createOpdrachtUitTekst(input)` insert rij (documenttype 'tekst').
  Toekomstvast: input neemt optioneel user_id/toegewezen_aan (nu null).
- Code: functies + interface-uitbreiding.
- Verifiëren: `npm test db` groen.
- Tijd: 12 min - Status: open

## A4b - db: documenten CRUD
- Bestand: `src/lib/db.ts` (+ `.test.ts`)
- Test eerst: `addDocument({opdracht_id,type,bestandsnaam,storage_pad,publieke_url,referentienummer,is_primair})`
  insert in 'documenten'; `getDocumentenVoorOpdracht(id)` filtert op opdracht_id, oudste eerst.
- Code: functies + interface.
- Verifiëren: `npm test db` groen.
- Tijd: 10 min - Status: open

## A5 - API: opdracht aanmaken (multi-document + tekst-only)
- Bestand: `src/app/api/opdrachten/route.ts` (+ `.test.ts`)
- Test eerst: POST multipart met meerdere files -> primair (eerste PDF) geparsd, opdracht aangemaakt,
  per file uploadOpdrachtDocument + addDocument, response {id, documenten[]}. POST tekst-only
  (klant-velden, geen file) -> opdracht zonder documenten. Afbeelding-file wordt niet geparsd.
- Code: route die parser/storage/db combineert; primair-keuze = eerste pdf, anders eerste file.
- Verifiëren: `npm test api/opdrachten` groen.
- Tijd: 15 min - Status: open

## A6 - API: documenten toevoegen aan bestaande opdracht
- Bestand: `src/app/api/opdrachten/[id]/documenten/route.ts` (+ `.test.ts`)
- Test eerst: POST files voor bestaande opdracht-id -> nieuwe documenten-rijen; 404 bij onbekende opdracht.
- Code: route (geen herparse van kop, alleen documenten toevoegen).
- Verifiëren: `npm test` groen.
- Tijd: 10 min - Status: open

---
### >>> Vanaf hier UI. EERST `ui-ux-pro-max` skill laden. <<<
---

## A7 - Aanmaak-flow UI
- Bestand: `src/components/OpdrachtAanmaken.tsx` + inhaken op werkbak (`src/app/page.tsx`)
- Twee modi: (1) bestanden kiezen (meerdere, pdf+afbeelding) -> POST /api/opdrachten;
  (2) "zonder document" -> klant/adres/ref/telefoon invullen -> POST tekst-only.
  Vervangt de losse PdfUpload-knop. Grote tap-targets, design-system aanhouden.
- Verifiëren: browser (desktop + telefoon-LAN): opdracht met 2 docs verschijnt in werkbak.
- Tijd: 25 min - Status: open

## A8 - Opdracht-detail: documenten tonen + toevoegen
- Bestand: `src/app/opdracht/[id]/page.tsx` + `src/components/DocumentenLijst.tsx`
- Toont per opdracht alle documenten (naam + type-icoon) met "open origineel" (publieke_url),
  + knop "document toevoegen" -> /api/opdrachten/[id]/documenten. Leverweek in de kop tonen.
- Verifiëren: browser: originelen openen; document toevoegen werkt live.
- Tijd: 18 min - Status: open

## A9 - Werkbak-kaart: documenttype + leverweek
- Bestand: `src/components/OpdrachtCard.tsx`
- Badge/icoon documenttype (montage/service/tekst); leverweek tonen indien aanwezig.
- Verifiëren: browser: drie soorten opdrachten visueel onderscheidbaar.
- Tijd: 10 min - Status: open

## A10 - Seed echte week 23-data + end-to-end verificatie
- Importeer 7636, 7407 (+ PNG-schets als tweede doc), 7320 via de echte aanmaak-flow.
- Run volledige suite `npm test` (alle groen, geen regressie op de 91).
- Verifiëren: werkbak toont 3 opdrachten; 7407 heeft 2 documenten; service-opdracht toont meldingen.
- Tijd: 15 min - Status: open

---
Na Blok A: logboek-entry + door naar Blok B (opleveren/rapport/mail) in apart plan.
