# Test-omgeving compleet: hele keten veilig end-to-end — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Van de bestaande test-omgeving (kluslus-test) één veilige plek maken waar de hele keten (inbound mail, klus, uitgaande mail, sms) echt end-to-end loopt, zowel automatisch als handmatig, zonder vierde database of vierde omgeving.

**Architecture:** De test-omgeving wordt compleet gemaakt langs zes fasen: (1) echte inbound mail op een eigen test-subdomein, (2) sms echt naar alleen Reinier, (3) onschuldige instellingen leesbaar maken, (4) één automatische keten-test, (5) data-isolatie tussen CI en handmatige keuring binnen dezelfde test-DB, (6) app-versie automatisch ophogen. Infra-stappen (DNS, Resend, Vercel) zijn voorgekauwd; codewijzigingen gaan test-first.

**Tech Stack:** Next.js (eigen versie, zie `AGENTS.md`), Supabase (Postgres + RLS), Resend (mail + receiving), CM.com (sms), Vercel (3 projecten), Playwright (e2e), Vitest (unit/integratie), Vimexx (DNS).

**Spec:** `docs/superpowers/specs/2026-06-27-test-omgeving-compleet-keten-design.md`

---

## Vooraf lezen (uitvoerder)

- `docs/OMGEVINGEN.md` — de drie databases/omgevingen, de worktree-opzet, de deploy-volgorde.
- Project-`CLAUDE.md` — de opleverlat en de harde regel branch → omgeving-test → akkoord Reinier → master.
- `AGENTS.md` — Next.js wijkt af van training; lees `node_modules/next/dist/docs/` vóór code.

## Werkwijze en branch-flow (geldt voor alle code-fasen)

1. Werk op een feature-branch in een eigen worktree onder `C:\Users\rkzij\ksv-worktrees\<branch>` (zie `docs/OMGEVINGEN.md`). Kopieer `.env.local .env.test .env.demo-vercel` mee en draai `npm ci`.
2. Test-first. Werk in dezelfde commit `TESTDEKKING.md` en `TOESTANDEN.md` bij.
3. Push → CI groen → merge de feature in `omgeving-test` (kluslus-test deployt) → **STOP en laat Reinier de keten keuren (beide rollen)** → pas na zijn expliciete akkoord naar `master`.
4. Commit klein en vaak; specifieke `git add`, geen losse untracked bestanden.

## Uitvoeringsvolgorde (afhankelijkheden)

- **Start meteen:** Fase 1a (DNS + Resend, want DNS-propagatie kost tijd) en Fase 2 + Fase 3 (Vercel-instellingen, los werk).
- **Parallel, los van de keten:** Fase 5 (data-isolatie) en Fase 6 (app-versie). Mogen elk hun eigen branch.
- **Na 1a + 2:** Fase 1b (inbound verifiëren) en daarna Fase 4 (automatische keten-test).

---

## FASE 1: Echte inbound mail op de test-omgeving

**Doel:** een echte mail naar `klus-<token>@klus-test.kluslus.nl` landt als klus in de test-app/test-DB.

**Achtergrond uit de code:**
- `src/lib/inbound.ts` bepaalt het ontvangstdomein al via `process.env.INBOUND_DOMAIN` met terugval `"kluslus.nl"`. De ontvangstadressen (`inboundAdres`) en de token-herkenning (`tokenUitAdressen`) volgen dat domein automatisch. Per-omgeving werkt dus puur via de env-var; nauwelijks code nodig.
- `src/app/api/inbound/route.ts` verifieert de webhook met `RESEND_WEBHOOK_SECRET` (optioneel; leeg = geen check) en haalt de mail + bijlagen bij Resend op via `email_id`.

### Fase 1a — Infra: subdomein + Resend (handmatig, voorgekauwd voor Reinier)

- [ ] **Stap 1: Subdomein voor inbound kiezen.** Vast: `klus-test.kluslus.nl` (los van productie `klus.kluslus.nl`).

- [ ] **Stap 2: Domein toevoegen in Resend.** Op `resend.com` → **Domains** → **Add Domain** → `klus-test.kluslus.nl`, region EU (West) zodat het gelijk is aan productie. Resend toont nu DNS-records (MX voor inbound, plus eventueel SPF/DKIM/DMARC voor verzenden — voor zuiver ontvangen is de MX het belangrijkst).

- [ ] **Stap 3: DNS-records bij Vimexx plaatsen.** Log in bij Vimexx → DNS van `kluslus.nl` → voeg exact de records toe die Resend bij stap 2 toonde (de MX wijst naar Resend's inbound-host, type zoals `inbound-smtp.<region>.amazonaws.com`). Bewaar een screenshot van de Resend-records zodat je 1-op-1 kunt overtikken.

- [ ] **Stap 4: Wachten op verificatie.** Terug in Resend: wacht tot het domein **Verified** is (DNS-propagatie kan tot enkele uren duren). Tot die tijd kan Fase 1b nog niet getest worden; ga ondertussen verder met andere fasen.

- [ ] **Stap 5: Inbound-webhook van het test-domein naar kluslus-test laten wijzen.** In Resend de receiving/webhook voor `klus-test.kluslus.nl` instellen op `https://kluslus-test.vercel.app/api/inbound` (de productie-webhook van `klus.kluslus.nl` ongemoeid laten). Genereer een webhook-signing-secret en bewaar die voor stap 7.

- [ ] **Stap 6: `INBOUND_DOMAIN` op kluslus-test zetten.** Vercel → project **kluslus-test** → Settings → Environment Variables → `INBOUND_DOMAIN = klus-test.kluslus.nl` (target: Production + Preview). Zie Fase 3 voor het type (plain, niet sensitive).

- [ ] **Stap 7: `RESEND_WEBHOOK_SECRET` op kluslus-test zetten.** Vercel → kluslus-test → de secret uit stap 5 als `RESEND_WEBHOOK_SECRET` (sensitive mag hier blijven, het is een geheim).

- [ ] **Stap 8: Redeploy kluslus-test** zodat de nieuwe env-vars actief zijn (Vercel → Deployments → Redeploy de production-deployment van kluslus-test).

### Fase 1b — Code + verificatie

- [ ] **Stap 1: Unit-test borgen dat het ontvangstadres het env-domein volgt.**

Bestand: `src/lib/inbound.test.ts` (maak aan als die er niet is; controleer eerst met een Glob op bestaande inbound-tests).

```ts
import { describe, it, expect, afterEach } from "vitest";
import { inboundAdres, tokenUitAdressen, inboundDomein } from "./inbound";

describe("inbound-domein volgt de omgeving", () => {
  afterEach(() => { delete process.env.INBOUND_DOMAIN; });

  it("bouwt het ontvangstadres op het ingestelde test-domein", () => {
    process.env.INBOUND_DOMAIN = "klus-test.kluslus.nl";
    expect(inboundDomein()).toBe("klus-test.kluslus.nl");
    expect(inboundAdres("abc123")).toBe("klus-abc123@klus-test.kluslus.nl");
  });

  it("herkent het token op het test-domein", () => {
    const token = tokenUitAdressen(["klus-abc123@klus-test.kluslus.nl"], "klus-test.kluslus.nl");
    expect(token).toBe("abc123");
  });
});
```

- [ ] **Stap 2: Test draaien, verwachten dat hij faalt of slaagt afhankelijk van bestaande dekking.** Run: `npm test -- src/lib/inbound.test.ts`. Als de functies al bestaan (dat doen ze), slaagt de test meteen; dat is prima, hij borgt het per-omgeving-gedrag tegen regressie.

- [ ] **Stap 3: Commit.** `git add src/lib/inbound.test.ts` en commit `test: borg inbound-adres per omgeving`.

- [ ] **Stap 4: Echte verificatie (na Verified domein, beide rollen).** Reinier stuurt vanaf zijn eigen mail een testmail met een echte order-PDF naar zijn test-ontvangstadres `klus-<token>@klus-test.kluslus.nl` (het token van zijn test-monteur/-kantoor-profiel; haal dat zo nodig op uit de test-DB). Controleer end-to-end: de mail komt binnen, de PDF wordt uitgelezen, er ontstaat een klus-voorstel in het juiste bakje op kluslus-test. Claude leest tegelijk de Vercel-runtime-logs van kluslus-test mee (kortlevend Vercel-token, daarna intrekken) om te bevestigen dat `/api/inbound` `email.received` ontving en verwerkte. "Endpoint 200" is geen bewijs; de klus moet echt verschijnen.

---

## FASE 2: SMS echt naar alleen Reinier op de test-omgeving

**Doel:** een actie op kluslus-test die een sms hoort te sturen, levert een echte sms op Reiniers telefoon, en niemand anders kan er een krijgen.

- [ ] **Stap 1: De sms-env op kluslus-test expliciet (her)zetten.** Vercel → kluslus-test → Environment Variables, controleer/zet (target Production + Preview):
  - `SMS_DRY_RUN = 0`
  - `SMS_ALLOWLIST = +31631665814`
  - `CM_GW_URL = https://gw.cmtelecom.com/v1.0/message`
  - `SMS_AFZENDER = Kluslus`
  - `CM_PRODUCT_TOKEN = <geldig CM-token>` (sensitive; haal de geldige waarde uit de productie-Vercel of CM.com, want de huidige is onleesbaar). Zonder geldig token faalt verzending stil.

  Omdat de bestaande waarden type "sensitive" zijn en niet te lezen, zet je ze opnieuw in plaats van aan te nemen dat ze kloppen. De onschuldige hiervan (`SMS_DRY_RUN`, `SMS_ALLOWLIST`) zet je als plain (Fase 3).

- [ ] **Stap 2: Unit-test borgen dat de allowlist een vreemd nummer blokkeert en het eigen nummer doorlaat.**

Bestand: `src/lib/sms.test.ts` (uitbreiden; controleer eerst de bestaande testopzet en hulpfuncties). De test mag de bestaande dry-run/allowlist-tests volgen die er al zijn; voeg alleen toe wat nog ontbreekt. Doel: bewijs dat met `SMS_DRY_RUN=0` en `SMS_ALLOWLIST=+31631665814` een sms naar een ander nummer niet verzonden wordt en naar het eigen nummer wel de verzendpoging doet (verzendclient gemockt).

- [ ] **Stap 3: Test draaien.** Run: `npm test -- src/lib/sms.test.ts`. Verwacht: PASS.

- [ ] **Stap 4: Commit.** `git add src/lib/sms.test.ts` en commit `test: borg sms allowlist op test-omgeving`.

- [ ] **Stap 5: Echte verificatie op kluslus-test.** Voer een actie uit die een sms hoort te sturen (bv. een klus bevestigen/uitnodigen) en controleer dat er echt een sms op Reiniers telefoon komt. Claude leest de runtime-logs mee om te zien of CM een 200/ok teruggaf of een fout (bv. ongeldig token). Probeer daarnaast (eenmalig, voorzichtig) of een actie met een ander nummer géén sms verstuurt.

---

## FASE 3: Onschuldige instellingen leesbaar maken (uit "sensitive")

**Doel:** Reinier kan in de Vercel-schermen nalezen hoe de test-omgeving staat ingesteld.

**Achtergrond:** op kluslus-test staan alle env-vars als type "sensitive" (niet leesbaar, ook niet voor Reinier). Geheimen horen sensitive te blijven; instellingen niet.

- [ ] **Stap 1: Lijst de te-converteren vars.** Plain maken: `MAIL_DRY_RUN`, `SMS_DRY_RUN`, `MAIL_ALLOWLIST`, `SMS_ALLOWLIST`, `DEMO_MODE`, `TEST_LOGIN`, `INBOUND_DOMAIN`, `RESEND_FROM`, `RESEND_REPLY_TO`, `SMS_AFZENDER`, `CM_GW_URL`, `RAPPORT_EMAIL`, `APP_URL`. Sensitive houden: alle `*_KEY`, `*_TOKEN`, `*_SECRET`, `SUPABASE_*`, `RESEND_API_KEY`, `CM_PRODUCT_TOKEN`, `CRON_SECRET`.

- [ ] **Stap 2: Per var opnieuw aanmaken als plain.** In Vercel kan een sensitive var niet "omgezet" worden; verwijder hem en maak hem opnieuw aan met dezelfde naam/waarde/target, type **Plain** (laat het vinkje "Sensitive" uit). Doe dit alleen voor de lijst uit stap 1. Voorgekauwd voor Reinier: per var → drie puntjes → Remove → daarna Add New, naam + waarde + target Production+Preview, Sensitive UIT.

- [ ] **Stap 3: Redeploy kluslus-test** en controleer dat de waarden nu zichtbaar zijn in de Vercel-schermen en dat de omgeving nog werkt (open kluslus-test, log in via `/test-login`).

> Geen code, geen commit. Dit is een Vercel-config-fase. Leg de eindstand vast in een logboek-entry (zie slot van dit plan).

---

## FASE 4: Eén automatische "hele keten"-test

**Doel:** één e2e die na elke wijziging de loop end-to-end doorloopt, zodat groene CI betekent dat de keten nog werkt.

**Achtergrond:** bestaande e2e staan in `e2e/` (o.a. `levenscyclus.spec`, `mail-flows.spec`). De keten-test roept `/api/inbound` rechtstreeks aan met een `email.received`-payload (geen wachten op echte mailaflevering) en draait met de kanalen op dry-run + inhoudscontrole, zodat CI geen sms/mail-kosten geeft.

- [ ] **Stap 1: Bestaande e2e-opzet lezen.** Lees `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/test-env.ts` en `e2e/levenscyclus.spec.ts` om de fixtures, de admin-client en de manier waarop een klus wordt aangemaakt over te nemen. Noteer hoe een test inlogt als kantoor en als monteur.

- [ ] **Stap 2: Failing keten-test schrijven.**

Bestand: `e2e/keten.spec.ts` (nieuw).

De test doet, in één doorloop, met `klant_naam` met een eigen prefix `KETEN %` (zodat de bestaande teardown hem opruimt — zie Fase 5 voor de prefix-conventie):
1. POST een `email.received`-payload naar `/api/inbound` met een geldig inbound-token van het test-kantoor en een tekstmail (onderwerp + body). Verwacht: er ontstaat een klus-voorstel.
2. Log in als kantoor, vind de klus, plan hem in en bevestig. Verwacht: status gaat over en er wordt een mail/sms-poging gedaan (controleer via de dry-run-log/teststub, niet via echte verzending).
3. Log in als monteur, open de klus, lever op. Verwacht: oplever-status + rapport-mailpoging.

Schrijf concrete asserts op de statusovergangen en op de inhoud van de mail/sms-poging (juiste ontvanger, juiste tekst-fragmenten). Gebruik de manier van mocken/loggen die `mail-flows.spec.ts` al gebruikt.

- [ ] **Stap 3: Test draaien, verwacht falen.** Run: `npm run test:e2e -- e2e/keten.spec.ts`. Verwacht: FAIL (test bestaat nog niet of de keten haakt ergens af). Los af tot groen; elke afhaking is een echte gevonden gat.

- [ ] **Stap 4: Test groen krijgen.** Pas niet de productiecode aan tenzij de test een echte bug blootlegt; in dat geval: bug fixen (apart commit), test groen.

- [ ] **Stap 5: In CI opnemen.** Zorg dat `e2e/keten.spec.ts` in de standaard e2e-run meedraait (zelfde testDir). Werk `TESTDEKKING.md` bij: de keten is nu automatisch gedekt t/m oplevering.

- [ ] **Stap 6: Commit.** `git add e2e/keten.spec.ts TESTDEKKING.md` (+ eventuele bugfix) en commit `test: hele keten end-to-end (inbound t/m oplevering)`.

---

## FASE 5: Data-isolatie tussen CI en handmatige keuring

**Doel:** CI-runs en Reiniers handmatige keuring delen veilig dezelfde test-DB; een testrun raakt zijn keuringsdata niet.

**Achtergrond uit de code:**
- `e2e/global-teardown.ts` wist alleen klussen met vaste naam-prefixen (`E2E %`, `ZELF %`, `KANTOOR %`, ...). De demo-e2e wist alleen de zaak "Demo Keukenstudio".
- Lekken: (1) de e2e gebruikt Reiniers echte mailadressen als vaste test-accounts (`r.k.zijlstra@gmail.com`, `bkmkeukenmontage@gmail.com`) en ge-upsert hun profiel per run; (2) de wegwerp-opdrachtgever `e2e-opdrachtgever@kluslus.test` wordt verwijderd met cascade-risico; (3) naam-botsing als handmatige data per ongeluk een e2e-prefix krijgt.

- [ ] **Stap 1: Bevestig de huidige accounts/teardown.** Lees `e2e/global-setup.ts`, `e2e/global-teardown.ts`, `scripts/setup-test-users.ts`. Noteer exact welke accounts vast zijn en wat de teardown verwijdert.

- [ ] **Stap 2: Eigen keuring-zaak + keuring-accounts ontwerpen.** Spreek een vaste keuring-opdrachtgever af (bv. naam `Keuring Reinier`) en keuring-accounts in een eigen namespace (bv. `@keuring.kluslus.test`) die de e2e nooit aanraakt. Reinier keurt voortaan ingelogd via die accounts, niet via zijn echte mailadressen.

- [ ] **Stap 3: Failing test dat de teardown de keuring-zaak met rust laat.**

Bestand: `e2e/isolatie.spec.ts` (nieuw) of een teardown-unit-test. Test: maak een klus onder opdrachtgever `Keuring Reinier` met een naam die geen e2e-prefix heeft; draai de teardown-functie; verifieer dat die klus nog bestaat, terwijl een klus met prefix `E2E %` wel weg is.

- [ ] **Stap 4: Test draaien, verwacht falen waar nodig.** Run: `npm run test:e2e -- e2e/isolatie.spec.ts` (of de unit-variant). Verwacht: PASS als de teardown al puur prefix/zaak-gescoped is; FAIL als er ergens een brede wis zit. Bij FAIL: teardown gescoped maken.

- [ ] **Stap 5: E2e-accounts losmaken van Reiniers echte mail.** Pas `scripts/setup-test-users.ts` + `e2e/global-setup.ts` aan zodat de vaste e2e-accounts in een eigen namespace staan (bv. `@e2e.kluslus.test`) in plaats van Reiniers echte adressen, zodat een run zijn echte profiel/keuring-staat niet meer ge-upsert. Werk de bijbehorende UID-verwijzingen in `.env.test` bij.

- [ ] **Stap 6: Tests draaien.** Run: `npm run test:e2e`. Verwacht: groen, met de e2e nu op eigen accounts.

- [ ] **Stap 7: Documenteren.** Werk `docs/OMGEVINGEN.md` bij: de test-DB wordt gedeeld door CI en handmatige keuring, maar de keuring-zaak/-accounts en de e2e-namespace zijn gescheiden; verwijder de oude waarschuwing "geen CI draaien terwijl Reinier keurt" zodra dit klopt. Werk de project-`CLAUDE.md`-todo (laag 2) bij.

- [ ] **Stap 8: Commit.** `git add` de gewijzigde test-bestanden + docs en commit `test: isoleer e2e-data van handmatige keuring op de test-DB`.

---

## FASE 6: App-versie automatisch ophogen

**Doel:** de "nieuwe versie"-balk werkt op alle omgevingen automatisch; niemand hoeft `sw.js` nog met de hand te bumpen.

**Achtergrond uit de code:**
- `public/sw.js` heeft `const VERSION = "ksv-v15";`, handmatig opgehoogd per deploy.
- `src/components/SwRegistrar.tsx` detecteert een nieuwe SW en toont de "Verversen"-balk. Die kant blijft ongewijzigd.
- `public/` wordt statisch geserveerd, dus de versie moet vóór de build in `sw.js` gezet worden. Vercel zet `VERCEL_GIT_COMMIT_SHA` bij de build.

- [ ] **Stap 1: Placeholder in sw.js zetten.** Vervang in `public/sw.js` de hardcoded versie door een vaste placeholder, bv. `const VERSION = "ksv-__BUILD_ID__";`. Laat de rest (caches, activate-opruiming, skipWaiting) ongemoeid.

- [ ] **Stap 2: Failing test voor het genereer-script.**

Bestand: `scripts/genereer-sw-versie.test.mjs` (nieuw) of een vitest-test. Test de pure functie die uit een build-id een versie-string maakt en de placeholder in een sw-bron vervangt:

```js
import { vervangVersie } from "./genereer-sw-versie.mjs";
// gegeven bron met placeholder en een build-id -> placeholder vervangen door ksv-<korte-id>
const bron = 'const VERSION = "ksv-__BUILD_ID__";';
const uit = vervangVersie(bron, "abcdef1234567890");
// verwacht een stabiele, korte id (bv. eerste 8 tekens)
// expect(uit).toBe('const VERSION = "ksv-abcdef12";');
```

- [ ] **Stap 3: Test draaien, verwacht falen.** Run: `npm test -- scripts/genereer-sw-versie.test.mjs`. Verwacht: FAIL (module bestaat nog niet).

- [ ] **Stap 4: Script schrijven.**

Bestand: `scripts/genereer-sw-versie.mjs` (nieuw). Exporteer `vervangVersie(bron, buildId)` (pure functie, vervangt `__BUILD_ID__` door de eerste 8 tekens van `buildId`, of `"dev"` als leeg) en een main die `public/sw.js` inleest, `process.env.VERCEL_GIT_COMMIT_SHA` (terugval: een tijdstempel via een meegegeven arg, want `Date.now()` mag niet in alle contexten) gebruikt, en het bestand terugschrijft. Houd de functie los testbaar.

- [ ] **Stap 5: Test draaien.** Run: `npm test -- scripts/genereer-sw-versie.test.mjs`. Verwacht: PASS.

- [ ] **Stap 6: In de build haken.** Voeg in `package.json` een `prebuild`-script toe dat `node scripts/genereer-sw-versie.mjs` draait, zodat elke Vercel-build de versie zet vóór `next build`. Controleer dat lokaal `npm run build` nog werkt en `public/sw.js` een ingevulde versie krijgt (en draai het niet-ingevulde bestand niet per ongeluk de git-historie in: commit de placeholder-versie, niet een gegenereerde).

- [ ] **Stap 7: Commit.** `git add public/sw.js scripts/genereer-sw-versie.mjs scripts/genereer-sw-versie.test.mjs package.json` en commit `feat: app-versie automatisch uit build-id`.

---

## Afronding

- [ ] **Opleverlat langs (project-`CLAUDE.md`):** hele keten live nagelopen op kluslus-test, beide rollen, niet alleen happy path.
- [ ] **Logboek-entry** in `01_projecten/keukenstudio-voorschoten-demo/07_logboek/2026-06-..._test-omgeving-compleet.md`: wat is ingericht (test-inbound-domein, sms-op-test, sensitive-opschoning, keten-test, data-isolatie, sw-bump) en de eindstand van de Vercel-instellingen.
- [ ] **Memory bijwerken** waar relevant (o.a. `project_ksv-test-db-schema-drift`, een nieuwe memory voor de test-inbound, en de PWA-bump in `project_ksv_pdf-viewer`).
- [ ] **STOP-poort:** Reinier keurt op kluslus-test; pas na zijn akkoord mergen naar master.

## Self-review (uitgevoerd bij schrijven)

- **Spec-dekking:** spec-punten 1–6 → fasen 1–6. Compleet.
- **Afhankelijkheden:** DNS/Resend (1a) eerst wegens propagatie; keten-test (4) na inbound (1) + sms (2); 5 en 6 onafhankelijk.
- **Aandachtspunt voor de uitvoerder:** de exacte e2e-fixtures, db-helpers en bestaande sms/inbound-tests moeten ter plekke gelezen worden (stappen 4.1, 5.1, 2.2) voordat de testcode definitief wordt; de getoonde testcode is de intentie, pas namen aan op de echte helpers.
