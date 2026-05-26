# PLAN Sessie 1 - KSV Demo

Datum: 2026-05-26
Brainstorm-doc: [BRAINSTORM-1.md](BRAINSTORM-1.md)
Werkwijze: projectstart-discipline skill (TDD waar zinvol)
Doel: parser werkend, PDF → Claude → Supabase, end-to-end via curl
Geschatte tijd: 3-4u (excl. 5-10 min Rein's Supabase setup)
Package manager: **npm** (pnpm niet geïnstalleerd op systeem, geen tijd om dat nu te regelen)

Status-legenda: `[ ]` open, `[x]` afgevinkt + werkelijke tijd erbij.

---

## Groep A — Skeleton (5 taken, ~12 min)

### A1: Next.js skeleton initialiseren
- Status: `[x]` 3 min (npm i.p.v. pnpm). Hick-up: create-next-app weigerde door bestaande MD's → tijdelijk verplaatst naar `..\_tmp_ksv_md` en daarna terug.
- Bestand(en): hele project-map (Next.js 16.2.6, React 19.2.4, TS strict, App Router, src-dir)
- Code: `npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --turbopack --use-npm --skip-install`
- Verifiëren: `package.json` en `src/app/page.tsx` aanwezig

### A2: .gitignore + git init + eerste commit
- Status: `[x]` 1 min. create-next-app deed `git init` + "Initial commit from Create Next App" zelf. Tweede commit "docs: brainstorm + plan + project context voor sessie 1" voor MD's. `.gitignore` regelt `.env*` al af.
- Verifiëren: `git log` toont 2 commits

### A3: Dependencies installeren
- Status: `[x]` 3 min
- Bestand(en): `package.json`
- Code: `npm install @anthropic-ai/sdk @supabase/supabase-js zod` + `npm install --save-dev vitest @vitest/coverage-v8 @types/node pdf-lib`
- Verifiëren: alle 7 deps in package.json. 2 moderate transitieve vulnerabilities (niet kritiek voor demo).

### A4: Vitest config + npm scripts
- Status: `[x]` 2 min
- Bestand(en): `vitest.config.ts`, `package.json` (scripts: `test`, `test:watch`, `check:env`)
- Verifiëren: `npx vitest run` geeft "No test files found" exit 1 (verwacht, geen tests nog)

### A5: .env.example met alle vereiste vars
- Status: `[x]` 2 min
- Bestand(en): `.env.example`
- Code: 5 vars met Nederlandse comments. Tip in comment: hergebruik ANTHROPIC_API_KEY uit trc-platform/.env
- Verifiëren: bestand in repo

---

## Groep B — Supabase opzetten (5 taken, ~15-20 min waarvan Rein 10-15 min)

### B1: Schrijf SQL voor `meldingen` tabel
- Status: `[x]` 3 min
- Bestand(en): `supabase/schema.sql`
- Code: CREATE TABLE meldingen met 12 velden uit BRAINSTORM-1, CHECK constraints op `bron` en `urgentie`, jsonb default `[]`, 2 indexen (created_at desc, bron)
- Verifiëren: SQL leest goed door, Rein heeft hem gerund

### B2: Rein — Supabase-account + project
- Status: `[x]` overgeslagen — al klaar (BKM AI org, project `ksv-demo`, regio eu-west-1 Ireland)

### B3: Rein — SQL plakken in Supabase SQL Editor
- Status: `[x]` ~2 min (Rein)
- Verifiëren: Rein bevestigde "B3+B4 klaar"

### B4: Rein — Keys in `.env.local`
- Status: `[x]` ~2 min (Rein)
- Update: nieuwe Supabase-naamgeving — `SUPABASE_PUBLISHABLE_KEY` (was anon) en `SUPABASE_SECRET_KEY` (was service_role). `.env.example` en code aangepast. Claude maakte het bestand met placeholders, Rein vulde 2× `PLAK_HIER` in.
- Verifiëren: `npm run check:env` gaf alle 5 vars groen

### B5: `lib/env.ts` met Zod-validatie
- Status: `[x]` 4 min
- Bestand(en): `src/lib/env.ts`
- Code: Zod-schema met `loadEnv(source)` voor testbaarheid + cached `env()` voor app-runtime. Detecteert placeholders (`PLAK_HIER`, `TODO`, etc.), checkt min-length op secret-keys, checkt `https://` prefix op SUPABASE_URL, default `claude-sonnet-4-6` voor ANTHROPIC_MODEL.
- Verifiëren: import in scripts/check-env.ts → 6 tests groen

---

## Groep C — Env-check CLI (3 taken, ~7 min)

### C1: Test voor env-validatie (RED)
- Status: `[x]` 3 min — uitgevoerd vóór B5 voor strikt TDD
- Bestand(en): `src/lib/env.test.ts`
- Code: 6 tests: valid env, default voor model, missend API key, ongeldige URL, lege secret, placeholder-detectie
- Verifiëren: vitest gaf eerst "Cannot find module './env'" → RED bevestigd

### C2: `scripts/check-env.ts` CLI tool
- Status: `[x]` 2 min
- Bestand(en): `scripts/check-env.ts`, package.json script aangepast naar `node --env-file=.env.local --experimental-strip-types scripts/check-env.ts`
- Code: importeert loadEnv uit src/lib/env.ts, print groen vinkje + getrunceerde key-previews, of rode error-lijst
- Verifiëren: output is leesbaar, exit 0 op succes / 1 op fail
- Noot: Node 24 ondersteunt native TS via `--experimental-strip-types`, geen tsx-dep nodig

### C3: Run `npm run check:env` → alles groen
- Status: `[x]` 1 min
- Verifiëren: groen vinkje voor alle 5 vars
- Tijd: 1 min
- **Dit is Rein's antwoord op de "hoe weet ik dat env-vars OK zijn"-vraag**

---

## Groep D — Parser-laag TDD (5 taken, ~16 min)

### D1: Test voor Zod parser-output-schema (RED)
- Status: `[x]` 3 min
- Bestand(en): `src/lib/parser-schema.test.ts`
- Code: 6 tests: compleet valid, alleen nulls valid, lege meldingen-array valid, verkeerd type faalt, melding zonder keller_code faalt, object zonder meldingen-veld faalt
- Verifiëren: RED — "Cannot find module './parser-schema'"

### D2: `src/lib/parser-schema.ts` (GREEN)
- Status: `[x]` 3 min
- Bestand(en): `src/lib/parser-schema.ts`
- Code: Zod `ParsedPdfSchema` (4 nullable strings + meldingen-array van Zod `MeldingItemSchema`) PLUS handmatige `ParsedPdfJsonSchema` als const voor Anthropic tool_use (raw JSON-schema, niet Zod). Dubbele bron is bewust — Zod voor runtime-validatie, JSON-schema voor de tool-definition. Bij wijziging beide bijwerken.
- Verifiëren: 6 tests groen

### D3: Test voor Claude-client met mock (RED)
- Status: `[x]` 4 min
- Bestand(en): `src/lib/claude-client.test.ts`
- Code: 4 tests met mock van `@anthropic-ai/sdk` via `vi.hoisted`: juiste model/tool/PDF-base64, gevalideerde return, error bij geen tool_use, Zod-error bij schema-mismatch
- Verifiëren: RED — module niet gevonden

### D4: `src/lib/claude-client.ts` (GREEN)
- Status: `[x]` 7 min (incl 2 min mock-fix)
- Bestand(en): `src/lib/claude-client.ts`
- Code: `createParser(config)` factory + cached `parsePdfWithClaude(pdf)`. Tool_use met `tool_choice: { type: "tool", name: "extract_pdf_data" }` forceert structured output. Nederlandse system prompt met regels (referentienummer als string, null bij twijfel, altijd tool aanroepen). Bij text-response i.p.v. tool_use → informatieve error met de tekst.
- Mock-hick-up: `vi.fn().mockImplementation()` werkt niet als `new`-constructor. Opgelost met `class MockAnthropic` in `vi.mock` + `vi.hoisted` voor `mockCreate`.
- Verifiëren: 4 tests groen

### D5: Run hele test-suite tot hier
- Status: `[x]` 1 min
- Verifiëren: `npm test` → 3 files, 16 tests groen

---

## Groep E — API-route + DB-insert TDD (5 taken, ~17 min)

### E1: `src/lib/db.ts` Supabase-client + insertPdfMelding
- Status: `[x]` 3 min (na E2 test)
- Bestand(en): `src/lib/db.ts`
- Code: `createDb(config)` factory + cached `db()`. Server-side client met `auth: { persistSession: false }`. `insertPdfMelding(ParsedPdf)` voegt `bron='pdf'` toe en gebruikt `.select('id').single()`. Strict null-check op response.

### E2: Test voor `lib/db.ts` met gemockte Supabase
- Status: `[x]` 4 min (gedaan vóór E1, TDD)
- Bestand(en): `src/lib/db.test.ts`
- Code: 3 tests via `vi.hoisted` chain-mock van `from().insert().select().single()`: correcte payload met bron='pdf', returnt id, gooit error bij Supabase-error

### E3: Test voor `app/api/parse-pdf/route.ts` (RED)
- Status: `[x]` 4 min
- Bestand(en): `src/app/api/parse-pdf/route.test.ts`
- Code: 5 tests met mocks voor `@/lib/claude-client` + `@/lib/db`. Cases: 200 happy path, 400 zonder file, 413 >10MB, 502 Claude-faal, 503 DB-faal. Gebruikt Node 24 globals (File, FormData, Request).

### E4: `app/api/parse-pdf/route.ts` implementatie (GREEN)
- Status: `[x]` 5 min
- Bestand(en): `src/app/api/parse-pdf/route.ts`
- Code: Next.js App Router POST handler. Drie try/catch-blokken voor scherpe HTTP-statussen: 400 (multipart/file), 413 (size), 502 (Claude), 503 (DB). Gebruikt `NextResponse.json` voor consistente output.

### E5: Hele suite groen
- Status: `[x]` 1 min
- Verifiëren: `npm test` → 5 files, **24 tests groen** (env 6 + parser 6 + claude 4 + db 3 + route 5)

---

## Groep F — End-to-end met echte fake-PDF (4 taken, ~11 min)

### F1: `scripts/generate-fake-pdf.mjs`
- Status: `[ ]`
- Bestand(en): `scripts/generate-fake-pdf.mjs`, `test-pdfs/.gitkeep`
- Code: pdf-lib genereert PDF met realistische Keller-velden (klant "J. Jansen", adres, ref-nr `7444`, adviseur "M. de Vries", 2 meldingen met Keller-codes en omschrijvingen)
- Verifiëren: script-output toont gegenereerde velden
- Tijd: 5 min

### F2: Run script → `test-pdfs/voorbeeld.pdf` bestaat
- Status: `[ ]`
- Verifiëren: bestand opent in PDF-viewer, leesbaar
- Tijd: 1 min

### F3: `pnpm dev` + curl-test op echte endpoint
- Status: `[ ]`
- Code: `curl -F "file=@test-pdfs/voorbeeld.pdf" http://localhost:3000/api/parse-pdf`
- Verifiëren: HTTP 200, JSON-response met `klant_naam="J. Jansen"`, `referentienummer="7444"`, `meldingen[]` gevuld
- Tijd: 3 min

### F4: Supabase Studio → rij verifiëren
- Status: `[ ]`
- Verifiëren: Table Editor `meldingen` toont nieuwe rij met `bron='pdf'`, alle velden gevuld zoals verwacht
- Tijd: 2 min
- **Dit is de hoofd-verificatie van sessie 1**

---

## Groep G — Afronding (3 taken, ~8 min)

### G1: PLAN-1.md afvinken met werkelijke tijden
- Status: `[ ]`
- Verifiëren: alle taken `[x]` met `(min)` erbij, geleerd voor toekomst
- Tijd: 2 min

### G2: Logboek-entry
- Status: `[ ]`
- Bestand(en): `c:\Users\rkzij\Mainframe\07_logboek\2026-05-26_ksv-demo-sessie-1.md`
- Code: korte log: wat is gedaan, wat werkte, wat viel tegen, openstaande punten voor sessie 2
- Verifiëren: bestand bestaat in 07_logboek
- Tijd: 5 min

### G3: Finale commit
- Status: `[ ]`
- Code: `git add . && git commit -m "Sessie 1: PDF-parser end-to-end werkend"`
- Verifiëren: `git log` toont meerdere commits, laatste = sessie-afronding
- Tijd: 1 min

---

## Totaal

- 30 taken verdeeld over 7 groepen
- Geschatte werktijd Claude: ~80 min
- Geschatte werktijd Rein: 10-15 min (Supabase setup)
- Plus buffer voor onverwacht vastlopen: 30-60 min
- Verwachte totale sessieduur: 2-3 uur. Onder de 3-5 uur uit PROJECT.md.
