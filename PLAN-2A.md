# PLAN Sessie 2A - Monteur-flow

Datum: 2026-05-28
Brainstorm-doc: [BRAINSTORM-2A.md](BRAINSTORM-2A.md)
Werkwijze: projectstart-discipline skill, UI via ui-ux-pro-max, TDD waar zinvol
Doel: monteur kan op telefoon complete melding maken; werkbak + detail-scherm werken
Package manager: npm
Geschat: 4-6u (9 groepen). Natuurlijke pauze-plek: na Groep E.

Status-legenda: `[ ]` open, `[x]` afgevinkt + werkelijke tijd.

---

## Groep A — Datamodel + Storage + parser-uitbreiding (5 taken, ~20 min waarvan Rein ~5 min)

### A1: SQL migration voor nieuwe kolommen
- Status: `[x]` 4 min
- Bestand(en): `supabase/schema-2a.sql`
- Code: ALTER TABLE (idempotent add column if not exists): status + check, aangepast, verzonden_at, foto_urls jsonb, klant_telefoon. Index op status. Storage bucket via `insert into storage.buckets ... on conflict do nothing`.
- Verifiëren: SQL leest goed door

### A2: Rein — SQL runnen + Storage-bucket
- Status: `[ ]` (Rein, wacht op bevestiging)
- Stappen: plak `schema-2a.sql` in SQL Editor + run (bucket wordt via dezelfde SQL aangemaakt)
- Verifiëren: kolommen zichtbaar in Table Editor, bucket `meldingen-fotos` bestaat

### A3: Parser-schema uitbreiden met klant_telefoon (TDD)
- Status: `[x]` 3 min
- Bestand(en): `src/lib/parser-schema.test.ts` (test eerst), `src/lib/parser-schema.ts`
- Code: `klant_telefoon: string|null` in Zod + JSON-schema + required-lijst. Extra test voor string/null.
- Verifiëren: 7 tests groen

### A4: claude-client system prompt bijwerken
- Status: `[x]` 2 min
- Bestand(en): `src/lib/claude-client.ts`, test-mock bijgewerkt (klant_telefoon in tool_use input)
- Code: regel toegevoegd voor telefoon-extractie (null bij twijfel)
- Verifiëren: 4 client-tests groen

### A5: db.ts uitbreiden + tests
- Status: `[x]` 12 min
- Bestand(en): `src/lib/db.ts`, `src/lib/db.test.ts`
- Code: `Melding` + `MonteurMeldingInput` types. insertPdfMelding neemt klant_telefoon mee via `...data`. Nieuwe functies `getMeldingen()` (order created_at desc), `getMeldingById(id)` (maybeSingle, null als niet gevonden), `createMonteurMelding()` (bron='monteur', status concept default), `updateMeldingStatus()` (zet verzonden_at bij verzonden, aangepast-vlag optioneel). Test-mock herschreven naar flexibele thenable chain-builder.
- Extra: route.test dummyParsed + klant_telefoon, fake-PDF kreeg telefoonnummer (voor bel-knop test-data)
- Verifiëren: `npm test` → 35 tests groen (5 files)

---

## Groep B — UI-fundament met ui-ux-pro-max (5 taken, ~40 min)

### B1: ui-ux-pro-max skill activeren + design-keuze
- Status: `[x]` 10 min
- Actie: skill geladen. Python ontbreekt (search.py CLI), dus CSV-data direct gelezen (styles.csv, typography.csv) i.p.v. globale Python-install.
- Keuze (vastgelegd in `design-system.md`): stijl #1 Minimal/Flat + #8 Accessible & Ethical; kleuren high-contrast light (geen dark mode); typografie #16 Corporate Trust (Lexend + Source Sans 3, accessibility-focused); tap-targets min 56px; urgentie altijd icoon+label naast kleur; Lucide icons.

### B2: Tailwind toevoegen aan project
- Status: `[x]` 4 min
- Bestand(en): `package.json`, `postcss.config.mjs`, `src/app/globals.css`
- Code: Tailwind v4 + @tailwindcss/postcss + lucide-react. CSS-first `@theme` met kleurtokens.
- Verifiëren: classes renderen in dev

### B3: Root layout + mobile-first viewport + globale stijl
- Status: `[x]` 3 min
- Bestand(en): `src/app/layout.tsx`, `globals.css`
- Code: Lexend + Source Sans via next/font, `lang="nl"`, viewport (device-width, max-scale 5), theme-color, prefers-reduced-motion
- Verifiëren: dev toont gestylede pagina, fonts geladen

### B4: Basis-componenten (badges + card)
- Status: `[x]` 8 min
- Bestand(en): `src/lib/urgentie.ts` (+test), `src/components/Badge.tsx`, `UrgentieBadge.tsx`, `BronBadge.tsx`, `OpdrachtCard.tsx`
- Code: pure `urgentieConfig`/`bronConfig` (testbaar), generieke Badge met Lucide-icoon, OpdrachtCard als grote tap-target Link met hover + focus-ring
- Verifiëren: 5 badge-tests groen

### B5: Verifieer gestyled fundament
- Status: `[x]` (samengevoegd met C5) — werkbak rendert gestyled met echte data

---

## Groep C — Werkbak (lijst) (5 taken, ~35 min)

### C1: Data-laag getMeldingen + groepering
- Status: `[x]` (getMeldingen in A5) + `src/lib/werkbak.ts`
- Code: `groepeerMeldingen` splitst verzonden (history) van rest (actief), volgorde behouden

### C2: Test voor werkbak-groepering
- Status: `[x]` 3 min
- Bestand(en): `src/lib/werkbak.test.ts`
- Verifiëren: 3 tests groen

### C3: Werkbak-pagina (server component)
- Status: `[x]` 4 min
- Bestand(en): `src/app/page.tsx` (`export const dynamic = "force-dynamic"`)
- Code: haalt getMeldingen, groepeert, actief bovenaan + lege-staat, HistorySection eronder. Oude boilerplate page + page.module.css verwijderd.
- Verifiëren: pagina rendert lijst

### C4: Werkbak-interactie (history-toggle)
- Status: `[x]` 3 min
- Bestand(en): `src/components/HistorySection.tsx` (client, useState)
- Code: inklapbaar, default dicht, aria-expanded, verbergt zich bij 0 verzonden
- Verifiëren: toggle werkt

### C5: Verifieer werkbak met echte data
- Status: `[x]` 3 min
- Verifiëren: HTTP 200 op localhost:3001, "2 actieve klussen", J. Jansen-card met ref 7444 + adres + Opdracht-badge, DIAGNOSE-rij, fonts geladen, geen echte render-error

---

## Groep D — Detail-scherm + nav/bel (5 taken, ~35 min)

### D1: getMeldingById + test
- Status: `[ ]`
- Bestand(en): `src/lib/db.ts`, `src/lib/db.test.ts`
- Verifiëren: groen

### D2: Detail-pagina /opdracht/[id]
- Status: `[ ]`
- Bestand(en): `src/app/opdracht/[id]/page.tsx`
- Code: klantgegevens, meldingen-lijst, foto's-sectie
- Verifiëren: detail opent vanuit werkbak-tik

### D3: Nav-knop component + URL-test
- Status: `[ ]`
- Bestand(en): `src/components/NavKnop.tsx`, test voor URL-bouw
- Code: platform-detectie → Android `geo:0,0?q=<adres>`, iPhone `https://maps.google.com/?q=<adres>`, fallback Google Maps web
- Verifiëren: test groen, knop bouwt juiste link

### D4: Bel-knop component
- Status: `[ ]`
- Bestand(en): `src/components/BelKnop.tsx`
- Code: `tel:` link, verbergen als `klant_telefoon` null
- Verifiëren: knop verschijnt alleen met nummer

### D5: Foto-galerij + verifieer detail
- Status: `[ ]`
- Bestand(en): `src/components/FotoGalerij.tsx`
- Verifiëren: detail-scherm compleet, nav/bel deep-links kloppen

---

## Groep E — PDF-upload-knop (tijdelijke bron) (4 taken, ~25 min)

### E1: Upload-component (client)
- Status: `[ ]`
- Bestand(en): `src/components/PdfUpload.tsx`
- Code: file-input PDF → POST naar bestaande `/api/parse-pdf`
- Verifiëren: upload triggert request

### E2: Status-feedback
- Status: `[ ]`
- Code: loading-spinner, succes-melding, foutmelding (toont API-error netjes)
- Verifiëren: states zichtbaar

### E3: Na upload werkbak verversen
- Status: `[ ]`
- Code: `router.refresh()` of revalidate na succes
- Verifiëren: nieuwe klus verschijnt zonder handmatige reload

### E4: Verifieer PDF-upload-flow
- Status: `[ ]`
- Verifiëren: voorbeeld.pdf uploaden via UI → klus in werkbak met klantgegevens
- **Natuurlijke pauze-plek: hier kan een sessie eventueel splitsen**

---

## Groep F — Melding maken: foto's (5 taken, ~40 min)

### F1: Foto-capture component
- Status: `[ ]`
- Bestand(en): `src/components/FotoMaken.tsx`
- Code: `<input type=file accept=image/* capture=environment>` + preview
- Verifiëren: camera opent op telefoon

### F2: Client-side compressie
- Status: `[ ]`
- Bestand(en): `src/lib/foto-compress.ts` + test
- Code: canvas-resize naar max ~1500px lange zijde, jpeg-kwaliteit
- Verifiëren: compressie-test (mock canvas of pure functie) groen

### F3: Upload naar Supabase Storage
- Status: `[ ]`
- Bestand(en): `src/lib/storage.ts` (+ test mock)
- Code: upload naar bucket `meldingen-fotos`, retourneer public-url
- Verifiëren: test groen

### F4: Koppel foto's aan melding (foto_urls)
- Status: `[ ]`
- Code: meerdere foto's → array van urls in melding
- Verifiëren: typecheck + unit waar mogelijk

### F5: Verifieer foto's maken + opslaan
- Status: `[ ]`
- Verifiëren: foto maken → compressie → upload → url in foto_urls

---

## Groep G — Melding maken: spraak (Whisper) (4 taken, ~35 min)

### G1: POST /api/transcribe route + test
- Status: `[ ]`
- Bestand(en): `src/app/api/transcribe/route.ts`, `route.test.ts`
- Code: audio multipart → OpenAI Whisper → tekst. Mock OpenAI in test. Env uitbreiden met OPENAI_API_KEY.
- Verifiëren: test groen (200 met tekst, 400 zonder audio, 502 bij Whisper-fout)

### G2: Audio-opname component
- Status: `[ ]`
- Bestand(en): `src/components/SpraakOpname.tsx`
- Code: MediaRecorder, opnemen/stoppen, audio-blob
- Verifiëren: opname werkt in browser

### G3: Opname → transcribe → tekst-veld
- Status: `[ ]`
- Code: blob naar /api/transcribe, tekst invullen in melding-veld (handmatig overschrijfbaar)
- Verifiëren: ingesproken NL → tekst

### G4: Verifieer spraak-flow
- Status: `[ ]`
- Verifiëren: microfoon → tekst, fallback tekst typen werkt

---

## Groep H — Melding maken: urgentie + opslaan/verzenden (5 taken, ~35 min)

### H1: Melding-form samenstellen
- Status: `[ ]`
- Bestand(en): `src/components/MeldingForm.tsx`, route `src/app/melding/nieuw/page.tsx` (of vanuit detail)
- Code: urgentie rood/geel, tekst (uit spraak of typen), foto's, koppel aan klus/opdracht
- Verifiëren: form rendert compleet

### H2: createMonteurMelding + updateMelding (server action) + test
- Status: `[ ]`
- Bestand(en): `src/lib/db.ts`, test
- Code: insert met bron='monteur', status='concept'; update naar 'verzonden' + verzonden_at; heropslaan verzonden → aangepast=true
- Verifiëren: db-tests groen

### H3: Opslaan-concept vs verzenden knoppen
- Status: `[ ]`
- Code: twee acties, juiste status-overgang
- Verifiëren: concept blijft in actief, verzonden gaat naar history

### H4: Verifieer hele monteur-flow
- Status: `[ ]`
- Verifiëren: foto+spraak+urgentie → concept → verschijnt werkbak → verzenden → history → aanpassen → aangepast-vlag

### H5: Hele suite groen
- Status: `[ ]`
- Verifiëren: `npm test` alles groen

---

## Groep I — Afronding (4 taken, ~25 min waarvan Rein ~10 min)

### I1: Rein — test op echte telefoon
- Status: `[ ]` (Rein)
- Verifiëren: camera, microfoon (Whisper), nav-knop, bel-knop werken op echt toestel
- Noot: vereist app bereikbaar op telefoon (lokaal netwerk-IP uit `npm run dev`, of korte ngrok/Vercel-preview)

### I2: PLAN-2A.md afvinken + werkelijke tijden
- Status: `[ ]`

### I3: Logboek-entry
- Status: `[ ]`
- Bestand(en): `c:\Users\rkzij\Mainframe\07_logboek\2026-05-28_ksv-demo-sessie-2a.md`

### I4: Finale commit
- Status: `[ ]`

---

## Totaal

- 9 groepen, ~42 taken
- Geschatte werktijd Claude: ~4.5-5.5u
- Rein-werk: ~15 min (SQL+bucket in A2, telefoon-test in I1)
- Dit is een volle sessie. Als energie/tijd op raakt: stop na Groep E (werkbak + detail + PDF-upload werken al), monteur-invoer (F-H) kan een vervolgblok worden.
- ui-ux-pro-max wordt geactiveerd in B1, vóór er JSX met styling komt.
