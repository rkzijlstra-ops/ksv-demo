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

### F1: `scripts/generate-fake-pdf.ts`
- Status: `[x]` 5 min
- Bestand(en): `scripts/generate-fake-pdf.ts`, npm-script `generate:fake-pdf`
- Code: pdf-lib met Helvetica + bold. A4 pagina met Keller-style header (klant J. Jansen, ref 7444, adviseur M. de Vries) en 2 artikelen met "Uw melding"-tekst.
- Verifiëren: script logt pad + bytes. Bestand 1528 bytes.

### F2: Run script → `test-pdfs/voorbeeld.pdf` bestaat
- Status: `[x]` 1 min
- Verifiëren: `npm run generate:fake-pdf` → bestand staat in `test-pdfs/voorbeeld.pdf`

### F3: `npm run dev` + curl-test op echte endpoint
- Status: `[x]` 10 min (3 min basis + 7 min debugging Supabase permissions)
- Dev draait op **port 3001** (3000 was bezet). Curl-commando: `curl.exe -s -F "file=@test-pdfs/voorbeeld.pdf" http://localhost:3001/api/parse-pdf`
- Hick-up 1 (RLS): Supabase zet sinds 2024 default RLS aan op nieuwe public-tabellen. Opgelost: `alter table public.meldingen disable row level security;`
- Hick-up 2 (GRANTs): zelfs na RLS-uit, kreeg `permission denied for table meldingen`. Opgelost: expliciete `grant select, insert, update, delete on public.meldingen to anon, authenticated, service_role;` Vermoedelijk een Supabase-edge-case in BKM AI org-config (Supabase doet dit normaal automatisch).
- Diagnostiek: directe SQL-insert in Supabase werkte, wat aantoonde dat schema OK was en het probleem in de PostgREST-laag tussen JS-client en Postgres zat.
- Verifiëren: response = JSON 200 met id `9e4d149e-...`, klant J. Jansen, ref 7444, 2 meldingen correct geparsed. ✓

### F4: Supabase Studio → rij verifiëren
- Status: `[x]` 1 min (Rein)
- Verifiëren: Rein bevestigde "rij J. Jansen, Hoofdstraat 12, 2342 AB Voorschoten zichtbaar in Table Editor. End-to-end flow werkt."
- **Dit is de hoofd-verificatie van sessie 1** ✓

---

## Groep G — Afronding (3 taken, ~8 min)

### G1: PLAN-1.md afvinken met werkelijke tijden
- Status: `[x]` 3 min — alle 30 taken afgevinkt + sessie-evaluatie bovenaan

### G2: Logboek-entry
- Status: `[x]` 5 min
- Bestand(en): `07_logboek/2026-05-26_ksv-demo-sessie-1.md` (in deze projectmap)

### G3: Finale commit
- Status: `[x]` 1 min

---

## Totaal

- 30 taken verdeeld over 7 groepen
- Geschatte werktijd Claude: ~80 min
- Geschatte werktijd Rein: 10-15 min (Supabase setup)
- Plus buffer voor onverwacht vastlopen: 30-60 min
- Verwachte totale sessieduur: 2-3 uur. Onder de 3-5 uur uit PROJECT.md.

---

## Sessie-evaluatie (G1)

**Werkelijke tijden:**
- Groep A (skeleton): 12 min — exact zoals geschat
- Groep B (Supabase): ~10 min (B2 overgeslagen want Rein had project al, B3+B4 door Rein in ~5 min)
- Groep C (env-check): 7 min — exact zoals geschat
- Groep D (parser TDD): ~18 min — 2 min over budget door mock-fix
- Groep E (API + DB): ~17 min — exact zoals geschat
- Groep F (end-to-end): ~19 min — 8 min over door Supabase RLS+GRANT debug
- Groep G (afronding): nog te tellen

**Totaal Claude-werk:** ~85 min, plus ~5-7 min Rein-werk = ~90 min sessie. **Ruim onder de 3-5u uit PROJECT.md.**

**Alle 6 verificatiecriteria gehaald:**
1. ✓ `npm run dev` start zonder errors (op port 3001)
2. ✓ `npm test` slaagt — 24 tests groen, 5 files
3. ✓ Curl-test geeft JSON met klant_naam, ref-nr, meldingen[] gevuld
4. ✓ Supabase rij `9e4d149e-...` zichtbaar in Table Editor (Rein bevestigd)
5. ✓ PLAN-1.md afgevinkt (alle 30 taken)
6. ✓ Logboek-entry (G2)

**Wat goed werkte:**
- Strict TDD-discipline gaf vertrouwen bij Supabase-debug: bij parser/db/route-mocks wist ik dat code zelf correct was, dus zoeken alleen in env/infra
- Tool_use (aanpak B) gaf direct schone JSON-extractie, geen retry-logic nodig
- Eén tabel met `bron`-veld werkt prima voor demo én leidt naar sessies 2+3
- Eigen Zod-validatie van env-vars + `npm run check:env` CLI vóór de parser kostte 5 min en bespaarde ons later veel verwarring

**Wat tegenviel / leerpunten:**
- `pnpm` niet geïnstalleerd → terugvallen op `npm`. Pijnloos maar plan moest aangepast
- `create-next-app` weigert non-empty dir → MD's tijdelijk verplaatsen. 2 min verlies
- `.gitignore`'s `.env*` regelt ook `.env.example` af → fix met `!.env.example` whitelist
- Vitest `vi.fn().mockImplementation()` werkt niet als `new`-constructor → class-pattern met `vi.hoisted` vereist
- **Supabase RLS+GRANTs in BKM AI org** kostte 7 min debug. Memory opgeslagen voor toekomst, schema.sql heeft nu standaard `disable RLS` + expliciete GRANTs
- `MODULE_TYPELESS_PACKAGE_JSON` warning op CLI-scripts (niet kritiek, fix is `"type": "module"` in package.json — uitgesteld)

**Klaar voor sessie 2** zonder openstaande blocking issues.
