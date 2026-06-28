# Handleiding-herontwerp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De monteur-handleiding (`/handleiding`) omzetten naar inklapbare onderwerpen in vier groepen, met een "Alles openklappen"-knop, bijgewerkte teksten/screenshots, en een databron die meegroeit met nieuwe functies.

**Architecture:** De databron `handleiding-stappen.ts` gaat van een platte lijst naar `HANDLEIDING_GROEPEN` (groepen met onderwerpen) plus een afgeleide platte lijst `HANDLEIDING_ONDERWERPEN` voor de screenshot-generator en tests. De server-pagina `page.tsx` doet auth + bestaat-check per screenshot en geeft de data door aan een nieuwe client-component `HandleidingWeergave.tsx` die het inklappen verzorgt. De generator itereert over `HANDLEIDING_ONDERWERPEN` en snijdt de screenshots bij.

**Tech Stack:** Next.js 16 (App Router), React (client component), Tailwind v4 (design-system-tokens), Vitest (unit), Playwright (e2e + screenshot-generator).

---

## Achtergrond en regels (lees eerst)

- Werk gebeurt in de worktree `C:\Users\rkzij\ksv-worktrees\handleiding-herontwerp` op branch `handleiding-herontwerp` (al aangemaakt, afgetakt van `master`).
- Spec: `DESIGN-HANDLEIDING-HERONTWERP.md` in de worktree-root.
- Voor je iets "klaar" noemt: opleverlat in `CLAUDE.md` / `docs/OMGEVINGEN.md`. Verifieer de echte reis op telefoonformaat, beide standen.
- **Niet zelf mergen naar master.** Eindpunt van dit plan: groene CI + branch op `omgeving-test` gezet + stoppen voor Reins keuring.
- Kleuren/letters: alleen bestaande Tailwind-klassen (`bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-ink`, `bg-accent`, `bg-primary`, `font-mono`). Niet zelf hex hardcoden.
- Unit-tests: `npm test`. Typecheck: `npx tsc --noEmit` (of `npm run typecheck` als die er is). e2e handleiding: `npm run test:e2e -- e2e/handleiding.spec.ts`. Screenshots: `npm run screenshots:handleiding`.

## File Structure

- **Modify** `src/lib/handleiding-stappen.ts` — van platte lijst naar `HANDLEIDING_GROEPEN` + afgeleide `HANDLEIDING_ONDERWERPEN`; types uitgebreid (`id`, `nieuw`, nieuwe `Interactie`-waarden).
- **Modify** `src/lib/handleiding-stappen.test.ts` — test de nieuwe structuur.
- **Create** `src/components/HandleidingWeergave.tsx` — client-component: groepen, inklapbare onderwerpen, "Alles openklappen"-knop, telefoon-frame, placeholder.
- **Modify** `src/app/handleiding/page.tsx` — server: auth + bestaat-check per onderwerp, rendert header + `HandleidingWeergave` + voorbeeldrapport-knop.
- **Modify** `e2e-handleiding/genereer-screenshots.spec.ts` — itereer over `HANDLEIDING_ONDERWERPEN`, snijd bij, nieuwe interacties.
- **Modify** `e2e/handleiding.spec.ts` — itereer over `HANDLEIDING_ONDERWERPEN`, test toggle + los openen.
- **Modify** `src/components/KluspoolOnboarding.tsx` — copy "6 stappen" neutraal maken.
- **Modify** `HANDLEIDING-ONDERHOUD.md`, `TESTDEKKING.md`, `TOESTANDEN.md` — bijwerken.
- **Delete** oude `public/handleiding/0{1..6}-*.png` na hernieuwde generatie (worden vervangen).

---

## Task 1: Databron omzetten naar groepen

**Files:**
- Modify: `src/lib/handleiding-stappen.ts`
- Test: `src/lib/handleiding-stappen.test.ts`

- [ ] **Step 1: Vervang de unit-test door de nieuwe structuur**

Vervang de volledige inhoud van `src/lib/handleiding-stappen.test.ts` door:

```ts
import { describe, it, expect } from "vitest";
import { HANDLEIDING_GROEPEN, HANDLEIDING_ONDERWERPEN } from "./handleiding-stappen";

describe("HANDLEIDING_GROEPEN", () => {
  it("heeft vier groepen, elk met minstens één onderwerp", () => {
    expect(HANDLEIDING_GROEPEN.length).toBe(4);
    for (const groep of HANDLEIDING_GROEPEN) {
      expect(groep.titel.trim().length).toBeGreaterThan(0);
      expect(groep.onderwerpen.length).toBeGreaterThan(0);
    }
  });

  it("HANDLEIDING_ONDERWERPEN is de platte lijst van alle onderwerpen", () => {
    const totaal = HANDLEIDING_GROEPEN.reduce((n, g) => n + g.onderwerpen.length, 0);
    expect(HANDLEIDING_ONDERWERPEN.length).toBe(totaal);
    expect(HANDLEIDING_ONDERWERPEN.length).toBeGreaterThanOrEqual(12);
  });

  it("elk onderwerp heeft id, titel, punten, route en bestand", () => {
    for (const o of HANDLEIDING_ONDERWERPEN) {
      expect(o.id.trim().length).toBeGreaterThan(0);
      expect(o.titel.trim().length).toBeGreaterThan(0);
      expect(o.punten.length).toBeGreaterThan(0);
      for (const punt of o.punten) expect(punt.trim().length).toBeGreaterThan(0);
      expect(o.route.startsWith("/")).toBe(true);
      expect(o.bestand).toMatch(/^\d{2}-[a-z0-9-]+\.png$/);
    }
  });

  it("id's en bestandsnamen zijn uniek", () => {
    const ids = HANDLEIDING_ONDERWERPEN.map((o) => o.id);
    const namen = HANDLEIDING_ONDERWERPEN.map((o) => o.bestand);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it("routes met een opdracht gebruiken de :id-placeholder", () => {
    for (const o of HANDLEIDING_ONDERWERPEN.filter((o) => o.route.includes("/opdracht/"))) {
      expect(o.route).toContain(":id");
    }
  });
});
```

- [ ] **Step 2: Draai de test, verwacht rood**

Run: `npm test -- handleiding-stappen`
Expected: FAIL (`HANDLEIDING_GROEPEN`/`HANDLEIDING_ONDERWERPEN` bestaan nog niet).

- [ ] **Step 3: Vervang de databron**

Vervang de volledige inhoud van `src/lib/handleiding-stappen.ts` door:

```ts
/**
 * Databron voor de monteur-handleiding. Eén bron van waarheid voor de weergave-pagina
 * (/handleiding) én de screenshot-generator (e2e-handleiding/genereer-screenshots.spec.ts).
 * Puur data, geen opmaak. Onderwerpen zijn gegroepeerd; een nieuw onderwerp toevoegen is
 * één regel hier + `npm run screenshots:handleiding`. De pagina hoeft niet verbouwd te worden.
 *
 * - id: stabiele sleutel + anker-id in de pagina.
 * - bestand: bestandsnaam in public/handleiding/, formaat "NN-naam.png".
 * - intro: optionele korte introzin boven de steekwoorden.
 * - punten: korte steekwoorden, snel te scannen.
 * - route: waar de generator naartoe navigeert. ":id" wordt vervangen door de demo-klus-id.
 * - interactie: optionele handeling vóór de screenshot.
 * - nieuw: toont een "nieuw"-label; gebruik tot er een echt scherm/plaatje voor is.
 */
export type Interactie =
  | "handtekening-modal"
  | "scroll-onder"
  | "interne-notitie"
  | "spoed-aan"
  | "documenten-blok";

export type HandleidingOnderwerp = {
  id: string;
  titel: string;
  intro?: string;
  punten: string[];
  bestand: string;
  route: string;
  interactie?: Interactie;
  nieuw?: boolean;
};

export type HandleidingGroep = {
  titel: string;
  onderwerpen: HandleidingOnderwerp[];
};

export const HANDLEIDING_GROEPEN: HandleidingGroep[] = [
  {
    titel: "Aan de slag",
    onderwerpen: [
      {
        id: "kluspool",
        titel: "Je kluspool",
        bestand: "01-kluspool.png",
        intro: "Je klussen: actief bovenaan, geschiedenis eronder.",
        punten: [
          "Een klus komt van de opdrachtgever, of je voegt er zelf een toe.",
          "Tik een klus aan om te openen.",
        ],
        route: "/",
      },
      {
        id: "klus-toevoegen",
        titel: "Klus toevoegen",
        bestand: "02-klus-toevoegen.png",
        intro: "Zelf een klus aanmaken kan op meerdere manieren.",
        punten: [
          "Voeg een PDF toe, dan vult de app de gegevens vanzelf in.",
          "Een foto of tekening kan ook.",
          "Mailen kan ook: stuur de klus naar het klus-mailadres.",
          "Of maak een klus zonder document aan.",
        ],
        route: "/",
        nieuw: true,
      },
      {
        id: "klus-openen",
        titel: "Een klus openen",
        bestand: "03-klus-openen.png",
        intro: "Klantgegevens en adres in beeld.",
        punten: [
          "Knoppen bovenin: bellen, WhatsApp, navigeren.",
          "Wat niet bekend is, zie je niet: geen nummer betekent geen belknop.",
        ],
        route: "/opdracht/:id",
      },
    ],
  },
  {
    titel: "Tijdens de klus",
    onderwerpen: [
      {
        id: "melding-maken",
        titel: "Een melding maken",
        bestand: "04-melding-maken.png",
        intro: "Schade of manco vastleggen: foto, video, ingesproken of getypt.",
        punten: [
          "Gewone melding: komt in het opleverrapport.",
          "Een video opnemen of toevoegen kan ook bij de melding.",
        ],
        route: "/opdracht/:id/melding",
      },
      {
        id: "spoedmelding",
        titel: "Spoedmelding",
        bestand: "05-spoedmelding.png",
        intro: "Voor wat echt niet kan wachten.",
        punten: [
          "Gaat meteen los naar kantoor, buiten de oplevering om.",
          "Komt later ook in het rapport.",
          "Spoed alleen als het echt niet kan wachten.",
        ],
        route: "/opdracht/:id/melding",
        interactie: "spoed-aan",
      },
      {
        id: "documenten-pdf",
        titel: "Documenten / PDF bekijken",
        bestand: "06-documenten-pdf.png",
        intro: "Werkbon of tekening direct in de app openen.",
        punten: [
          "Knijp-zoom en scroll door de PDF.",
          "Documenten staan bij de klus in het documenten-blok.",
        ],
        route: "/opdracht/:id",
        interactie: "documenten-blok",
        nieuw: true,
      },
    ],
  },
  {
    titel: "Afronden",
    onderwerpen: [
      {
        id: "snel-afsluiten",
        titel: "Snel afsluiten",
        bestand: "07-snel-afsluiten.png",
        intro: "Voor een serviceklus. Een verkort rapport, zonder handtekening of voorvertoning.",
        punten: [
          "Komt er nog een vervolg (onderdelen later)? Zet dat vinkje aan.",
        ],
        route: "/opdracht/:id/afronden/snel",
      },
      {
        id: "afsluiten-rapport",
        titel: "Afsluiten + rapport",
        bestand: "08-afsluiten-rapport.png",
        intro: "Volledige oplevering, optioneel met foto, video en handtekening, voor een keuken.",
        punten: [
          "Kies 'Afsluiten + rapport' onderaan de klus.",
          "Foto, video en handtekening zijn altijd optioneel.",
        ],
        route: "/opdracht/:id/afronden",
      },
      {
        id: "handtekening",
        titel: "Handtekening van de klant",
        bestand: "09-handtekening.png",
        intro: "Laat de klant op het scherm tekenen.",
        punten: [
          "De handtekening komt op het rapport.",
          "Geen klant erbij? Sla deze stap over.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "handtekening-modal",
      },
      {
        id: "vervolg-opgeleverd",
        titel: "Vervolg / opgeleverd",
        bestand: "10-vervolg-opgeleverd.png",
        intro: "Een tweede ronde op dezelfde klus.",
        punten: [
          "Een vervolg sluit je af als 'opgeleverd' en krijgt een label.",
        ],
        route: "/opdracht/:id",
        nieuw: true,
      },
      {
        id: "niet-doorgegaan",
        titel: "Niet doorgegaan",
        bestand: "11-niet-doorgegaan.png",
        intro: "Klant niet thuis of werk niet af te ronden. Meld terug met een reden.",
        punten: [
          "De opdrachtgever ziet dat de klus niet is doorgegaan, met jouw reden.",
        ],
        route: "/opdracht/:id/afronden",
        nieuw: true,
      },
    ],
  },
  {
    titel: "Versturen",
    onderwerpen: [
      {
        id: "naar-opdrachtgever",
        titel: "Naar de opdrachtgever",
        bestand: "12-naar-opdrachtgever.png",
        intro: "Onderaan verstuur je het rapport.",
        punten: [
          "Pas dan staat de klus op 'opgeleverd'.",
          "Foto's en meldingen gaan mee.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "scroll-onder",
      },
      {
        id: "klant-versie",
        titel: "Klant-versie",
        bestand: "13-klant-versie.png",
        intro: "Optioneel: stuur de klant ook een versie.",
        punten: [
          "Vul het mailadres in; de interne notitie gaat niet mee.",
        ],
        route: "/opdracht/:id/opleveren",
        interactie: "scroll-onder",
        nieuw: true,
      },
    ],
  },
];

export const HANDLEIDING_ONDERWERPEN: HandleidingOnderwerp[] =
  HANDLEIDING_GROEPEN.flatMap((groep) => groep.onderwerpen);
```

- [ ] **Step 4: Draai de test, verwacht groen**

Run: `npm test -- handleiding-stappen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/handleiding-stappen.ts src/lib/handleiding-stappen.test.ts
git commit -m "Handleiding: databron naar groepen met onderwerpen"
```

---

## Task 2: Client-component HandleidingWeergave

**Files:**
- Create: `src/components/HandleidingWeergave.tsx`

- [ ] **Step 1: Schrijf de client-component**

Maak `src/components/HandleidingWeergave.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

export type OnderwerpView = {
  id: string;
  titel: string;
  intro?: string;
  punten: string[];
  bestand: string;
  nieuw?: boolean;
  bestaat: boolean;
};

export type GroepView = { titel: string; onderwerpen: OnderwerpView[] };

/**
 * Toont de handleiding als inklapbare onderwerpen in groepen. Standaard alles ingeklapt
 * (snel scannen); één knop klapt alles open/dicht, en losse onderwerpen kun je los aantikken.
 * Bewust geen verborgen browser-geheugen: het gedrag is altijd hetzelfde.
 */
export function HandleidingWeergave({ groepen }: { groepen: GroepView[] }) {
  const alleIds = useMemo(
    () => groepen.flatMap((g) => g.onderwerpen.map((o) => o.id)),
    [groepen],
  );
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const ietsOpen = openIds.size > 0;

  function wisselAlles() {
    setOpenIds(ietsOpen ? new Set() : new Set(alleIds));
  }
  function wisselEen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={wisselAlles}
        className="mb-5 flex min-h-[56px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-primary bg-primary px-4 py-2 text-primary-ink transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-3 focus-visible:outline-accent"
      >
        <span className="font-mono text-sm font-extrabold uppercase tracking-[0.05em]">
          {ietsOpen ? "Alles inklappen" : "Alles openklappen"}
        </span>
        {!ietsOpen && (
          <span className="text-xs font-semibold text-primary-ink/70">
            of tik hieronder een onderwerp aan
          </span>
        )}
      </button>

      {groepen.map((groep) => (
        <section key={groep.titel} className="mb-7">
          <h2 className="mb-2.5 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
            {groep.titel}
            <span aria-hidden className="h-0.5 flex-1 bg-line" />
          </h2>

          {groep.onderwerpen.map((o) => {
            const open = openIds.has(o.id);
            return (
              <div key={o.id} id={o.id} className={`mb-2.5 border-2 ${open ? "border-ink" : "border-line"} bg-white`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`paneel-${o.id}`}
                    onClick={() => wisselEen(o.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 border-l-[5px] ${open ? "border-l-accent" : "border-l-line"} bg-surface px-4 py-4 text-left focus-visible:outline-3 focus-visible:outline-accent`}
                  >
                    <span className="font-mono text-base font-extrabold tracking-tight text-ink">{o.titel}</span>
                    {o.nieuw && (
                      <span className="border-[1.5px] border-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-accent">
                        nieuw
                      </span>
                    )}
                    <span aria-hidden className={`ml-auto text-lg text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}>
                      ›
                    </span>
                  </button>
                </h3>

                {open && (
                  <div id={`paneel-${o.id}`} className="px-4 pb-4 pt-3.5">
                    {o.intro && <p className="mb-2 text-sm text-ink">{o.intro}</p>}
                    {o.punten.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                        {o.punten.map((punt) => (
                          <li key={punt}>{punt}</li>
                        ))}
                      </ul>
                    )}

                    {o.bestaat ? (
                      <div className="mx-auto mt-3.5 w-full max-w-[240px] overflow-hidden rounded-[26px] border-8 border-ink bg-ink">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/handleiding/${o.bestand}`}
                          alt={`Schermafbeelding: ${o.titel}`}
                          className="block h-[330px] w-full object-cover object-top"
                        />
                      </div>
                    ) : (
                      <div className="mt-3.5 flex min-h-[120px] items-center justify-center border border-dashed border-line bg-surface p-5 text-center text-xs text-ink-muted">
                        Schermafbeelding volgt.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten in `HandleidingWeergave.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/HandleidingWeergave.tsx
git commit -m "Handleiding: inklapbare weergave-component"
```

---

## Task 3: Pagina koppelen aan de nieuwe component

**Files:**
- Modify: `src/app/handleiding/page.tsx`

- [ ] **Step 1: Vervang de pagina**

Vervang de volledige inhoud van `src/app/handleiding/page.tsx` door:

```tsx
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { vereisRol } from "@/lib/toegang";
import { HANDLEIDING_GROEPEN } from "@/lib/handleiding-stappen";
import { HandleidingWeergave, type GroepView } from "@/components/HandleidingWeergave";

export const dynamic = "force-dynamic";

export default async function HandleidingPage() {
  // Alle ingelogde rollen mogen de uitleg zien; geen gevoelige data, geen redirect-gedoe.
  const { email, profiel } = await vereisRol(["monteur", "beheerder", "opdrachtgever"]);
  const isMonteur = profiel.rol === "monteur";
  const terugHref = isMonteur ? "/" : "/dashboard";
  const terugLabel = isMonteur ? "Kluspool" : "Dashboard";

  // Server-side per onderwerp checken of het screenshot-bestand bestaat; de client toont
  // anders een nette placeholder. Zo breekt een ontbrekend plaatje de pagina nooit.
  const groepen: GroepView[] = HANDLEIDING_GROEPEN.map((groep) => ({
    titel: groep.titel,
    onderwerpen: groep.onderwerpen.map((o) => ({
      id: o.id,
      titel: o.titel,
      intro: o.intro,
      punten: o.punten,
      bestand: o.bestand,
      nieuw: o.nieuw,
      bestaat: existsSync(path.join(process.cwd(), "public", "handleiding", o.bestand)),
    })),
  }));

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
              Zo loop je een klus door, van kluspool tot versturen. Tik een onderwerp aan om het te openen.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <HandleidingWeergave groepen={groepen} />

      <div className="mt-6">
        <Link
          href="/handleiding/voorbeeldrapport"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-primary px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          Bekijk een voorbeeldrapport
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck + unit**

Run: `npx tsc --noEmit && npm test -- handleiding-stappen`
Expected: geen typefouten; unit groen.

- [ ] **Step 3: Commit**

```bash
git add src/app/handleiding/page.tsx
git commit -m "Handleiding: pagina koppelt aan inklapbare weergave"
```

---

## Task 4: e2e bijwerken (toggle + los openen)

**Files:**
- Modify: `e2e/handleiding.spec.ts`

- [ ] **Step 1: Vervang de e2e-test**

Vervang de volledige inhoud van `e2e/handleiding.spec.ts` door:

```ts
import { test, expect } from "@playwright/test";
import { HANDLEIDING_ONDERWERPEN } from "@/lib/handleiding-stappen";

/**
 * De monteur bereikt de handleiding via het menu, ziet alle onderwerpen, en kan ze
 * openklappen (alles tegelijk of los). Draait onder de monteur-sessie; geen seed nodig.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("monteur opent de handleiding via het menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Kluspool")).toBeVisible();
  await page.getByRole("button", { name: /menu voor/i }).click();
  await page.getByRole("menuitem", { name: /handleiding/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/handleiding");
  await expect(page.getByRole("heading", { name: "Handleiding", level: 1 })).toBeVisible();
});

test("alle onderwerp-titels zijn zichtbaar, ook ingeklapt", async ({ page }) => {
  await page.goto("/handleiding");
  for (const o of HANDLEIDING_ONDERWERPEN) {
    await expect(page.getByRole("heading", { name: o.titel, level: 3 })).toBeVisible();
  }
});

test("Alles openklappen toont de inhoud en klapt weer dicht", async ({ page }) => {
  await page.goto("/handleiding");
  const eerste = HANDLEIDING_ONDERWERPEN[0];
  const knop = page.getByRole("button", { name: /alles openklappen/i });
  await expect(knop).toBeVisible();
  await knop.click();
  // intro van het eerste onderwerp wordt zichtbaar
  if (eerste.intro) await expect(page.getByText(eerste.intro, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /alles inklappen/i }).click();
  if (eerste.intro) await expect(page.getByText(eerste.intro, { exact: false })).toHaveCount(0);
});

test("een los onderwerp openklappen toont alleen dat onderwerp", async ({ page }) => {
  await page.goto("/handleiding");
  const doel = HANDLEIDING_ONDERWERPEN.find((o) => o.intro)!;
  await page.getByRole("button", { name: doel.titel }).click();
  await expect(page.getByText(doel.intro!, { exact: false })).toBeVisible();
});
```

- [ ] **Step 2: Draai de e2e (tegen test-DB)**

Run: `npm run test:e2e -- e2e/handleiding.spec.ts`
Expected: 4 tests PASS. (Draait op `.env.test`; vereist dat de monteur-auth-state bestaat, zoals de andere e2e.)

- [ ] **Step 3: Commit**

```bash
git add e2e/handleiding.spec.ts
git commit -m "Handleiding: e2e voor onderwerpen, toggle en los openklappen"
```

---

## Task 5: Screenshot-generator bijwerken en plaatjes verversen

**Files:**
- Modify: `e2e-handleiding/genereer-screenshots.spec.ts`
- Delete: oude `public/handleiding/0{1..6}-*.png`

- [ ] **Step 1: Pas de generator aan**

In `e2e-handleiding/genereer-screenshots.spec.ts`:

1. Vervang de import van `HANDLEIDING_STAPPEN` door `HANDLEIDING_ONDERWERPEN`:

```ts
import { HANDLEIDING_ONDERWERPEN } from "@/lib/handleiding-stappen";
```

2. Vervang `for (const stap of HANDLEIDING_STAPPEN) {` door `for (const stap of HANDLEIDING_ONDERWERPEN) {` (de loop-variabele heet verder ook `stap`, rest blijft).

3. Sla onderwerpen met `nieuw: true` over zolang er geen betrouwbaar scherm te seeden is (placeholder blijft staan in de app). Voeg bovenaan de loop toe:

```ts
      if (stap.nieuw) continue; // nog geen seedbaar scherm; pagina toont placeholder
```

4. Voeg de nieuwe interacties toe in de `if/else`-keten vóór de screenshot (naast de bestaande `handtekening-modal` / `scroll-onder` / `interne-notitie`):

```ts
        } else if (stap.interactie === "spoed-aan") {
          // Zet de spoed-schakelaar aan zodat de spoed-uitleg op de screenshot staat.
          const spoed = page.getByRole("switch", { name: /spoed/i }).or(page.getByLabel(/spoed/i));
          await spoed.first().click({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(400);
        } else if (stap.interactie === "documenten-blok") {
          await page.getByText(/document/i).first().scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(400);
```

5. Snijd de screenshot bij in plaats van de hele viewport vast te leggen. Vervang `await page.screenshot({ path: path.join(UIT, stap.bestand) });` door:

```ts
        // Bijsnijden op de inhoud: meet de hoogte van de hoofd-inhoud en clip daarop,
        // zodat er geen lege witruimte onder de schermafbeelding staat.
        const hoogte = await page.evaluate(() => {
          const main = document.querySelector("main") ?? document.body;
          return Math.min(Math.ceil(main.getBoundingClientRect().height), 2200);
        });
        const breedte = page.viewportSize()?.width ?? 390;
        await page.screenshot({
          path: path.join(UIT, stap.bestand),
          clip: { x: 0, y: 0, width: breedte, height: Math.max(hoogte, 200) },
        });
```

- [ ] **Step 2: Genereer de screenshots**

Run: `npm run screenshots:handleiding`
Expected: PASS; nieuwe bestanden `public/handleiding/01-kluspool.png` t/m de niet-`nieuw`-onderwerpen verschijnen. Faalt de run op een onderwerp, lees de foutmelding: lukt het scherm niet betrouwbaar, zet dat onderwerp dan op `nieuw: true` in de databron (placeholder) en draai opnieuw.

- [ ] **Step 3: Controleer de plaatjes en ruim oude op**

Open een paar nieuwe plaatjes en controleer dat ze bijgesneden zijn (geen grote lege witruimte) en het juiste scherm tonen. Verwijder daarna de oude bestanden die niet meer in de databron staan:

```bash
git rm public/handleiding/01-werkpool.png public/handleiding/02-opdracht-openen.png public/handleiding/03-melding-toevoegen.png public/handleiding/04-voltooien.png public/handleiding/05-handtekening.png public/handleiding/06-versturen.png
```

- [ ] **Step 4: Commit**

```bash
git add e2e-handleiding/genereer-screenshots.spec.ts public/handleiding/
git commit -m "Handleiding: generator itereert onderwerpen, snijdt bij; plaatjes ververst"
```

---

## Task 6: Copy en docs bijwerken

**Files:**
- Modify: `src/components/KluspoolOnboarding.tsx`
- Modify: `HANDLEIDING-ONDERHOUD.md`, `TESTDEKKING.md`, `TOESTANDEN.md`

- [ ] **Step 1: Maak de "6 stappen"-copy neutraal**

In `src/components/KluspoolOnboarding.tsx`:
- Regel ~80: `Bekijk de handleiding (6 stappen)` → `Bekijk de handleiding`.
- Regel ~115: `Bekijk hoe Kluslus werkt in 6 korte stappen.` → `Bekijk hoe Kluslus werkt, stap voor stap.`

- [ ] **Step 2: Werk de onderhoud-doc bij**

In `HANDLEIDING-ONDERHOUD.md`: vervang verwijzingen naar de platte `HANDLEIDING_STAPPEN`/"6 stappen" door de nieuwe opzet: databron `HANDLEIDING_GROEPEN` (+ afgeleide `HANDLEIDING_ONDERWERPEN`), een onderwerp toevoegen = één regel + `npm run screenshots:handleiding`, `nieuw: true` voor onderwerpen zonder plaatje, screenshots worden bijgesneden.

- [ ] **Step 3: Werk TESTDEKKING.md en TOESTANDEN.md bij**

Voeg in `TESTDEKKING.md` de handleiding-dekking toe (unit op de databron-structuur; e2e op onderwerpen + toggle + los openklappen). Noteer in `TOESTANDEN.md` de UI-toestanden van de handleiding: alles ingeklapt (begin), alles open, één onderwerp open, en plaatje-aanwezig vs placeholder.

- [ ] **Step 4: Volledige unit + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: alles groen.

- [ ] **Step 5: Commit**

```bash
git add src/components/KluspoolOnboarding.tsx HANDLEIDING-ONDERHOUD.md TESTDEKKING.md TOESTANDEN.md
git commit -m "Handleiding: copy en docs bijgewerkt naar de nieuwe opzet"
```

---

## Task 7: Visuele eindcontrole op telefoonformaat (opleverlat)

**Files:** geen (handmatige verificatie)

- [ ] **Step 1: Bekijk de echte pagina op telefoonformaat**

Start de app (let op: lokale `next dev` draait op de PRODUCTIE-DB; alleen lezen/bekijken, niets wegschrijven). Open `/handleiding` als monteur, smal venster (±390px):
- Standaard alles ingeklapt; de grijze onderwerp-balken staan onder elkaar als overzicht.
- "Alles openklappen" klapt alles open en de knop wordt "Alles inklappen"; subregel verdwijnt bij open.
- Een los onderwerp openen werkt; streepje links wordt oranje; chevron draait.
- Screenshots zitten in het telefoon-frame, bijgesneden; `nieuw`-onderwerpen tonen het label + "Schermafbeelding volgt."-placeholder.
- Voorbeeldrapport-knop werkt; terug-knop klopt per rol.

- [ ] **Step 2: Push de branch en open een PR**

```bash
git push -u origin handleiding-herontwerp
```
De pre-push hook draait unit + typecheck. Open daarna een PR; wacht op groene CI (`test`).

- [ ] **Step 3: Naar de test-omgeving, dan STOP voor keuring**

Breng de feature naar `omgeving-test` (merge `handleiding-herontwerp` erin en push), zodat `kluslus-test` deployt. Dit MOET vóór master. Stop daarna: vraag Reinier de visuele check op `kluslus-test` (beide rollen). **Niet zelf naar master mergen.**

---

## Self-Review (door de planner uitgevoerd)

- **Spec-dekking:** groepen+onderwerpen (Task 1), geen los menu + grijze balken + toggle met subregel (Task 2/3), kleuren/letters via tokens (Task 2/3), placeholder bij ontbrekend plaatje (Task 2/3), bijsnijden + nieuwe onderwerpen in generator (Task 5), waar-getoond copy (Task 6), testen (Task 1/4/6), opleverlat (Task 7). Gedekt.
- **Placeholders:** geen TBD/TODO; alle stappen hebben concrete code of commando's.
- **Type-consistentie:** `HANDLEIDING_GROEPEN`/`HANDLEIDING_ONDERWERPEN`, `GroepView`/`OnderwerpView`, `bestaat`, `nieuw` consistent gebruikt tussen databron, component, pagina, generator en tests. Heading-niveaus: pagina-titel h1, groep h2, onderwerp h3 (e2e Task 4 zoekt onderwerpen op level 3).
- **Aandachtspunt voor de uitvoerder:** de exacte selectors voor `spoed-aan` en `documenten-blok` in de generator (Task 5) zijn best-effort; verifieer tegen het echte scherm en val terug op `nieuw: true` als een betrouwbare screenshot niet lukt. Dat is bewust: liever een nette placeholder dan een verouderd/fout plaatje.
