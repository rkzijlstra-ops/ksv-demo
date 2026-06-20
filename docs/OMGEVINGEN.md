# Omgevingen, databases en deploys (naslag)

Eén waarheid over wat aan welke database/deploy hangt. **Lees dit vóór je iets test, migreert of deployt.**
Er zijn DRIE losse Supabase-databases. Haal ze nooit door elkaar.

## De drie omgevingen

| Omgeving | Supabase-project (ref) | Env-bestand | Wie/wat gebruikt het | Deploy |
|---|---|---|---|---|
| **Productie** | `qbynjfscdxhwdkzfqjjg` | `.env.local` (`SUPABASE_URL`) | lokale `next dev`/`next build` én de prod-Vercel | `master` → prod-Vercel, `DEMO_MODE` uit |
| **Test / CI** | `mydwcsaalahtidzyefsq` | `.env.test` | Playwright e2e (lokaal + in CI) | geen deploy |
| **Demo** | `bcaallhweqamkrxtlwvx` | `.env.demo-vercel` | de demo-Vercel | `master` → demo-Vercel, `DEMO_MODE=1` |

- Productie-Vercel: `https://mijn.kluslus.nl` (+ default `keukenstudio-voorschoten-demo.vercel.app`).
- Demo-Vercel: `https://kluslus-demo.vercel.app`.
- Repo: `github.com/rkzijlstra-ops/ksv-demo`. **Beide** Vercel-projecten deployen van dezelfde `master`; het enige verschil is de env (de demo zet `DEMO_MODE=1` + eigen demo-database). Alle demo-gedrag is gegrendeld op `DEMO_MODE`, dus in productie inert.

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

## Openstaand / let op

- `APP_URL` in `.env.demo-vercel` staat nog op de placeholder `PLAK_DEMO_VERCEL_URL`. In de Vercel demo-env hoort dit `https://kluslus-demo.vercel.app` te zijn (de QR werkt sowieso via de request-host; APP_URL telt voor links in demo-mails).
- Nog geen aparte database voor branch-preview-deploys. Een Vercel-preview van een branch pakt de env van zijn Vercel-project; wil je "eerst testen, dan productie", richt dan previews bewust op de demo-/test-DB in (nu niet gedaan).

Detail van de demo-opzet zelf: zie `07_logboek/2026-06-19_demo-omgeving-aanmelding-isolatie-e2e.md`.
