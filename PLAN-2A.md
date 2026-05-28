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
- Status: `[ ]`
- Bestand(en): `supabase/schema-2a.sql`
- Code: ALTER TABLE meldingen: `status` (default 'concept', check concept|verzonden), `aangepast` bool default false, `verzonden_at` timestamptz, `foto_urls` jsonb default '[]', `klant_telefoon` text
- Verifiëren: SQL leest goed door

### A2: Rein — SQL runnen + Storage-bucket
- Status: `[ ]` (Rein, Claude wacht)
- Stappen: plak `schema-2a.sql` in SQL Editor + run; maak Storage-bucket `meldingen-fotos` (public read voor demo)
- Verifiëren: kolommen zichtbaar in Table Editor, bucket bestaat

### A3: Parser-schema uitbreiden met klant_telefoon (TDD)
- Status: `[ ]`
- Bestand(en): `src/lib/parser-schema.test.ts` (test eerst), `src/lib/parser-schema.ts`
- Code: `klant_telefoon: string|null` in Zod + JSON-schema (required-lijst bijwerken)
- Verifiëren: tests groen

### A4: claude-client system prompt bijwerken
- Status: `[ ]`
- Bestand(en): `src/lib/claude-client.ts`
- Code: instructie toevoegen telefoonnummer te extraheren (null bij twijfel)
- Verifiëren: bestaande client-tests blijven groen

### A5: db.ts uitbreiden + tests
- Status: `[ ]`
- Bestand(en): `src/lib/db.ts`, `src/lib/db.test.ts`
- Code: insertPdfMelding neemt klant_telefoon mee; nieuwe functies `getMeldingen()`, `getMeldingById(id)`, `createMonteurMelding()`, `updateMeldingStatus()`
- Verifiëren: `npm test` alles groen

---

## Groep B — UI-fundament met ui-ux-pro-max (5 taken, ~40 min)

### B1: ui-ux-pro-max skill activeren + design-keuze
- Status: `[ ]`
- Actie: Skill tool `ui-ux-pro-max` laden. Kies stijl/palette/typografie passend bij een snelle, overzichtelijke monteur-app (mobile-first, grote tap-targets, duidelijke urgentie-kleuren rood/geel)
- Verifiëren: design-keuze vastgelegd (kort, in dit plan of apart bestand)

### B2: Tailwind toevoegen aan project
- Status: `[ ]`
- Bestand(en): `package.json`, `postcss.config`, `src/app/globals.css`
- Code: Tailwind installeren + configureren (was `--no-tailwind` in sessie 1)
- Verifiëren: een test-class rendert in dev

### B3: Root layout + mobile-first viewport + globale stijl
- Status: `[ ]`
- Bestand(en): `src/app/layout.tsx`, `globals.css`
- Code: viewport meta, font, kleurtokens, basis-achtergrond
- Verifiëren: dev toont gestylede lege pagina

### B4: Basis-componenten (badges + card)
- Status: `[ ]`
- Bestand(en): `src/components/UrgentieBadge.tsx`, `BronBadge.tsx`, `OpdrachtCard.tsx`
- Code: urgentie rood/geel/grijs, bron monteur/pdf, kaart-layout. Test voor badge-kleurlogica.
- Verifiëren: componenten renderen, badge-test groen

### B5: Verifieer gestyled fundament
- Status: `[ ]`
- Verifiëren: dev-server toont nette lege werkbak-shell op telefoon-breedte

---

## Groep C — Werkbak (lijst) (5 taken, ~35 min)

### C1: Data-laag getMeldingen + groepering
- Status: `[ ]`
- Bestand(en): `src/lib/db.ts` (al deels A5), evt `src/lib/werkbak.ts`
- Code: haal meldingen op, splits in actief (concept + pdf niet-verzonden) en history (verzonden)
- Verifiëren: typecheck

### C2: Test voor werkbak-groepering
- Status: `[ ]`
- Bestand(en): `src/lib/werkbak.test.ts`
- Code: gegeven mix van rijen → juiste verdeling actief/history
- Verifiëren: groen

### C3: Werkbak-pagina (server component)
- Status: `[ ]`
- Bestand(en): `src/app/page.tsx`
- Code: actief bovenaan, history achter tab/inklapbaar (client-eilandje voor toggle)
- Verifiëren: pagina rendert lijst

### C4: Werkbak-interactie (history-toggle)
- Status: `[ ]`
- Bestand(en): `src/components/HistorySection.tsx` (client)
- Code: inklapbaar/tab, default ingeklapt
- Verifiëren: tik klapt history open/dicht

### C5: Verifieer werkbak met echte data
- Status: `[ ]`
- Verifiëren: J. Jansen-rij (sessie 1) zichtbaar in werkbak met juiste badges

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
