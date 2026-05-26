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
- Status: `[ ]`
- Bestand(en): `supabase/schema.sql`
- Test eerst: n.v.t. (pure SQL)
- Code: CREATE TABLE meldingen met velden uit BRAINSTORM-1, plus index op `created_at desc`
- Verifiëren: SQL leest goed door
- Tijd: 3 min

### B2: Rein — Supabase-account aanmaken + nieuw project
- Status: `[ ]`
- Wie: **Rein** (Claude wacht)
- Stappen: supabase.com → sign up met Google → new project (naam: `ksv-demo`, regio: `eu-central`, sterk wachtwoord noteren)
- Verifiëren: Project-dashboard zichtbaar, status `Active`
- Tijd: 5-10 min

### B3: Rein — SQL plakken in Supabase SQL Editor
- Status: `[ ]`
- Wie: **Rein** (Claude wacht)
- Stappen: Supabase Studio → SQL Editor → plak inhoud `supabase/schema.sql` → Run
- Verifiëren: Table Editor toont tabel `meldingen` met alle kolommen
- Tijd: 2 min

### B4: Rein — Keys ophalen + in `.env.local` zetten
- Status: `[ ]`
- Wie: **Rein** (Claude wacht)
- Stappen: Supabase Settings → API → kopieer Project URL, anon-key, service_role-key → maak `.env.local` aan in project-map, plak waarden (incl. ANTHROPIC_API_KEY uit trc-platform/.env hergebruiken + `ANTHROPIC_MODEL=claude-sonnet-4-6` of nieuwer)
- Verifiëren: `.env.local` bestaat, alle 5 vars gevuld
- Tijd: 3 min

### B5: `lib/env.ts` met Zod-validatie voor process.env
- Status: `[ ]`
- Bestand(en): `src/lib/env.ts`
- Test eerst: nee (validatie zelf is de test)
- Code: Zod-schema voor 5 vereiste vars, `.parse(process.env)` met duidelijke error-message
- Verifiëren: import in een willekeurig bestand → app-start faalt met heldere melding als var mist
- Tijd: 3 min

---

## Groep C — Env-check CLI (3 taken, ~7 min)

### C1: Test voor env-validatie (RED)
- Status: `[ ]`
- Bestand(en): `src/lib/env.test.ts`
- Test eerst: ja
- Code: 3 tests: alle vars gezet → valid; één missend → Zod-error; lege string → Zod-error
- Verifiëren: `pnpm test env` faalt (geen implementatie nog) of slaagt (als B5 al gedaan)
- Tijd: 3 min

### C2: `scripts/check-env.mjs` CLI tool
- Status: `[ ]`
- Bestand(en): `scripts/check-env.mjs`, update `package.json` (`"check:env": "node scripts/check-env.mjs"`)
- Code: importeer env-schema, parse process.env, log groen vinkje of rode lijst missende vars
- Verifiëren: `pnpm check:env` output is duidelijk
- Tijd: 3 min

### C3: Run `pnpm check:env` → alles groen
- Status: `[ ]`
- Verifiëren: groen vinkje voor alle 5 vars
- Tijd: 1 min
- **Dit is Rein's antwoord op de "hoe weet ik dat env-vars OK zijn"-vraag**

---

## Groep D — Parser-laag TDD (5 taken, ~16 min)

### D1: Test voor Zod parser-output-schema (RED)
- Status: `[ ]`
- Bestand(en): `src/lib/parser-schema.test.ts`
- Test eerst: ja
- Code: 4 tests: volledig object valid; ontbrekende optionele velden = null ok; verkeerd type faalt; lege `meldingen[]` is geldig
- Verifiëren: tests falen (geen schema nog)
- Tijd: 3 min

### D2: `src/lib/parser-schema.ts` met Zod-schema (GREEN)
- Status: `[ ]`
- Bestand(en): `src/lib/parser-schema.ts`
- Code: Zod-schema dat Claude-output beschrijft (klant_naam, klant_adres, referentienummer, adviseur als nullable strings; meldingen als array van `{keller_code, omschrijving, melding_tekst}`)
- Verifiëren: `pnpm test parser-schema` → groen
- Tijd: 3 min

### D3: Test voor Claude-client met mock (RED)
- Status: `[ ]`
- Bestand(en): `src/lib/claude-client.test.ts`
- Test eerst: ja
- Code: mock `@anthropic-ai/sdk`, test dat `parsePdfWithClaude(buffer)` Anthropic aanroept met juiste model + system prompt + PDF, en gevalideerde output teruggeeft
- Verifiëren: test faalt (geen client nog)
- Tijd: 4 min

### D4: `src/lib/claude-client.ts` (GREEN)
- Status: `[ ]`
- Bestand(en): `src/lib/claude-client.ts`
- Code: Anthropic SDK-call met PDF-base64, system prompt: "Extract uit deze Keukenstudio service-PDF: klant, adres, referentienummer, adviseur, en alle meldingen met Keller-code", return type via Zod-parse
- Verifiëren: `pnpm test claude-client` → groen
- Tijd: 5 min

### D5: Run hele test-suite tot hier
- Status: `[ ]`
- Verifiëren: `pnpm test` alles groen
- Tijd: 1 min

---

## Groep E — API-route + DB-insert TDD (5 taken, ~17 min)

### E1: `src/lib/db.ts` Supabase-client + insertMelding
- Status: `[ ]`
- Bestand(en): `src/lib/db.ts`
- Code: createClient met SUPABASE_URL + SERVICE_KEY (server-side), functie `insertMelding(data)` die rij invoegt
- Verifiëren: typechecks OK
- Tijd: 3 min

### E2: Test voor `lib/db.ts` met gemockte Supabase (RED → GREEN)
- Status: `[ ]`
- Bestand(en): `src/lib/db.test.ts`
- Code: mock Supabase-client, test dat insertMelding `from('meldingen').insert(...)` aanroept met correcte payload
- Verifiëren: groen
- Tijd: 4 min

### E3: Test voor `app/api/parse-pdf/route.ts` (RED)
- Status: `[ ]`
- Bestand(en): `src/app/api/parse-pdf/route.test.ts`
- Test eerst: ja
- Code: mock claude-client + db, test happy path (PDF erin → 200 + JSON met id), test 413 voor te grote PDF, test 502 als Claude rommel teruggeeft
- Verifiëren: tests falen
- Tijd: 4 min

### E4: `app/api/parse-pdf/route.ts` implementatie (GREEN)
- Status: `[ ]`
- Bestand(en): `src/app/api/parse-pdf/route.ts`
- Code: POST handler, multipart parse, size-check 10 MB, parse via claude-client, insert via db, return `{id, ...data}`
- Verifiëren: `pnpm test parse-pdf` → groen
- Tijd: 5 min

### E5: Hele suite groen
- Status: `[ ]`
- Verifiëren: `pnpm test` alles groen
- Tijd: 1 min

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
