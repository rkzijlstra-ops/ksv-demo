# Klus afronden - Plan 1 (monteur-kant, kern) - Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De monteur kan een klus snel "afgerond" melden (optioneel notitie + een vervolg-vinkje), via één "Klus afronden"-keuzescherm; de zaak krijgt een mailtje en de status wordt vastgelegd.

**Architecture:** Modelleren op de bestaande "terugmelden"-keten: een paar velden in de `meldingen`-tabel, een db-functie, een API-endpoint, een pure mail-tekstfunctie, en UI-schermen in app-stijl. Een nieuw "Klus afronden"-keuzescherm bundelt de drie eindwegen (afgerond / opleveren / terugmelden); de bestaande oplever- en terugmeld-flows blijven ongemoeid.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres, `meldingen`-tabel), Resend (mail), Vitest (unit), Playwright (e2e).

**Scope van dit plan (1):** de monteur kan afgerond melden met notitie + vervolg-vinkje, en het keuzescherm. **Buiten dit plan (komt in plan 1b en 2):** foto/video bij afgerond, de dashboard-status "Afgerond" + eindoordeel van de zaak + heropenen/te-plannen, en de versturen-opschoning.

---

## Belangrijke projectregels (lees eerst)
- **AGENTS.md:** Next.js 16 met breaking changes; bij twijfel over een API lees `node_modules/next/dist/docs/`.
- **E2e/Playwright en database-migraties draait Reinier zelf in PowerShell.** Subagents schrijven code en draaien alleen `npx vitest run ...` en `npx tsc --noEmit`. Migratie en e2e zijn voorgekauwde commando's voor Reinier.
- **Git-huishouden:** specifieke `git add` per bestand. Commit-message eindigt met `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Blauwdruk:** alles is gemodelleerd op de terugmeld-keten: `src/app/api/opdrachten/[id]/terugmelden/route.ts`, `src/lib/db.ts` (`markeerTeruggemeld`), `src/lib/terugmeld-mail.ts`, `src/components/TerugmeldKnop.tsx`.

## Bestandsoverzicht
- **Create:** `supabase/schema-afronden.sql` - migratie: drie kolommen op `meldingen`.
- **Modify:** `src/lib/db.ts` - `Melding`-type uitbreiden + `markeerAfgerond`-functie + interface-declaratie.
- **Create:** `src/lib/afgerond-mail.ts` - pure tekstfunctie voor de mail naar de zaak.
- **Create:** `src/lib/afgerond-mail.test.ts` - unit-test op die tekstfunctie.
- **Modify:** `src/lib/mail.ts` - `verstuurAfgerondMelding()` (verzendfunctie, naast `verstuurTerugmelding`).
- **Create:** `src/app/api/opdrachten/[id]/afgerond/route.ts` - POST-endpoint.
- **Create:** `src/app/opdracht/[id]/afronden/page.tsx` - het "Klus afronden"-keuzescherm.
- **Create:** `src/components/AfgerondMeldenKnop.tsx` - de "Afgerond melden"-knop + modal (notitie + vervolg-vinkje).
- **Modify:** `src/app/opdracht/[id]/page.tsx:240-246` - de onderbalk-knop "Rapportage" wordt "Klus afronden" en linkt naar het keuzescherm.
- **Create (e2e, niet draaien):** `e2e/afgerond.spec.ts`.

---

### Task 1: Database-migratie

**Files:**
- Create: `supabase/schema-afronden.sql`

- [ ] **Step 1: Schrijf de migratie**

`supabase/schema-afronden.sql`:

```sql
-- Klus afronden (plan 1): de monteur meldt een klus snel als afgerond, los van de volledige
-- oplevering. Analoog aan teruggemeld_*. Zie DESIGN-KLUS-AFRONDEN.md.
alter table public.meldingen
  add column if not exists afgerond_door_monteur_at timestamptz,
  add column if not exists afgerond_toelichting       text,
  add column if not exists afgerond_vervolg_nodig      boolean not null default false;
```

- [ ] **Step 2: Reinier draait de migratie** *(Reinier draait dit in PowerShell)*

Run: `npm run migrate:test`  (of de migratie tegen de juiste database zoals gebruikelijk in dit project; bevestig vooraf welke database actief is)
Expected: de drie kolommen bestaan op `public.meldingen` (idempotent dankzij `if not exists`).

- [ ] **Step 3: Commit**

```bash
git add supabase/schema-afronden.sql
git commit -m "Afronden: migratie - afgerond-velden op meldingen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Db-type en db-functie

De velden worden gelezen via dezelfde weg als de bestaande `teruggemeld_*`-velden (de row-mapper in `getMeldingById`/`getWerkpoolVoor`). Voeg ze toe aan het `Melding`-type en, als de mapper velden expliciet opsomt, daar ook (zoek `teruggemeld_at` in `db.ts` en voeg de afgerond-velden er direct naast toe, op dezelfde manier).

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Breid het `Melding`-type uit**

In `src/lib/db.ts`, direct na de teruggemeld-velden (rond regel 65):

```ts
  teruggemeld_at: string | null;
  teruggemeld_reden: string | null;
  teruggemeld_toelichting: string | null;
  // Klus afronden (plan 1): monteur meldt snel afgerond, los van de volledige oplevering
  afgerond_door_monteur_at: string | null;
  afgerond_toelichting: string | null;
  afgerond_vervolg_nodig: boolean;
```

- [ ] **Step 2: Controleer/​vul de row-mapper**

Zoek in `db.ts` waar `teruggemeld_at` uit de databron in een `Melding` wordt gezet (de mapper in `getMeldingById` en de werkpool-query). Staan de velden daar expliciet (`teruggemeld_at: row.teruggemeld_at`), voeg dan op precies dezelfde plek toe:

```ts
        afgerond_door_monteur_at: row.afgerond_door_monteur_at ?? null,
        afgerond_toelichting: row.afgerond_toelichting ?? null,
        afgerond_vervolg_nodig: Boolean(row.afgerond_vervolg_nodig),
```

Gebruikt de mapper `select("*")` + een spread/cast (geen expliciete opsomming), dan komen de velden vanzelf mee en is alleen het type nodig. Controleer welke van de twee het is en pas alleen aan wat nodig is.

- [ ] **Step 3: Voeg de db-functie toe aan de `Db`-interface**

Zoek de interface-declaratie van `markeerTeruggemeld` (rond regel 343-360, bij de andere methodes) en voeg ernaast toe:

```ts
  markeerAfgerond(
    id: string,
    input: { toelichting: string | null; vervolgNodig: boolean },
  ): Promise<void>;
```

- [ ] **Step 4: Implementeer `markeerAfgerond`**

Direct na de implementatie van `markeerTeruggemeld` (rond regel 987):

```ts
    async markeerAfgerond(id, input) {
      const { error } = await client
        .from("meldingen")
        .update({
          afgerond_door_monteur_at: new Date().toISOString(),
          afgerond_toelichting: input.toelichting,
          afgerond_vervolg_nodig: input.vervolgNodig,
        })
        .eq("id", id);
      if (error) throw new Error(`DB afronden mislukt: ${error.message}`);
    },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts
git commit -m "Afronden: Melding-type + markeerAfgerond db-functie

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Mail-tekst (pure functie, TDD)

**Files:**
- Create: `src/lib/afgerond-mail.ts`
- Test: `src/lib/afgerond-mail.test.ts`

- [ ] **Step 1: Schrijf de falende test**

`src/lib/afgerond-mail.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { afgerondMeldingTekst } from "./afgerond-mail";

describe("afgerondMeldingTekst", () => {
  it("zet klantnaam en ref in het onderwerp", () => {
    const { subject } = afgerondMeldingTekst("Jan", "Fam. Jansen", "192920", null, false, "");
    expect(subject).toContain("Fam. Jansen");
  });

  it("noemt 'helemaal klaar' als er geen vervolg nodig is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", "192920", null, false, "");
    expect(text.toLowerCase()).toContain("helemaal klaar");
    expect(text).toContain("ref 192920");
  });

  it("noemt het vervolg als vervolgNodig true is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", null, null, true, "");
    expect(text.toLowerCase()).toContain("vervolg");
  });

  it("voegt de toelichting toe als die er is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", null, "Alles getest", false, "");
    expect(text).toContain("Alles getest");
  });
});
```

- [ ] **Step 2: Draai de test, controleer dat hij faalt**

Run: `npx vitest run src/lib/afgerond-mail.test.ts`
Expected: FAIL met "Cannot find module './afgerond-mail'".

- [ ] **Step 3: Schrijf de tekstfunctie**

`src/lib/afgerond-mail.ts`:

```ts
/**
 * Onderwerp en tekst van de "afgerond gemeld"-mail naar de zaak: de monteur heeft een klus snel als
 * afgerond gemeld (geen volledig rapport). Pure functie, los te testen. Stijl gelijk aan
 * terugmeld-mail.ts. Afsluiter = de keukenzaak/organisatie.
 */
export function afgerondMeldingTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  toelichting: string | null,
  vervolgNodig: boolean,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Klus afgerond gemeld: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const toel = toelichting?.trim() ? `\n\nNotitie van de monteur:\n${toelichting.trim()}` : "";
  const slot = vervolgNodig
    ? "Let op: er komt nog een vervolg (bijvoorbeeld onderdelen die later binnenkomen). De klus moet opnieuw ingepland worden."
    : "De monteur geeft aan dat de klus helemaal klaar is.";
  const text = `Hoi,

${monteurNaam} heeft de klus voor ${klantNaam}${ref} als afgerond gemeld.

${slot}${toel}

Je vindt de klus op het dashboard.

${afzender}`;
  return { subject, text };
}
```

- [ ] **Step 4: Draai de test, controleer dat hij slaagt**

Run: `npx vitest run src/lib/afgerond-mail.test.ts`
Expected: PASS, 4 tests groen.

- [ ] **Step 5: Commit**

```bash
git add src/lib/afgerond-mail.ts src/lib/afgerond-mail.test.ts
git commit -m "Afronden: mail-tekst naar de zaak + unit-test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Verzendfunctie in mail.ts

Zoek in `src/lib/mail.ts` de functie `verstuurTerugmelding` (rond regel 325) en modelleer er een nieuwe naast. Lees die functie eerst om de exacte verzend-helper (Resend-wrapper) en de parameter-vorm over te nemen.

**Files:**
- Modify: `src/lib/mail.ts`

- [ ] **Step 1: Voeg `verstuurAfgerondMelding` toe**

In `src/lib/mail.ts`, importeer bovenaan de tekstfunctie en voeg naast `verstuurTerugmelding` toe (pas de interne verzend-helper-aanroep aan zodat hij exact gelijk is aan die van `verstuurTerugmelding`):

```ts
import { afgerondMeldingTekst } from "./afgerond-mail";

/**
 * Verstuurt de "afgerond gemeld"-mail naar de zaak. Best-effort; gemodelleerd op verstuurTerugmelding.
 */
export async function verstuurAfgerondMelding(opts: {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  toelichting: string | null;
  vervolgNodig: boolean;
  organisatie?: string;
}): Promise<void> {
  const { subject, text } = afgerondMeldingTekst(
    opts.monteurNaam,
    opts.klantNaam,
    opts.referentienummer,
    opts.toelichting,
    opts.vervolgNodig,
    opts.organisatie ?? "",
  );
  // Gebruik exact dezelfde interne verzend-helper als verstuurTerugmelding (zie die functie hierboven).
  await stuurMail({ naar: opts.naar, subject, text });
}
```

Let op: `stuurMail` is een placeholder voor de echte interne helper. Lees `verstuurTerugmelding` en gebruik letterlijk dezelfde aanroep/naam die daar staat. Wijk alleen af in subject/text (die komen uit `afgerondMeldingTekst`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mail.ts
git commit -m "Afronden: verstuurAfgerondMelding (mail naar de zaak)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: API-endpoint

**Files:**
- Create: `src/app/api/opdrachten/[id]/afgerond/route.ts`

- [ ] **Step 1: Schrijf het endpoint**

`src/app/api/opdrachten/[id]/afgerond/route.ts` (gemodelleerd op de terugmeld-route):

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verstuurAfgerondMelding } from "@/lib/mail";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/**
 * De monteur meldt een aan hem toegewezen klus snel als afgerond (geen volledig rapport). Optioneel een
 * notitie en het vervolg-vinkje. De zaak krijgt automatisch bericht (best-effort). Alleen de toegewezen
 * monteur. De melding blijft staan ook als de mail faalt.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const toelichting =
    typeof body.toelichting === "string" && body.toelichting.trim() ? body.toelichting.trim() : null;
  const vervolgNodig = body.vervolgNodig === true;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "monteur" || opdracht.toegewezen_aan !== userId) {
    return NextResponse.json({ error: "Alleen de toegewezen monteur kan afronden" }, { status: 403 });
  }

  try {
    await dbi.markeerAfgerond(id, { toelichting, vervolgNodig });
  } catch (err) {
    return NextResponse.json({ error: `Afronden mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  await logActie(dbi, id, "afgerond", { id: userId, naam: eigen?.naam, rol: eigen?.rol }, { toelichting, vervolgNodig });

  let gemaild = false;
  let mailFout: string | null = null;
  const kantoorAdres = process.env.RAPPORT_EMAIL?.trim();
  if (kantoorAdres) {
    try {
      await verstuurAfgerondMelding({
        naar: kantoorAdres,
        monteurNaam: eigen?.naam ?? opdracht.monteur_naam ?? "De monteur",
        klantNaam: opdracht.klant_naam ?? "de opdracht",
        referentienummer: opdracht.referentienummer,
        toelichting,
        vervolgNodig,
        organisatie: opdracht.keukenzaak ?? undefined,
      });
      gemaild = true;
    } catch (err) {
      mailFout = (err as Error).message;
    }
  }

  return NextResponse.json({ ok: true, gemaild, ...(mailFout ? { mailFout } : {}) }, { status: 200 });
}
```

Let op: controleer dat `logActie` een actietype `"afgerond"` accepteert. Is het actietype een vaste union, breid die dan uit met `"afgerond"` op de plek waar `"teruggemeld"` staat (zoek in `src/lib/gebeurtenis.ts`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten (fix een eventueel actietype-union in `gebeurtenis.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/opdrachten/[id]/afgerond/route.ts
git commit -m "Afronden: API-endpoint POST /api/opdrachten/[id]/afgerond

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(Als `gebeurtenis.ts` ook gewijzigd is, voeg die toe aan dezelfde commit.)

---

### Task 6: "Afgerond melden"-knop + modal (notitie + vervolg-vinkje)

Gemodelleerd op `TerugmeldKnop.tsx` (modal-patroon), maar zonder reden-dropdown: een notitie en een vinkje.

**Files:**
- Create: `src/components/AfgerondMeldenKnop.tsx`

- [ ] **Step 1: Schrijf de component**

`src/components/AfgerondMeldenKnop.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

/**
 * "Afgerond melden": de snelle eind-weg voor een (service)klus. Optioneel een notitie en een vinkje
 * "er komt nog een vervolg". De zaak krijgt bericht. Gemodelleerd op TerugmeldKnop (modal-patroon).
 */
export function AfgerondMeldenKnop({ opdrachtId, klantNaam }: { opdrachtId: string; klantNaam: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toelichting, setToelichting] = useState("");
  const [vervolg, setVervolg] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function melden() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/afgerond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toelichting: toelichting.trim() || null, vervolgNodig: vervolg }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Afronden mislukt (${res.status})`);
        return;
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-base font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
      >
        <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />
        Afgerond melden
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klus afgerond melden"
          onClick={() => { if (!bezig) setOpen(false); }}
        >
          <div className="w-full max-w-md border-2 border-ink bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-mono text-lg font-extrabold text-ink">Afgerond melden</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Klus voor <span className="font-bold">{klantNaam}</span>. De zaak krijgt bericht dat hij klaar is.
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-ink">
              Notitie (optioneel)
              <textarea
                value={toelichting}
                onChange={(e) => setToelichting(e.target.value)}
                rows={3}
                placeholder="Bijv. lade afgesteld, alles getest, klant tevreden."
                className="border-2 border-line bg-white p-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
              />
            </label>

            <label className="mt-3 flex items-start gap-3 border-2 border-urgent-geel bg-[#fffbeb] p-3 text-sm">
              <input
                type="checkbox"
                checked={vervolg}
                onChange={(e) => setVervolg(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
              <span>
                <span className="font-bold text-ink">Er komt nog een vervolg</span>
                <span className="block text-ink-muted">
                  Bijv. onderdelen die later binnenkomen. De klus gaat dan terug naar de zaak om opnieuw in te plannen.
                </span>
              </span>
            </label>

            {fout && (
              <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
                <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {fout}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={melden}
                disabled={bezig}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                Afgerond melden
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={bezig}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add src/components/AfgerondMeldenKnop.tsx
git commit -m "Afronden: AfgerondMeldenKnop (notitie + vervolg-vinkje)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Keuzescherm + entry-knop

**Files:**
- Create: `src/app/opdracht/[id]/afronden/page.tsx`
- Modify: `src/app/opdracht/[id]/page.tsx` (onderbalk-knop)

- [ ] **Step 1: Schrijf het keuzescherm**

`src/app/opdracht/[id]/afronden/page.tsx` (server-component; haalt de opdracht voor de klantnaam, drie keuzes):

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { vereisRol } from "@/lib/toegang";
import { AfgerondMeldenKnop } from "@/components/AfgerondMeldenKnop";

export const dynamic = "force-dynamic";

export default async function AfrondenPage({ params }: { params: Promise<{ id: string }> }) {
  await vereisRol(["monteur", "beheerder"]);
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const klantNaam = opdracht.klant_naam ?? "deze klus";

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <Link
          href={`/opdracht/${id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface"
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          Terug
        </Link>
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Klus afronden</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Hoe rond je af?</h1>
        <p className="mt-1 text-sm text-ink-muted">Kies wat bij deze klus past.</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="flex flex-col gap-3">
        <section className="border-2 border-line bg-white p-4">
          <h2 className="font-mono text-lg font-extrabold text-ink">Klaar, snel</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Voor service of een kleine klus. Optioneel een notitie. De zaak ziet dat het klaar is.
          </p>
          <div className="mt-3">
            <AfgerondMeldenKnop opdrachtId={id} klantNaam={klantNaam} />
          </div>
        </section>

        <Link
          href={`/opdracht/${id}/opleveren`}
          className="flex items-center justify-between border-2 border-line bg-white p-4 hover:bg-surface"
        >
          <span>
            <span className="block font-mono text-lg font-extrabold text-ink">Klaar + rapport</span>
            <span className="block text-sm text-ink-muted">Volledige oplevering met foto's en handtekening.</span>
          </span>
          <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>

        <Link
          href="/"
          className="flex items-center justify-between border-2 border-line bg-white p-4 hover:bg-surface"
        >
          <span>
            <span className="block font-mono text-lg font-extrabold text-ink">Niet doorgegaan</span>
            <span className="block text-sm text-ink-muted">Klant niet thuis of werk niet af te ronden. Terugmelden doe je op de werkpool-kaart.</span>
          </span>
          <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
```

Noot: terugmelden zit nu op de werkpool-kaart (`TerugmeldKnop`); voor plan 1 verwijst de derde optie daarnaartoe. In plan 2 kan terugmelden eventueel ook hier landen.

- [ ] **Step 2: Wijzig de onderbalk-knop op het opdracht-scherm**

In `src/app/opdracht/[id]/page.tsx`, vervang de "Rapportage"-link in de vaste onderbalk (rond regel 240-246) door een "Klus afronden"-link naar het keuzescherm:

```tsx
          <Link
            href={`/opdracht/${id}/afronden`}
            className="relative inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
          >
            Klus afronden
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </Link>
```

(De "Werkpool"-link ernaast blijft ongewijzigd.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Commit**

```bash
git add src/app/opdracht/[id]/afronden/page.tsx src/app/opdracht/[id]/page.tsx
git commit -m "Afronden: keuzescherm + 'Klus afronden'-knop op opdracht-scherm

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: E2e-test (schrijven, Reinier draait)

**Files:**
- Create: `e2e/afgerond.spec.ts`

- [ ] **Step 1: Schrijf de e2e-test**

`e2e/afgerond.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * De monteur kan een toegewezen klus afgerond melden via het keuzescherm. Daarna staat
 * afgerond_door_monteur_at gevuld in de database.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;
let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `AFROND ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (opdrachtId) await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("monteur meldt een klus afgerond via het keuzescherm", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden`);
  await expect(page.getByRole("heading", { name: "Hoe rond je af?" })).toBeVisible();
  await page.getByRole("button", { name: /afgerond melden/i }).first().click();
  await page.getByRole("textbox").fill("Alles getest, klant tevreden.");
  await page.getByRole("button", { name: /afgerond melden/i }).last().click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin.from("meldingen").select("afgerond_door_monteur_at").eq("id", opdrachtId).single();
  expect(data?.afgerond_door_monteur_at).not.toBeNull();
});
```

- [ ] **Step 2: Reinier draait de e2e** *(Reinier draait dit in PowerShell)*

Run: `npx playwright test e2e/afgerond.spec.ts`
Expected: PASS. (Vereist dat de migratie uit Task 1 op de test-database gedraaid is.)

- [ ] **Step 3: Commit**

```bash
git add e2e/afgerond.spec.ts
git commit -m "Afronden: e2e - monteur meldt afgerond via keuzescherm

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Zelf-review (uitgevoerd bij schrijven plan)

- **Spec-dekking (deel monteur-kant):** "Klus afronden"-keuzescherm → Task 7; afgerond melden snel + notitie → Task 6; vervolg-vinkje → Task 6 (UI) + Task 2/5 (opslag); mail naar de zaak → Task 3/4/5; status vastgelegd in db → Task 1/2/5.
- **Bewust uitgesteld (plan 1b / 2):** foto/video bij afgerond; dashboard-status "Afgerond" + eindoordeel zaak + heropenen + "terug naar te plannen" (het vervolg-vinkje wordt nu wél opgeslagen, maar de dashboard-gevolgen komen in plan 2); versturen-opschoning.
- **Onzekerheden die de bouwer moet checken (staan in de stappen):** of de row-mapper in db.ts velden expliciet opsomt of `select("*")` gebruikt (Task 2); de exacte interne mail-verzendhelper in mail.ts (Task 4); of `logActie`/`gebeurtenis.ts` een actietype-union heeft die uitgebreid moet worden met "afgerond" (Task 5).
- **Type-consistentie:** `markeerAfgerond(id, { toelichting, vervolgNodig })` gelijk gebruikt in db-interface, implementatie en API; `afgerondMeldingTekst(...)` zelfde signatuur in test, implementatie en `verstuurAfgerondMelding`.
- **Geen placeholders in code-stappen** behalve de bewust gemarkeerde "lees X en gebruik dezelfde helper"-noten bij mail.ts en de row-mapper, omdat die exact 1op1 een bestaand patroon volgen dat per project licht kan verschillen.
