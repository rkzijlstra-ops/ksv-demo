# Handleiding voor monteurs - Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een `/handleiding`-pagina in de KSV-app die de kerntaak van de monteur stap voor stap toont met automatisch gegenereerde screenshots, makkelijk actueel te houden bij appwijzigingen.

**Architecture:** Drie losgekoppelde delen. (1) Een databron met de stappen (titel, uitleg, screenshot-bestandsnaam, route). (2) Een server-component-pagina die die databron uitleest en per stap de screenshot met tekst toont, met een placeholder als een plaatje nog ontbreekt. (3) Een Playwright-generator (eigen config) die als monteur tegen de test-database inlogt, een vaste demo-opdracht seedt, door de schermen navigeert, screenshots naar `public/handleiding/` schrijft en de demo-opdracht weer opruimt. De databron is de enige bron van waarheid voor zowel de weergave als de generator.

**Tech Stack:** Next.js 16 (server components), TypeScript, Tailwind, Playwright 1.60, Supabase (test-zijspoor via `.env.test`), Vitest.

---

## Belangrijke projectregels (lees eerst)

- **AGENTS.md:** dit is Next.js 16 met breaking changes. Lees bij twijfel over een API eerst de relevante gids in `node_modules/next/dist/docs/` voordat je code schrijft.
- **E2e en Playwright draait Rein zelf in PowerShell.** Claude's shell laat zombie next-dev-servers achter. Stappen die Playwright draaien (de e2e-test en de screenshot-generator) zijn voorgekauwde commando's die Rein uitvoert; Claude draait ze niet zelf.
- **Git-huishouden:** specifieke `git add` per bestand, geen losse untracked bestanden laten slingeren.
- **Commit-conventie:** elke commit eindigt met `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Bestandsoverzicht

- **Create:** `src/lib/handleiding-stappen.ts` - databron (type + array).
- **Create:** `src/lib/handleiding-stappen.test.ts` - unit-test op de databron.
- **Create:** `src/app/handleiding/page.tsx` - de weergave-pagina.
- **Modify:** `src/components/UserMenu.tsx` - menu-link "Handleiding" toevoegen.
- **Create:** `e2e/handleiding.spec.ts` - e2e: monteur opent de handleiding, ziet alle stappen.
- **Create:** `playwright.handleiding.config.ts` - aparte Playwright-config voor de generator.
- **Create:** `e2e-handleiding/genereer-screenshots.spec.ts` - de screenshot-generator.
- **Create:** `public/handleiding/.gitkeep` - zodat de map bestaat voordat er plaatjes zijn.
- **Modify:** `package.json` - npm-script `screenshots:handleiding`.
- **Create:** `HANDLEIDING-ONDERHOUD.md` - korte onderhoudsuitleg met het voorgekauwde commando.
- **Create:** `07_logboek/2026-06-12_handleiding-monteur.md` - logboekverslag.

---

### Task 1: Databron met de handleiding-stappen

**Files:**
- Create: `src/lib/handleiding-stappen.ts`
- Test: `src/lib/handleiding-stappen.test.ts`

- [ ] **Step 1: Schrijf de falende test**

`src/lib/handleiding-stappen.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HANDLEIDING_STAPPEN } from "./handleiding-stappen";

describe("HANDLEIDING_STAPPEN", () => {
  it("heeft minstens de zes kern-stappen", () => {
    expect(HANDLEIDING_STAPPEN.length).toBeGreaterThanOrEqual(6);
  });

  it("elke stap heeft een titel, uitleg, route en bestand", () => {
    for (const stap of HANDLEIDING_STAPPEN) {
      expect(stap.titel.trim().length).toBeGreaterThan(0);
      expect(stap.uitleg.trim().length).toBeGreaterThan(0);
      expect(stap.route.startsWith("/")).toBe(true);
      expect(stap.bestand).toMatch(/^\d{2}-[a-z0-9-]+\.png$/);
    }
  });

  it("bestandsnamen zijn uniek", () => {
    const namen = HANDLEIDING_STAPPEN.map((s) => s.bestand);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it("routes met een opdracht gebruiken de :id-placeholder", () => {
    const metId = HANDLEIDING_STAPPEN.filter((s) => s.route.includes("/opdracht/"));
    for (const stap of metId) expect(stap.route).toContain(":id");
  });
});
```

- [ ] **Step 2: Draai de test, controleer dat hij faalt**

Run: `npx vitest run src/lib/handleiding-stappen.test.ts`
Expected: FAIL met "Cannot find module './handleiding-stappen'".

- [ ] **Step 3: Schrijf de databron**

`src/lib/handleiding-stappen.ts`:

```ts
/**
 * Databron voor de monteur-handleiding. Eén bron van waarheid voor zowel de weergave-pagina
 * (/handleiding) als de screenshot-generator (e2e-handleiding/genereer-screenshots.spec.ts).
 * Puur data, geen opmaak, zodat dezelfde lijst later ook een losse mini-site kan voeden.
 *
 * - bestand: bestandsnaam in public/handleiding/, ook de stabiele sleutel. Formaat: "NN-naam.png".
 * - route: waar de generator naartoe navigeert. ":id" wordt vervangen door de demo-opdracht-id.
 * - interactie: optionele extra handeling vóór de screenshot (modal openen of naar onder scrollen).
 */
export type Interactie = "handtekening-modal" | "scroll-onder";

export type HandleidingStap = {
  bestand: string;
  titel: string;
  uitleg: string;
  route: string;
  interactie?: Interactie;
};

export const HANDLEIDING_STAPPEN: HandleidingStap[] = [
  {
    bestand: "01-werkpool.png",
    titel: "Je werkpool",
    uitleg:
      "Na het inloggen kom je in je werkpool. Hier staan de klussen die aan jou zijn toegewezen. " +
      "Bovenaan de actieve klussen, daaronder je geschiedenis. Tik een klus aan om hem te openen.",
    route: "/",
  },
  {
    bestand: "02-opdracht-openen.png",
    titel: "Een klus openen",
    uitleg:
      "In de klus zie je de klantgegevens en het adres. Met de knoppen bovenin bel je de klant, " +
      "stuur je een WhatsApp of start je de navigatie. Onderaan komen de meldingen van deze klus.",
    route: "/opdracht/:id",
  },
  {
    bestand: "03-melding-toevoegen.png",
    titel: "Een melding toevoegen",
    uitleg:
      "Loop je tegen een schade of manco aan? Voeg een melding toe. Maak een foto, spreek de melding " +
      "in met je stem of typ hem. Zet de urgentie op rood of geel zodat het kantoor de ernst ziet.",
    route: "/opdracht/:id/melding",
  },
  {
    bestand: "04-opleveren.png",
    titel: "Opleveren starten",
    uitleg:
      "Klaar met de klus? Start het opleveren. Leg de eindstaat vast met foto's (en eventueel video), " +
      "vul de controle-checklist in en zet je opmerking erbij. De interne notitie komt nooit bij de klant.",
    route: "/opdracht/:id/opleveren",
  },
  {
    bestand: "05-handtekening.png",
    titel: "Handtekening van de klant",
    uitleg:
      "Laat de klant tekenen op het scherm. De handtekening komt op het opleverrapport. " +
      "Geen klant bij de hand? Je kunt deze stap overslaan.",
    route: "/opdracht/:id/opleveren",
    interactie: "handtekening-modal",
  },
  {
    bestand: "06-versturen.png",
    titel: "Versturen naar klant en zaak",
    uitleg:
      "Onderaan verstuur je het rapport. De zaak-versie gaat naar het kantoor, de klant-versie " +
      "(zonder interne notitie) naar de klant als je het mailadres invult. De klus gaat op 'opgeleverd' " +
      "zodra de zaak-versie verstuurd is.",
    route: "/opdracht/:id/opleveren",
    interactie: "scroll-onder",
  },
];
```

- [ ] **Step 4: Draai de test, controleer dat hij slaagt**

Run: `npx vitest run src/lib/handleiding-stappen.test.ts`
Expected: PASS, 4 tests groen.

- [ ] **Step 5: Commit**

```bash
git add src/lib/handleiding-stappen.ts src/lib/handleiding-stappen.test.ts
git commit -m "Handleiding: databron met kern-stappen + unit-test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Weergave-pagina + menu-link

De pagina werkt meteen, ook zonder screenshots: ontbreekt een plaatje, dan toont hij een nette placeholder. Zo kan dit vóór de generator (Task 3) opgeleverd worden.

**Files:**
- Create: `src/app/handleiding/page.tsx`
- Modify: `src/components/UserMenu.tsx`
- Test: `e2e/handleiding.spec.ts`

- [ ] **Step 1: Schrijf de falende e2e-test**

`e2e/handleiding.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";

/**
 * De monteur kan de handleiding bereiken via het menu en ziet alle stappen op volgorde.
 * Draait onder de monteur-sessie. Geen seed nodig: de pagina is statische uitleg.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("monteur opent de handleiding via het menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
  await page.getByRole("button", { name: /menu voor/i }).click();
  await page.getByRole("menuitem", { name: /handleiding/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/handleiding");
  await expect(page.getByRole("heading", { name: "Handleiding", level: 1 })).toBeVisible();
});

test("de handleiding toont alle stappen", async ({ page }) => {
  await page.goto("/handleiding");
  for (const stap of HANDLEIDING_STAPPEN) {
    await expect(page.getByRole("heading", { name: stap.titel, level: 2 })).toBeVisible();
  }
});
```

- [ ] **Step 2: Draai de test, controleer dat hij faalt** *(Rein draait dit in PowerShell)*

Run: `npx playwright test e2e/handleiding.spec.ts`
Expected: FAIL. De menu-link en de pagina bestaan nog niet (geen "Handleiding"-menuitem, `/handleiding` geeft 404/redirect).

- [ ] **Step 3: Voeg de menu-link toe in `UserMenu.tsx`**

In `src/components/UserMenu.tsx`, breid de lucide-import uit met `BookOpen`:

```ts
import { LogOut, User, Info, Trash2, Users, IdCard, BookOpen } from "lucide-react";
```

Voeg direct ná de "Over de app"-`Link` (na de regel met `</Link>` van `/over`, vóór de `/mijn-gegevens`-link) deze link toe:

```tsx
          <Link
            href="/handleiding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <BookOpen size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Handleiding
          </Link>
```

- [ ] **Step 4: Schrijf de weergave-pagina**

`src/app/handleiding/page.tsx`:

```tsx
import { existsSync } from "node:fs";
import path from "node:path";
import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { vereisRol } from "@/lib/toegang";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";

export const dynamic = "force-dynamic";

export default async function HandleidingPage() {
  // Alle ingelogde rollen mogen de uitleg zien; geen gevoelige data. Zo geen redirect-gedoe
  // als een opdrachtgever per ongeluk op de menu-link tikt.
  const { email, profiel } = await vereisRol(["monteur", "beheerder", "opdrachtgever"]);
  const isMonteur = profiel.rol === "monteur";
  const terugHref = isMonteur ? "/" : "/dashboard";
  const terugLabel = isMonteur ? "Werkpool" : "Dashboard";

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <TerugKnop href={terugHref} label={terugLabel} />
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Hulp / Handleiding</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Handleiding</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Zo loop je een klus door, van werkpool tot versturen.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <ol className="space-y-4">
        {HANDLEIDING_STAPPEN.map((stap, i) => {
          const bestaat = existsSync(path.join(process.cwd(), "public", "handleiding", stap.bestand));
          return (
            <li key={stap.bestand} className="border-2 border-line bg-white">
              <div className="border-b-2 border-line px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">Stap {i + 1}</p>
                <h2 className="mt-1 font-mono text-xl font-extrabold tracking-tight text-ink">{stap.titel}</h2>
                <p className="mt-2 text-sm text-ink">{stap.uitleg}</p>
              </div>
              {bestaat ? (
                // Bewust een gewone <img>: de bestanden staan in /public en worden los gegenereerd,
                // geen next/image-optimalisatie nodig.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/handleiding/${stap.bestand}`}
                  alt={`Schermafbeelding: ${stap.titel}`}
                  className="mx-auto block w-full max-w-sm"
                />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center bg-surface p-5 text-center text-sm text-ink-muted">
                  Schermafbeelding nog niet gegenereerd ({stap.bestand}).
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
```

- [ ] **Step 5: Draai de e2e-test, controleer dat hij slaagt** *(Rein draait dit in PowerShell)*

Run: `npx playwright test e2e/handleiding.spec.ts`
Expected: PASS, beide tests groen. De stappen tonen placeholders (nog geen plaatjes), de titels zijn zichtbaar.

- [ ] **Step 6: Commit**

```bash
git add src/app/handleiding/page.tsx src/components/UserMenu.tsx e2e/handleiding.spec.ts
git commit -m "Handleiding: weergave-pagina + menu-link + e2e

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Screenshot-generator

Een aparte Playwright-config met eigen testmap, zodat de generator nooit meedraait met de gewone e2e. De generator logt in als monteur (eigen global-setup), seedt een vaste demo-opdracht tegen de test-database, navigeert per stap, schiet screenshots naar `public/handleiding/` en ruimt de demo-opdracht weer op.

**Files:**
- Create: `public/handleiding/.gitkeep`
- Create: `playwright.handleiding.config.ts`
- Create: `e2e-handleiding/genereer-screenshots.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Maak de output-map met een .gitkeep**

`public/handleiding/.gitkeep`: leeg bestand (zorgt dat de map in git bestaat vóór er plaatjes zijn).

- [ ] **Step 2: Schrijf de generator-config**

`playwright.handleiding.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Zelfde .env.test-preamble als playwright.config.ts: als het test-zijspoor bestaat, draaien we
// daar tegen (nooit productie-data op de screenshots). Next.js respecteert al gezette process.env.
const envTestPath = path.join(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const pwPort = process.env.PW_PORT ?? "3001";

/**
 * Aparte config voor het genereren van handleiding-screenshots. Draait NIET mee met de gewone
 * e2e (eigen testDir). Eigen global-setup zodat de monteur-sessie altijd vers is. Mobiel
 * viewport (Pixel 7), want de monteur gebruikt de app op zijn telefoon.
 * Draaien: npm run screenshots:handleiding
 */
export default defineConfig({
  testDir: "./e2e-handleiding",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${pwPort}`,
    storageState: "e2e/.auth/monteur.json",
    serviceWorkers: "block",
    ...devices["Pixel 7"],
  },
  webServer: {
    command: `npm run dev -- -p ${pwPort}`,
    url: `http://localhost:${pwPort}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, SMS_DRY_RUN: "1" },
  },
});
```

- [ ] **Step 3: Schrijf de generator**

`e2e-handleiding/genereer-screenshots.spec.ts`:

```ts
import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb } from "@/lib/db";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "../e2e/test-env";

/**
 * Genereert de handleiding-screenshots. Geen gewone test: het is gereedschap. Seedt één vaste
 * demo-opdracht (nepgegevens) toegewezen aan de testmonteur, loopt de stappen uit de databron af
 * en schrijft per stap een screenshot naar public/handleiding/. Ruimt de demo-opdracht altijd op.
 * Faalt luid (exit niet-nul) als een stap misgaat, met de bestandsnaam erbij, zodat plaatjes niet
 * stil verouderen.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const UIT = path.join(process.cwd(), "public", "handleiding");

test("genereer handleiding-screenshots", async ({ page }) => {
  test.slow();
  mkdirSync(UIT, { recursive: true });

  // Een eventuele restant-demo van een afgebroken run eerst opruimen (idempotent).
  await admin.from("meldingen").delete().eq("referentienummer", "DEMO-001");

  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_montage",
    klant_naam: "Fam. Jansen",
    klant_adres: "Voorbeeldstraat 1, Voorschoten",
    referentienummer: "DEMO-001",
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });

  const fouten: string[] = [];
  try {
    for (const stap of HANDLEIDING_STAPPEN) {
      try {
        await page.goto(stap.route.replace(":id", id));
        await page.waitForLoadState("networkidle");
        if (stap.interactie === "handtekening-modal") {
          await page.getByRole("button", { name: /handtekening/i }).first().click();
          await page.waitForTimeout(400);
        } else if (stap.interactie === "scroll-onder") {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(400);
        }
        await page.screenshot({ path: path.join(UIT, stap.bestand) });
      } catch (e) {
        fouten.push(`${stap.bestand} (route ${stap.route}): ${(e as Error).message}`);
      }
    }
  } finally {
    await admin.from("meldingen").delete().eq("id", id);
  }

  if (fouten.length) {
    throw new Error(`Screenshots mislukt voor ${fouten.length} stap(pen):\n${fouten.join("\n")}`);
  }
});
```

- [ ] **Step 4: Voeg het npm-script toe**

In `package.json`, voeg onder `scripts` toe (na `"test:e2e"`):

```json
    "screenshots:handleiding": "playwright test --config playwright.handleiding.config.ts",
```

- [ ] **Step 5: Genereer de screenshots** *(Rein draait dit in PowerShell)*

Run: `npm run screenshots:handleiding`
Expected: de test "genereer handleiding-screenshots" slaagt en in `public/handleiding/` staan zes PNG's (`01-werkpool.png` t/m `06-versturen.png`). De demo-opdracht "Fam. Jansen / DEMO-001" is daarna weg uit de test-database.

> Als een stap faalt op de selector `naam: /handtekening/i` (stap 05): open de oplever-pagina in de browser, zoek de exacte knoptekst voor de handtekening en pas de naam-regex in de generator aan. Faalt een stap op een leeg scherm, controleer of de demo-opdracht zichtbaar is voor de monteur (toegewezen_aan moet de monteur-UID zijn).

- [ ] **Step 6: Controleer de pagina met echte plaatjes** *(Rein draait dit in PowerShell)*

Run: `npx playwright test e2e/handleiding.spec.ts`
Expected: nog steeds groen; de pagina toont nu de echte screenshots in plaats van placeholders.

- [ ] **Step 7: Commit (code + gegenereerde plaatjes)**

De PNG's gaan mee in git, zodat de gedeploye app ze toont.

```bash
git add public/handleiding/.gitkeep public/handleiding/*.png playwright.handleiding.config.ts e2e-handleiding/genereer-screenshots.spec.ts package.json
git commit -m "Handleiding: screenshot-generator + eerste set screenshots

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Onderhoudsuitleg + logboek

**Files:**
- Create: `HANDLEIDING-ONDERHOUD.md`
- Create: `07_logboek/2026-06-12_handleiding-monteur.md`

- [ ] **Step 1: Schrijf de onderhoudsuitleg**

`HANDLEIDING-ONDERHOUD.md`:

```markdown
# Handleiding voor monteurs - onderhoud

De handleiding zit in de app op `/handleiding` (menu-knop "Handleiding"). Drie losse delen:

1. **De teksten** staan in `src/lib/handleiding-stappen.ts`. Een zin aanpassen of een stap
   toevoegen doe je daar. Een nieuwe stap = een nieuw object met `bestand`, `titel`, `uitleg`,
   `route` (en eventueel `interactie`).
2. **De screenshots** staan in `public/handleiding/`. Die maak je niet met de hand, maar met
   de generator.
3. **De pagina** (`src/app/handleiding/page.tsx`) toont alles automatisch.

## Screenshots opnieuw maken (na een appwijziging)

Draai in PowerShell, in de projectmap:

    npm run screenshots:handleiding

Dit logt in als de testmonteur, maakt een nette demo-opdracht (Fam. Jansen, nepgegevens) in de
test-database, schiet de screenshots en ruimt de demo-opdracht weer op. Daarna in git vastleggen:

    git add public/handleiding/*.png; git commit -m "Handleiding-screenshots ververst"

## Let op

- Er staat nooit een echte klant op de screenshots: ze draaien tegen de test-database
  (`.env.test`), niet tegen productie.
- Ontbreekt een screenshot, dan toont de pagina een nette placeholder met de bestandsnaam,
  zodat een vergeten regeneratie zichtbaar is zonder dat de pagina breekt.
- Een latere losse mini-site (voor opdrachtgevers/demo, zonder inlog) kan dezelfde databron en
  dezelfde plaatjes hergebruiken.
```

- [ ] **Step 2: Schrijf het logboekverslag**

`07_logboek/2026-06-12_handleiding-monteur.md`: kort verslag van wat gebouwd is (in-app handleiding met auto-screenshots), waarom (makkelijk actueel houden), de drie delen, en de keuze voor optie 2 met optie 3 open. Verwijs naar `DESIGN-HANDLEIDING-MONTEUR.md` en `PLAN-HANDLEIDING-MONTEUR.md`.

- [ ] **Step 3: Commit**

```bash
git add HANDLEIDING-ONDERHOUD.md 07_logboek/2026-06-12_handleiding-monteur.md
git commit -m "Handleiding: onderhoudsuitleg + logboek

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Zelf-review (uitgevoerd bij schrijven plan)

- **Spec-dekking:** vorm (in-app pagina) → Task 2; auto-screenshots → Task 3; databron losgekoppeld → Task 1; demo-data tegen test-DB, nooit echte klant → Task 3 (seed + `.env.test`); placeholder bij ontbrekend plaatje → Task 2; fail-loud generator → Task 3; testen (unit + e2e) → Task 1 + Task 2; onderhoud voorgekauwd → Task 4; optie 3 blijft open → databron puur data (Task 1) + noot in Task 4.
- **Open punten uit de spec, nu beslist:** generator staat in eigen map `e2e-handleiding/` met eigen config (niet in `scripts/`, want zo krijgt hij webServer + global-setup + mobiel device gratis); menu-link in `UserMenu.tsx` ná "Over de app"; databron is een getypte TS-array; de demo-seed hergebruikt `createDb`/`global-setup` in plaats van een los seed-script.
- **Placeholders:** geen TBD/TODO in code-stappen; alle code voluit.
- **Type-consistentie:** `HandleidingStap` (bestand/titel/uitleg/route/interactie) gelijk gebruikt in databron, pagina, e2e en generator; `Interactie`-waarden ("handtekening-modal", "scroll-onder") komen overeen tussen databron en generator.
```
