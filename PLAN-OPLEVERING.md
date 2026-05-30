# Oplevering met eindstaat-bewijs en handtekening - Implementatieplan

> **Voor agentische uitvoerders:** gebruik superpowers:subagent-driven-development of
> superpowers:executing-plans om dit plan taak voor taak uit te voeren. Stappen gebruiken
> checkbox-syntax (`- [ ]`). Werk in de TDD-lijn: eerst de test (RED), dan minimale code
> (GREEN), dan commit.

**Goal:** een monteur kan een opdracht opleveren met eindstaat-bewijs (foto's en optioneel
video), uitkomst, en optionele klant-handtekening; het rapport gaat met de juiste zaaknaam
naar de keukenzaak.

**Architecture:** nieuwe afgebakende `opleveringen`-tabel naast de bestaande overladen
`meldingen`-tabel; korte geleide oplever-flow op opdracht-detail; video rechtstreeks
browser->Supabase Storage; rapport-generator en mail worden oplevering-bewust; keukenzaak
wordt een veld op de opdracht (parser + handmatig).

**Tech Stack:** Next.js (App Router, ongewone versie, zie `AGENTS.md`), Supabase
(Postgres + Storage), pdf-lib, Resend, vitest. PWA met offline (serwist/idb) uit 2A.9.

**Conventie:** dit plan volgt de stijl van PLAN-2A9.md. Per taak: bestand(en), test, code
(beknopt), verifiëren, tijd, status. Verwijs voor Next-API-details naar
`node_modules/next/dist/docs/`. Lees voor elke taak de genoemde bestaande bestanden om
patronen te volgen.

**Spec:** zie `DESIGN-OPLEVERING.md`.

---

## Blok A - Hernoeming werkbak -> werkpool (eerst, laag risico)

### A1 Teksten en koppen hernoemen
- Bestanden: `src/app/page.tsx` (kop "KSV / Werkbak" -> "Werkpool"; "Geen actieve klussen"
  blijft), plus elke UI-tekst met "werkbak" (grep op `werkbak` en `Werkbak`,
  hoofdletterongevoelig, in `src/`).
- Test: bestaande tests blijven groen; geen nieuwe test nodig voor pure tekst.
- Code: vervang label "KSV / Werkbak" door "Werkpool" (los van de zaak-naam, neutraal).
- Verifiëren: `npm test` groen; `next build` slaagt; visueel in dev de kop "Werkpool".
- Tijd: 15 min
- Status: open

### A2 Code-namen en commentaar hernoemen waar logisch
- Bestanden: grep `werkbak` in `src/` (bv. `src/lib/werkbak.ts`, `werkbak.test.ts`,
  `groepeerMeldingen`-gebruik). Hernoem bestand en imports naar `werkpool.ts` /
  `werkpool.test.ts` als dat schoon kan; anders alleen commentaar/teksten.
- Test: hernoem ook de testbestand-imports; `npm test` groen.
- Code: bestandsnaam + imports aanpassen; functienamen mogen blijven als hernoemen risico
  geeft (alleen doen als triviaal).
- Verifiëren: `npm test` groen, `next build` slaagt.
- Tijd: 20 min
- Status: open

### A3 Commit
- `git add -A && git commit -m "refactor: hernoem werkbak naar werkpool"`
- Tijd: 2 min
- Status: open

---

## Blok B - Datamodel: opleveringen-tabel + keukenzaak

### B1 SQL-migratie
- Bestand: `supabase/schema-oplevering.sql` (nieuw, idempotent, zelfde stijl als
  `schema-2a6-documenten.sql`).
- Inhoud:
  - `create table if not exists public.opleveringen` met kolommen uit de spec
    (`id`, `created_at`, `opdracht_id` FK -> `meldingen(id)` on delete cascade, `uitkomst`
    text check in ('afgerond','openstaande_punten'), `eindstaat_foto_urls` text[] default
    '{}', `video_url` text, `handtekening_url` text, `rapport_url` text, `user_id` uuid).
  - Index op `opdracht_id`.
  - `alter table public.meldingen add column if not exists keukenzaak text;`
  - RLS uit + grants in dezelfde lijn als bestaande tabellen.
  - `insert into storage.buckets (id,name,public) values ('oplever-videos',...) on conflict
    do nothing;` en idem desgewenst een bucket/pad voor handtekeningen (kan in
    `opdracht-documenten`).
- Test: niet automatisch (SQL). Verifiëren door in Supabase SQL-editor te draaien.
- Verifiëren: tabel en kolom bestaan; herhaald draaien geeft geen fout.
- Tijd: 25 min
- Status: open

### B2 Types uitbreiden
- Bestand: `src/lib/db.ts`.
- Code: voeg interface `Oplevering` toe (velden uit B1). Voeg `keukenzaak: string | null`
  toe aan interface `Melding` en aan `OpdrachtInput`. Voeg input-types toe:
  `OpleveringConceptInput` (opdracht_id, eindstaat_foto_urls, video_url, handtekening_url,
  uitkomst, user_id?) en een update-vorm.
- Test: type-only, dekt door bestaande compile + latere functietests.
- Verifiëren: `npx tsc --noEmit` (of `next build`) zonder typefouten.
- Tijd: 20 min
- Status: open

### B3 Db-functies (RED): tests schrijven
- Bestand: `src/lib/db.test.ts` (uitbreiden, volg bestaand mock-server-patroon).
- Tests voor: `upsertOpleveringConcept(input)` (maakt of werkt bij), 
  `getOpleveringVoorOpdracht(opdrachtId)`, `finaliseerOplevering(id, rapportUrl)` (zet
  `rapport_url` + markeert opdracht opgeleverd), en dat `createOpdracht`/`getMeldingById`
  het nieuwe `keukenzaak`-veld meenemen.
- Verifiëren: `npm test src/lib/db.test.ts` faalt op ontbrekende functies (RED).
- Tijd: 35 min
- Status: open

### B4 Db-functies (GREEN): implementeren
- Bestand: `src/lib/db.ts` (binnen `createDbFromClient`), interface `Db` uitbreiden.
- Code: `upsertOpleveringConcept` (insert of update op `opdracht_id`; één per opdracht),
  `getOpleveringVoorOpdracht`, `finaliseerOplevering` (update `opleveringen.rapport_url` +
  `meldingen.opdracht_status='opgeleverd'`, `opgeleverd_at`, `rapport_url`). Voeg
  `keukenzaak` toe aan de insert/select in `createOpdracht` en aan de Melding-select.
- Verifiëren: `npm test src/lib/db.test.ts` groen.
- Tijd: 40 min
- Status: open

### B5 Commit
- `git add supabase/schema-oplevering.sql src/lib/db.ts src/lib/db.test.ts`
- `git commit -m "feat: opleveringen-tabel en keukenzaak in db-laag"`
- Tijd: 2 min
- Status: open

---

## Blok C - Parser: keukenzaak uit document

### C1 Schema uitbreiden (RED)
- Bestanden: `src/lib/parser-schema.ts`, `src/lib/parser-schema.test.ts`.
- Test: `ParsedPdfSchema` accepteert `keukenzaak: string | null`; `ParsedPdfJsonSchema`
  bevat `keukenzaak` in properties + required (er staat al een test die schema en
  JSON-schema spiegelt; die moet keukenzaak eisen).
- Verifiëren: test faalt (RED).
- Tijd: 20 min
- Status: open

### C2 Schema + prompt (GREEN)
- Bestanden: `src/lib/parser-schema.ts`, en de plek waar de Claude-prompt/tool wordt
  opgebouwd (`src/lib/claude-client.ts`).
- Code: `keukenzaak` toevoegen aan beide schema's met beschrijving ("Naam van de
  keukenzaak/opdrachtgever uit de kop of voettekst, bijv. 'Keukenstudio Voorschoten',
  'Keukensale.com Katwijk', 'Küchen-Dump Almere'. null als niet vindbaar."). Db-insert van
  een PDF-opdracht (`insertPdfMelding`/`createOpdracht`) neemt `keukenzaak` mee.
- Verifiëren: `npm test src/lib/parser-schema.test.ts` groen; `claude-client.test.ts`
  groen.
- Tijd: 30 min
- Status: open

### C3 Handmatig corrigeerbaar veld in UI
- Bestanden: `src/components/OpdrachtAanmaken.tsx` (lees bestaand patroon), opdracht-detail
  `src/app/opdracht/[id]/page.tsx`.
- Code: toon `keukenzaak` bij het aanmaken/bewerken zodat de monteur hem kan corrigeren
  (een eenvoudig tekstveld). Sla op via de bestaande opdracht-aanmaak/update-weg.
- Test: pure helper indien aanwezig; UI handmatig.
- Verifiëren: nieuwe opdracht toont/bewaart keukenzaak.
- Tijd: 30 min
- Status: open

### C4 Commit
- `git commit -m "feat: keukenzaak uit parser en handmatig corrigeerbaar"`
- Tijd: 2 min
- Status: open

---

## Blok D - Opslag: video en handtekening

### D1 Video-upload helper (browser-direct)
- Bestand: `src/lib/oplever-upload.ts` (+ test waar logica puur is).
- Code: functie die met `supabase-browser.ts`-client een bestand naar bucket
  `oplever-videos` uploadt (pad = `crypto.randomUUID()` + extensie), en de publieke URL
  teruggeeft. Bewust client-side, niet via API-route (Vercel payload-limiet). Lees eerst
  `src/lib/supabase-browser.ts` voor de juiste client-opzet.
- Test: pure delen (pad/extensie-bepaling, URL-vorming) los testen; de echte upload
  handmatig.
- Verifiëren: unittest groen op de pure helper.
- Tijd: 35 min
- Status: open

### D2 Handtekening naar afbeelding + opslag
- Bestanden: `src/lib/handtekening.ts` (+ test), en upload via bestaande
  `/api/upload-foto` of een kleine variant (PNG is klein, mag via API-route).
- Code: helper die een canvas/dataURL omzet naar een PNG-blob; upload levert
  `handtekening_url`. Lees `src/app/api/upload-foto/route.ts` voor de bestaande weg.
- Test: dataURL->blob-conversie puur getest.
- Verifiëren: unittest groen.
- Tijd: 30 min
- Status: open

### D3 Commit
- `git commit -m "feat: video- en handtekening-opslag helpers"`
- Tijd: 2 min
- Status: open

---

## Blok E - Oplever-flow UI

### E1 Zacht-verplicht beslissingslogica (pure functie, RED+GREEN)
- Bestanden: `src/lib/oplever-validatie.ts`, `src/lib/oplever-validatie.test.ts`.
- Test: `magVersturen({fotoCount, heeftVideo})` -> true als >=1 foto of video; geeft een
  `waarschuwing`-vlag als leeg (zacht verplicht). `uitkomst` verplicht gekozen.
- Code: minimale pure functie.
- Verifiëren: test groen.
- Tijd: 25 min
- Status: open

### E2 Oplever-flow scherm
- Bestand: `src/app/opdracht/[id]/opleveren/page.tsx` (+ client-componenten), of een
  client-component aangeroepen vanaf opdracht-detail. Lees `MeldingForm.tsx` en
  `FotoMaken.tsx` voor patronen (FotoMaken is direct herbruikbaar voor de eindstaat-foto's).
- Code: drie stappen: 1) eindresultaat (FotoMaken + video-knop + uitkomst-keuze, zacht
  verplicht via E1), 2) handtekening (canvas of "Overslaan"), 3) versturen-knop. Concept
  opslaan zodra foto/video toegevoegd (roept `upsertOpleveringConcept` via een
  API-route/server-action aan). Online-only: bij offline grijs met "Netwerk nodig"
  (hergebruik `useSyncState`/`use-offline-state`).
- Test: E1-logica is al getest; component handmatig.
- Verifiëren: dev-flow loopt door de drie stappen; concept verschijnt in db.
- Tijd: 70 min
- Status: open

### E3 "Oplevering starten" knop op opdracht-detail
- Bestand: `src/app/opdracht/[id]/page.tsx`, `src/components/OpleverKnop.tsx` (lees
  bestaand; nu doet die direct POST). Vervang door navigatie naar de oplever-flow (E2).
  Behoud "Opnieuw opleveren" voor reeds opgeleverde opdrachten (gaat ook naar de flow).
- Code: knop linkt naar `/opdracht/[id]/opleveren`; offline-grijs blijft.
- Verifiëren: vanaf detail kom je in de flow; offline grijs.
- Tijd: 30 min
- Status: open

### E4 Commit
- `git commit -m "feat: oplever-flow met eindstaat, video en handtekening"`
- Tijd: 2 min
- Status: open

---

## Blok F - Rapport oplevering-bewust

### F1 Rapport-tests uitbreiden (RED)
- Bestand: `src/lib/rapport.test.ts`.
- Test: `genereerRapportPdf(opdracht, meldingen, oplevering)` zet in de PDF: de zaaknaam uit
  `opdracht.keukenzaak` (fallback nette tekst als null), de uitkomst-regel, de
  eindstaat-foto's, de regel "Video van de oplevering: <url>" als er een video is, en
  "Niet ondertekend" of de handtekening-afbeelding. Openstaande punten = meldingen.
- Verifiëren: test faalt (RED).
- Tijd: 30 min
- Status: open

### F2 Rapport-generator aanpassen (GREEN)
- Bestand: `src/lib/rapport.ts`.
- Code: signatuur uitbreiden met `oplevering`-argument; kop gebruikt `opdracht.keukenzaak`
  i.p.v. hardcoded "Keukenstudio Voorschoten"; uitkomst-blok; eindstaat-foto's via de
  bestaande `tekenFotos`; videolink als tekst; handtekening via `embedPng` (of "Niet
  ondertekend").
- Verifiëren: `npm test src/lib/rapport.test.ts` groen.
- Tijd: 45 min
- Status: open

### F3 Commit
- `git commit -m "feat: oplever-rapport met bewijs, handtekening en zaaknaam"`
- Tijd: 2 min
- Status: open

---

## Blok G - Mail + versturen-route

### G1 Mail aanpassen (RED+GREEN)
- Bestanden: `src/lib/mail.ts`, `src/lib/mail.test.ts`.
- Test: `verstuurOpleverRapport` gebruikt de zaaknaam uit de opdracht in subject/tekst en
  zet de videolink in de body als die er is. Ontvanger blijft voorlopig de ingestelde
  `RAPPORT_EMAIL` (haak voor per-opdracht ontvanger als TODO-comment, niet afbouwen).
- Code: zaaknaam-parameter i.p.v. hardcoded "Keukenstudio Voorschoten"; videolink-regel.
- Verifiëren: `npm test src/lib/mail.test.ts` groen.
- Tijd: 30 min
- Status: open

### G2 Versturen-route aanpassen (RED)
- Bestand: `src/app/api/opdrachten/[id]/opleveren/route.test.ts`.
- Test: route leest de concept-oplevering, maakt rapport (met oplevering-data), uploadt
  PDF, mailt (mail-voor-markeren-volgorde behouden), `finaliseerOplevering`. Foutpaden:
  geen concept -> 400/409 nette melding; mail mislukt -> 502 en opdracht blijft open;
  finaliseren mislukt -> 503.
- Verifiëren: test faalt (RED).
- Tijd: 35 min
- Status: open

### G3 Versturen-route aanpassen (GREEN)
- Bestand: `src/app/api/opdrachten/[id]/opleveren/route.ts`.
- Code: huidige flow uitbreiden: `getOpleveringVoorOpdracht`, rapport met oplevering-data,
  mail met zaaknaam + videolink, `finaliseerOplevering`. Behoud de veilige volgorde
  (mailen voor markeren).
- Verifiëren: `npm test` op de route groen.
- Tijd: 40 min
- Status: open

### G4 Commit
- `git commit -m "feat: versturen-route en mail oplevering-bewust"`
- Tijd: 2 min
- Status: open

---

## Blok H - Labels dynamisch

### H1 Opdracht-detail toont keukenzaak
- Bestand: `src/app/opdracht/[id]/page.tsx`.
- Code: vervang de hardcoded kop "KSV / Opdracht|Opgeleverd" door
  `opdracht.keukenzaak ?? "Opdracht"` + status. Werkpool-kop blijft neutraal (Blok A).
- Test: handmatig/visueel.
- Verifiëren: een KKS-opdracht toont KKS, een KSV-opdracht KSV.
- Tijd: 20 min
- Status: open

### H2 Commit
- `git commit -m "feat: opdracht-detail toont keukenzaak dynamisch"`
- Tijd: 2 min
- Status: open

---

## Blok I - Afronden: tests, build, handmatige checklist

### I1 Alle tests groen
- Verifiëren: `npm test` -> alles groen.
- Tijd: 5 min
- Status: open

### I2 Build
- Verifiëren: `next build` slaagt.
- Tijd: 10 min
- Status: open

### I3 Handmatige checklist op telefoon (Android, Rein)
- Eindstaat-foto's maken en zien in concept.
- Video opnemen, uploaden, link werkt in rapport en mail.
- Handtekening zetten en overslaan, beide paden.
- Zacht-verplicht waarschuwing bij leeg bewijs.
- Uitkomst Afgerond / Nog openstaande punten klopt in het rapport.
- Offline: "Oplevering starten" grijs met "Netwerk nodig".
- Een KKS- en een KSV-opdracht: juiste zaaknaam in rapport en mail.
- Tijd: variabel
- Status: open

### I4 iPhone-test via collega (handtekening-canvas + video)
- Status: open

---

## Zelf-review (dekking spec)

- Eén oplever-flow, optionele stappen: Blok E.
- Foto's + video, zacht verplicht: E1, E2, D1.
- Handtekening overslaanbaar: D2, E2.
- opleveringen-tabel + keukenzaak: Blok B.
- Video naar Supabase Storage, link in rapport+mail: D1, F2, G1.
- Rapport oplevering-bewust + zaaknaam uit opdracht: Blok F.
- Werkbak -> Werkpool, neutrale kop, dynamische zaak-label: Blok A, H.
- Concept-opslag, veilige versturen-volgorde, foutafhandeling: B4, E2, G2/G3.
- Online-only / offline grijs: E2, E3.
- TDD-tests: B3, C1, E1, F1, G1, G2.

Niet in dit plan (bewust, conform spec): volledige multi-zaak-registratie, per-opdracht
ontvanger afbouwen, video-bewaarbeleid, parser fijn afstellen, geschiedenis van
opleveringen.
