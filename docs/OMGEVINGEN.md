# Omgevingen, databases en deploys (naslag)

Eén waarheid over wat aan welke database/deploy hangt. **Lees dit vóór je iets test, migreert of deployt.**
Er zijn DRIE losse Supabase-databases. Haal ze nooit door elkaar.

## De omgevingen

Drie losse Supabase-databases en drie Vercel-projecten (prod, demo, test). Prod en demo delen de DB-rij niet; het test-project hergebruikt de test-DB (geen vierde database).

| Omgeving | Supabase-project (ref) | Env-bestand | Wie/wat gebruikt het | Deploy |
|---|---|---|---|---|
| **Productie** | `qbynjfscdxhwdkzfqjjg` | `.env.local` (`SUPABASE_URL`) | lokale `next dev`/`next build` én de prod-Vercel | `master` → prod-Vercel, `DEMO_MODE` uit |
| **Test / CI** | `mslexkwwhhwlxmwbnyff` | `.env.test` | Playwright e2e (lokaal + CI) **én** het test-Vercel-project kluslus-test | de test-branch → kluslus-test-Vercel |
| **Demo** | `bcaallhweqamkrxtlwvx` | `.env.demo-vercel` | de demo-Vercel | `master` → demo-Vercel, `DEMO_MODE=1` |

- Productie-Vercel: `https://mijn.kluslus.nl` (+ default `keukenstudio-voorschoten-demo.vercel.app`).
- Demo-Vercel: `https://kluslus-demo.vercel.app`.
- Test-Vercel: `https://kluslus-test.vercel.app` (eigen project, draait tegen de TEST-DB met allowlist = alleen Reinier, `DEMO_MODE=0`, `TEST_LOGIN=1`, beveiligd met Vercel Authentication). Inloggen zonder Google/magic-link via `/test-login`. Env-blok: `.env.preview` (gitignored).
- Repo: `github.com/rkzijlstra-ops/ksv-demo`. Prod en demo deployen van `master` (verschil = env: demo zet `DEMO_MODE=1` + eigen DB). Alle demo-gedrag is gegrendeld op `DEMO_MODE`, dus in productie inert. De test-login is gegrendeld op `TEST_LOGIN`/niet-productie, dus op prod en demo 404.

## Werken met meerdere terminals (git worktrees)

Meerdere terminals in DEZELFDE map botsen: wissel je in de ene van branch, dan wisselt de andere mee, en build-caches lopen door elkaar. Daarom: **één map per terminal/branch** via een git worktree (een tweede map van hetzelfde project, met een eigen branch, die wel dezelfde git-geschiedenis deelt).

Opzet (vast):
- **Hoofdmap = thuis = master:** `C:\Users\rkzij\Mainframe\01_projecten\keukenstudio-voorschoten-demo`. Open hier een terminal voor master/algemeen werk en docs.
- **Eén worktree-map per branch** onder `C:\Users\rkzij\ksv-worktrees\<branch>`. Open je tweede terminal DAAR voor dat werk.
- Overzicht van alle mappen/branches: `git worktree list`.

Een nieuwe worktree maken (voorgekauwd, of vraag Claude "maak een worktree voor branch X"):
```
git worktree add C:/Users/rkzij/ksv-worktrees/<branch> <branch>     # of: ... -b <nieuwe-branch>
cp .env.local .env.test .env.demo-vercel C:/Users/rkzij/ksv-worktrees/<branch>/
cd C:/Users/rkzij/ksv-worktrees/<branch> && npm ci
```
Let op:
- De `.env.*`-bestanden zitten NIET in git; vandaar de `cp`. Elke worktree heeft zijn eigen `node_modules` (vandaar `npm ci`).
- Worktrees staan BUITEN de Mainframe-map, dus ze zitten niet in de backup. Je werk is veilig via git: **commit en push vaak**.
- Een branch kan maar in één map tegelijk uitgecheckt staan; daarom staat master in de hoofdmap en elke feature in zijn eigen worktree.
- Klaar met een branch? `git worktree remove C:/Users/rkzij/ksv-worktrees/<branch>`.

## Welke database raak ik nu? (de belangrijkste valkuil)

- **Lokale `npm run dev` / `next build` draait op de PRODUCTIE-database** (`.env.local`). Bouw je lokaal iets en schrijf je data weg, dan zit dat in productie. Wil je lokaal veilig tegen het test-zijspoor, draai dan via de e2e (die laadt `.env.test`), of laad expliciet `.env.test`.
- **De e2e (`npm run test:e2e`, `npm run test:e2e:demo`) draaien tegen het TEST-project** (`.env.test`), nooit productie. De demo-e2e seedt onder een eigen zaak "Demo Keukenstudio" en raakt de gewone e2e-data niet.
- **De demo-Vercel draait tegen het DEMO-project** (`.env.demo-vercel`).

## Migraties (schema)

- `npm run migrate:test -- supabase/<bestand>.sql` draait de migratie tegen de **TEST-DB én de DEMO-DB** (zijsporen). Vereist `SUPABASE_TEST_DB_URL` in `.env.local`; demo optioneel via `SUPABASE_DEMO_DB_URL`.
- **Productie-migraties doet Reinier zelf, handmatig.** Het script raakt productie nooit.
- **Regel:** elke schema-wijziging op ALLE drie draaien (prod handmatig, test+demo via `migrate:test`). Anders schema-drift → CI rood of demo kapot.

## Demo seeden/resetten

- `npm run seed:demo` (of `reset:demo`): vult de **demo-DB** met verse voorbeelddata (gebruikt `.env.local` + `SUPABASE_DEMO_*`). In de demo zelf doen de knoppen "Speel opnieuw" / "Helemaal opnieuw" hetzelfde via `/api/demo/reset`.
- De demo isoleert op een eigen opdrachtgever "Demo Keukenstudio"; seed/wipe/opruimen zijn daarop (en op de namespace `@voorbeeld.kluslus.test`) gescoped.

## Demo gebruiken

- Start als kantoor: `https://kluslus-demo.vercel.app/demo/word-beheerder` (naam + 06 + e-mail).
- Monteurs: QR op het dashboard, of `/demo/word-monteur`.
- Fallback-login: `demo-kantoor@voorbeeld.kluslus.test` / `Demo-Kluslus-2026!` via `/login`.

## Test-omgeving (kluslus-test): veilig bouwen/testen in de browser

De vaste "eerst testen, dan productie"-weg loopt via een **eigen Vercel-project `kluslus-test`** dat tegen de **TEST-DB** draait. Push een branch → kluslus-test deployt die → keuren in de browser op `/test-login` → mergen naar master (prod + demo volgen).

- **Waarom een apart project en niet de Preview-scope van prod:** de bestaande prod-variabelen claimen Production én Preview tegelijk, dus een tweede Preview-waarde ernaast zetten geeft conflicten. Een vers project heeft die conflicten niet: je plakt het hele `.env.preview`-blok in één keer (alle scopes).
- Het project zet: de test-Supabase-keys, `MAIL_ALLOWLIST` + `SMS_ALLOWLIST` = Reiniers eigen mail/06 (mail/sms dus alleen naar hem), `MAIL_DRY_RUN=0` + `SMS_DRY_RUN=0`, `DEMO_MODE=0` (echt product) en `TEST_LOGIN=1` (zet `/test-login` aan). Blok: `.env.preview` (gitignored); opzet in `PLAN-TEST-OMGEVING.md`.
- **Inloggen:** `/login` biedt alleen Google + magic-link; daarom `/test-login` (twee knoppen, vast test-account op de test-DB, gegrendeld op `TEST_LOGIN`/niet-productie). Beveiligd met Vercel Authentication, dus alleen Reinier komt erin.
- **Prod en demo blijven onaangeroerd.** Mergen naar master deployt beide; de test-login is daar 404 en `MAIL_DRY_RUN` staat default uit (inert).
- Verzend-grendel: de allowlist beperkt tot Reinier; een LEGE allowlist = geen beperking (zie `src/lib/demo.ts`). Een kanaal helemaal stilzetten kan met `MAIL_DRY_RUN`/`SMS_DRY_RUN=1`.
- **VALKUIL: `kluslus-test.vercel.app` = de PRODUCTIE-deployment van het test-project, met production branch op `master` (steady state).** Een feature-branch pushen landt dus alleen als **preview** (eigen `...-bkm-s-projects.vercel.app`-URL, achter Vercel-login), en verschijnt NIET vanzelf op het publieke `kluslus-test.vercel.app`. Een sessie kan zo ten onrechte denken "het staat live op kluslus-test". Twee manieren om een feature-branch op het publieke adres te keuren:
  1. **Promoten** (snel, tijdelijk): maak een Vercel-token (Account > Tokens, scope team `bkm-s-projects`, korte expiry; daarna intrekken), en draai:
     `npx vercel ls kluslus-test --token=$T --scope=bkm-s-projects` (vind de deployment van je commit; preview-URL ook via `gh api repos/rkzijlstra-ops/ksv-demo/deployments/<id>/statuses --jq '.[0].environment_url'`), dan
     `npx vercel promote <preview-url> --token=$T --scope=bkm-s-projects --yes`. Verifieer dáárna het echte gedrag (niet enkel HTTP 200).
  2. **Production Branch tijdelijk omzetten** naar de feature-branch in de kluslus-test-projectinstellingen (zoals 06-22 voor `planbord-maand-weekend`), en na de keuring terug naar `master`.

## Openstaand / let op

- `APP_URL` in `.env.demo-vercel` staat nog op de placeholder `PLAK_DEMO_VERCEL_URL`. In de Vercel demo-env hoort dit `https://kluslus-demo.vercel.app` te zijn (de QR werkt sowieso via de request-host; APP_URL telt voor links in demo-mails).

Detail van de demo-opzet zelf: zie `07_logboek/2026-06-19_demo-omgeving-aanmelding-isolatie-e2e.md`.
