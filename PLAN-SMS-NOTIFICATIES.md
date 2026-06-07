# SMS-notificaties Implementatieplan

> **Voor agentische uitvoerders:** VERPLICHTE SUB-SKILL: gebruik superpowers:subagent-driven-development (aanbevolen) of superpowers:executing-plans om dit plan taak voor taak uit te voeren. Stappen gebruiken checkbox-syntax (`- [ ]`) voor het bijhouden.

**Doel:** Elke mail-melding naar een monteur ook als SMS sturen (CM.com), met twee instelbare categorieen in de monteur-app, plus een bevestig-herinnering via Vercel Cron.

**Architectuur:** Een dunne notificatie-laag. `mail.ts` (Resend) blijft, nieuw `sms.ts` (CM.com), pure tekstbouwers in `sms-teksten.ts`, en een dispatcher `notificaties.ts` die per gebeurtenis de kanalen kiest op basis van de monteur-voorkeuren. API-routes praten met de dispatcher in plaats van direct met een mail-functie. SMS is best-effort: een fout blokkeert nooit de status-update.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS + SECURITY DEFINER RPC), Vitest (unit + integratie), Playwright (e2e), Resend (mail, bestaat), CM.com Business Messaging (SMS, nieuw), Vercel Cron.

Brondocument: `DESIGN-SMS-NOTIFICATIES.md`.

---

## Bestandsoverzicht

Nieuw:
- `src/lib/telefoon.ts` + `src/lib/telefoon.test.ts` — normaliseert een NL-mobiel naar `+31...`.
- `src/lib/sms.ts` + `src/lib/sms.test.ts` — CM.com-zender, dry-run en allowlist.
- `src/lib/sms-teksten.ts` + `src/lib/sms-teksten.test.ts` — pure SMS-tekstbouwers per gebeurtenis.
- `src/lib/notificaties.ts` + `src/lib/notificaties.test.ts` — dispatcher (kanaalkeuze) per gebeurtenis.
- `src/lib/herinnering.ts` + `src/lib/herinnering.test.ts` — cutoff-berekening voor de bevestig-herinnering.
- `src/app/api/cron/bevestig-herinneringen/route.ts` — cron-endpoint.
- `supabase/schema-compleet-12-sms-notificaties.sql` — migratie.
- `vercel.json` — cron-schema.

Wijzigen:
- `src/lib/db.ts` — `Profiel` en `EigenGegevensInput` uitbreiden; `markeerVerzonden` zet `verzonden_at` en reset herinnering; nieuwe methoden `getKlussenVoorHerinnering`, `markeerHerinneringVerzonden`; RPC-aanroep met twee booleans.
- `src/app/api/dashboard/versturen/route.ts` — dispatcher gebruiken.
- `src/app/api/opdrachten/[id]/annuleren/route.ts` — dispatcher gebruiken.
- `src/app/api/opdrachten/[id]/ontplannen/route.ts` — dispatcher gebruiken.
- `src/app/api/opdrachten/[id]/documenten/route.ts` — nieuw-document-trigger.
- `src/app/api/mijn-gegevens/route.ts` — twee booleans opslaan.
- `src/components/MijnGegevensForm.tsx` — twee schakelaars (alleen monteur).
- `src/app/mijn-gegevens/page.tsx` — schakelaars doorgeven.
- `.env.example` — nieuwe sleutels.
- `TOESTANDEN.md` — notificatie-kolom bijwerken.

---

## Type- en functie-afspraken (gebruikt over taken heen)

- `Profiel` krijgt `sms_werk_kritiek: boolean` en `sms_overig: boolean`.
- `EigenGegevensInput` krijgt `sms_werk_kritiek: boolean` en `sms_overig: boolean`.
- `normaliseerNlMobiel(raw: string | null): string | null`
- `verstuurSms(input: { naar: string; tekst: string; afzender: string }): Promise<void>`
- `SmsCategorie = "werk_kritiek" | "overig"`
- `smsBestemming(profiel: Pick<Profiel,"telefoon"|"sms_werk_kritiek"|"sms_overig"> | null, categorie: SmsCategorie): string | null`
- `NotificatieResultaat = { gemaild: boolean; mailFout: string | null; gesmst: boolean; smsFout: string | null }`
- Dispatcher-functies: `notificeerNieuweOpdrachten`, `notificeerAnnulering`, `notificeerOntplanning`, `notificeerNieuwDocument`, `notificeerHerinnering`.
- SMS-tekstbouwers: `nieuweOpdrachtenSmsTekst`, `annuleringSmsTekst`, `ontplanningSmsTekst`, `nieuwDocumentSmsTekst`, `herinneringSmsTekst`.
- `herinneringCutoff(nu: Date, uren: number): string`
- db: `getKlussenVoorHerinnering(verzondenVoorIso: string): Promise<Melding[]>`, `markeerHerinneringVerzonden(ids: string[]): Promise<void>`.

Env-sleutels (gelezen via `process.env`, net als `mail.ts`): `CM_PRODUCT_TOKEN`, `SMS_AFZENDER`, `SMS_DRY_RUN`, `SMS_ALLOWLIST`, `CRON_SECRET`, `HERINNERING_NA_UUR`, `APP_URL`.

---

## Task 1: Datamodel en db-laag

**Files:**
- Create: `supabase/schema-compleet-12-sms-notificaties.sql`
- Modify: `src/lib/db.ts` (Profiel ~232-242, EigenGegevensInput ~245-250, Db-interface ~298-320, markeerVerzonden ~725-738, updateEigenGegevens ~861-869; nieuwe methoden erbij)
- Test: `src/lib/db.test.ts` (bestaat; mock-server-stijl) — alleen als er al een markeerVerzonden-test is; anders dekt Task 9 de db via integratie.

- [ ] **Step 1: Schrijf de migratie**

Maak `supabase/schema-compleet-12-sms-notificaties.sql`:

```sql
-- KSV Demo (Kluslus) - Compleet systeem blok 12: SMS-notificatie-voorkeuren + herinnering-velden.
--
-- Twee SMS-voorkeuren per monteur (werk-kritiek, overig), beide standaard aan. Plus twee timestamps op
-- de opdracht: verzonden_at (wanneer naar de monteur verstuurd) en herinnering_verzonden_at (idempotentie
-- van de bevestig-herinnering). De SECURITY DEFINER functie krijgt de twee booleans erbij, zodat de
-- monteur ze via mijn-gegevens kan zetten zonder zijn rol te kunnen raken. Idempotent. Draai op test-DB
-- en productie.

alter table public.profielen add column if not exists sms_werk_kritiek boolean not null default true;
alter table public.profielen add column if not exists sms_overig boolean not null default true;

alter table public.meldingen add column if not exists verzonden_at timestamptz;
alter table public.meldingen add column if not exists herinnering_verzonden_at timestamptz;

drop function if exists public.update_eigen_gegevens(text, text, text, text);

create or replace function public.update_eigen_gegevens(
  p_naam text,
  p_bedrijfsnaam text,
  p_telefoon text,
  p_contact_email text,
  p_sms_werk_kritiek boolean,
  p_sms_overig boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profielen
  set naam = coalesce(nullif(btrim(p_naam), ''), naam),
      bedrijfsnaam = nullif(btrim(p_bedrijfsnaam), ''),
      telefoon = nullif(btrim(p_telefoon), ''),
      contact_email = nullif(btrim(p_contact_email), ''),
      sms_werk_kritiek = coalesce(p_sms_werk_kritiek, sms_werk_kritiek),
      sms_overig = coalesce(p_sms_overig, sms_overig)
  where id = auth.uid();
end;
$$;

grant execute on function public.update_eigen_gegevens(text, text, text, text, boolean, boolean) to authenticated;
```

- [ ] **Step 2: Draai de migratie tegen de test-DB**

Run: `npm run migrate:test -- supabase/schema-compleet-12-sms-notificaties.sql`
Expected: `OK: supabase/schema-compleet-12-sms-notificaties.sql gedraaid tegen de test-DB.`

(Productie blijft een bewuste handmatige stap in de Supabase SQL-editor, conform projectafspraak.)

- [ ] **Step 3: Breid Profiel en EigenGegevensInput uit in `src/lib/db.ts`**

In `interface Profiel` (na `contact_email: string | null;`):

```ts
  // blok 12: SMS-notificatie-voorkeuren (monteur regelt ze zelf in mijn-gegevens)
  sms_werk_kritiek: boolean;
  sms_overig: boolean;
```

In `interface EigenGegevensInput` (na `contact_email: string | null;`):

```ts
  sms_werk_kritiek: boolean;
  sms_overig: boolean;
```

- [ ] **Step 4: Pas `updateEigenGegevens` aan (db.ts ~861)**

```ts
    async updateEigenGegevens(input) {
      const { error } = await client.rpc("update_eigen_gegevens", {
        p_naam: input.naam,
        p_bedrijfsnaam: input.bedrijfsnaam,
        p_telefoon: input.telefoon,
        p_contact_email: input.contact_email,
        p_sms_werk_kritiek: input.sms_werk_kritiek,
        p_sms_overig: input.sms_overig,
      });
      if (error) throw new Error(`DB gegevens opslaan mislukt: ${error.message}`);
    },
```

- [ ] **Step 5: Zet `verzonden_at` en reset herinnering in `markeerVerzonden` (db.ts ~725)**

In het update-object van `markeerVerzonden`, na `verzonden_starttijd: verzonden.starttijd,`:

```ts
          verzonden_at: new Date().toISOString(),
          herinnering_verzonden_at: null,
```

- [ ] **Step 6: Voeg de twee nieuwe db-methoden toe**

Eerst in de `Db`-interface (bij de andere meldingen-methoden, na `markeerVerzonden(...)`):

```ts
  getKlussenVoorHerinnering(verzondenVoorIso: string): Promise<Melding[]>;
  markeerHerinneringVerzonden(ids: string[]): Promise<void>;
```

Dan de implementatie in `createDbFromClient` (bij de andere meldingen-acties, bijv. na `markeerVerzonden`):

```ts
    async getKlussenVoorHerinnering(verzondenVoorIso: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("dashboard_status", "gepland")
        .is("opdracht_id", null)
        .is("herinnering_verzonden_at", null)
        .not("toegewezen_aan", "is", null)
        .lt("verzonden_at", verzondenVoorIso)
        .order("verzonden_at", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async markeerHerinneringVerzonden(ids: string[]) {
      if (ids.length === 0) return;
      const { error } = await client
        .from("meldingen")
        .update({ herinnering_verzonden_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw new Error(`DB herinnering markeren mislukt: ${error.message}`);
    },
```

- [ ] **Step 7: Controleer dat het project nog typecheckt en de unit-suite groen blijft**

Run: `npm test`
Expected: PASS (geen nieuwe tests, maar de types moeten kloppen; bestaande `updateEigenGegevens`-aanroepen die nog twee booleans missen, vang je in Task 6 en 8 op. Als `npm test` faalt op die aanroepen, ga door; ze worden in die taken gedicht. Als je liever groen-tussendoor wilt: voeg in deze stap de twee booleans toe aan de bestaande aanroep in `src/app/api/mijn-gegevens/route.ts` met `false`-placeholders en corrigeer in Task 8.)

- [ ] **Step 8: Commit**

```bash
git add supabase/schema-compleet-12-sms-notificaties.sql src/lib/db.ts
git commit -m "feat(sms): datamodel en db-laag voor SMS-voorkeuren en herinnering"
```

---

## Task 2: Telefoonnummer-normalisatie (puur)

**Files:**
- Create: `src/lib/telefoon.ts`
- Test: `src/lib/telefoon.test.ts`

- [ ] **Step 1: Schrijf de falende test**

```ts
import { describe, it, expect } from "vitest";
import { normaliseerNlMobiel } from "./telefoon";

describe("normaliseerNlMobiel", () => {
  it("maakt van 06-nummers +31", () => {
    expect(normaliseerNlMobiel("06-12345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("0612345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("06 12 34 56 78")).toBe("+31612345678");
  });

  it("accepteert al-internationale invoer", () => {
    expect(normaliseerNlMobiel("+31612345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("0031612345678")).toBe("+31612345678");
  });

  it("weigert vaste nummers en onzin", () => {
    expect(normaliseerNlMobiel("071-1234567")).toBeNull(); // vast, geen 06
    expect(normaliseerNlMobiel("0612345")).toBeNull(); // te kort
    expect(normaliseerNlMobiel("hallo")).toBeNull();
    expect(normaliseerNlMobiel(null)).toBeNull();
    expect(normaliseerNlMobiel("")).toBeNull();
  });
});
```

- [ ] **Step 2: Draai de test, zie hem falen**

Run: `npx vitest run src/lib/telefoon.test.ts`
Expected: FAIL ("normaliseerNlMobiel is not defined" / module niet gevonden)

- [ ] **Step 3: Schrijf de minimale implementatie**

```ts
/**
 * Normaliseert een Nederlands mobiel nummer naar internationaal formaat (+316XXXXXXXX).
 * Geeft null terug als het geen geldig NL-mobiel is (vast nummer, te kort, onzin). Bewust streng:
 * een SMS naar een fout nummer kost geld en komt nooit aan.
 */
export function normaliseerNlMobiel(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s-]/g, "");
  if (s.startsWith("+31")) s = "0" + s.slice(3);
  else if (s.startsWith("0031")) s = "0" + s.slice(4);
  // NL-mobiel: 06 gevolgd door 8 cijfers.
  if (!/^06\d{8}$/.test(s)) return null;
  return "+31" + s.slice(1);
}
```

- [ ] **Step 4: Draai de test, zie hem slagen**

Run: `npx vitest run src/lib/telefoon.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/telefoon.ts src/lib/telefoon.test.ts
git commit -m "feat(sms): NL-mobiel normalisatie naar +31"
```

---

## Task 3: SMS-tekstbouwers (puur)

**Files:**
- Create: `src/lib/sms-teksten.ts`
- Test: `src/lib/sms-teksten.test.ts`

De bouwers hergebruiken het bestaande type `MailbareOpdracht` uit `monteur-mail.ts` en de datum-helper `formatDatumKort` uit `datum.ts`. Teksten blijven plat (geen accenten, geen euro-teken) en kort.

- [ ] **Step 1: Schrijf de falende test**

```ts
import { describe, it, expect } from "vitest";
import {
  nieuweOpdrachtenSmsTekst,
  annuleringSmsTekst,
  ontplanningSmsTekst,
  nieuwDocumentSmsTekst,
  herinneringSmsTekst,
} from "./sms-teksten";
import type { MailbareOpdracht } from "./monteur-mail";

function o(over: Partial<MailbareOpdracht> = {}): MailbareOpdracht {
  return {
    klant_naam: over.klant_naam ?? "Fam. Bakker",
    klant_adres: over.klant_adres ?? null,
    referentienummer: over.referentienummer ?? "7588",
    documenttype: over.documenttype ?? "orderbevestiging",
    startdatum: over.startdatum ?? "2026-06-10",
    starttijd: over.starttijd ?? null,
    duur_dagen: over.duur_dagen ?? 1,
    meldingen: over.meldingen ?? [],
    historie: over.historie,
  };
}

const APP = "ksv.app";

describe("nieuweOpdrachtenSmsTekst", () => {
  it("een klus: noemt klant, datum en app-link, onder 160 tekens, plat", () => {
    const t = nieuweOpdrachtenSmsTekst("Piet", [o({ klant_naam: "Fam. Bakker" })], APP);
    expect(t).toContain("Piet");
    expect(t).toContain("Fam. Bakker");
    expect(t).toContain("10 jun");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
    expect(t).not.toMatch(/[^\x00-\x7F]/); // alleen ASCII (geen accenten)
  });

  it("meerdere klussen: telt en verwijst naar de app", () => {
    const t = nieuweOpdrachtenSmsTekst("Piet", [o(), o()], APP);
    expect(t).toContain("2");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });
});

describe("losse meldingen", () => {
  it("annulering noemt klant en referentie", () => {
    const t = annuleringSmsTekst("Piet", "Fam. Bakker", "7588", APP);
    expect(t).toContain("geannuleerd");
    expect(t).toContain("Fam. Bakker");
    expect(t).toContain("7588");
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("ontplanning meldt dat de klus is weggehaald", () => {
    const t = ontplanningSmsTekst("Piet", "Fam. Bakker", "7588");
    expect(t).toContain("Fam. Bakker");
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("nieuw document verwijst naar de app", () => {
    const t = nieuwDocumentSmsTekst("Piet", "Fam. Bakker", "7588", APP);
    expect(t).toContain("document");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("herinnering bundelt klantnamen", () => {
    const t = herinneringSmsTekst("Piet", ["Fam. Bakker"], APP);
    expect(t).toContain("bevestig");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });
});
```

- [ ] **Step 2: Draai de test, zie hem falen**

Run: `npx vitest run src/lib/sms-teksten.test.ts`
Expected: FAIL (module niet gevonden)

- [ ] **Step 3: Schrijf de implementatie**

```ts
import { formatDatumKort } from "./datum";
import type { MailbareOpdracht } from "./monteur-mail";

/** App-link kort weergeven: zonder protocol, en leeg als er geen URL is geconfigureerd. */
function linkRegel(appUrl: string): string {
  const kaal = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return kaal ? `Check de app: ${kaal}` : "Check de app.";
}

function refDeel(ref: string | null): string {
  return ref ? ` (ref ${ref})` : "";
}

/**
 * SMS bij een verstuurronde, gebundeld per monteur. Een klus krijgt details, meerdere klussen een
 * telling. Plat en kort gehouden zodat het in een SMS-deel (160 tekens) past.
 */
export function nieuweOpdrachtenSmsTekst(
  monteurNaam: string,
  opdrachten: MailbareOpdracht[],
  appUrl: string,
): string {
  if (opdrachten.length === 1) {
    const o = opdrachten[0];
    const klant = o.klant_naam ?? "klant";
    const wanneer = o.startdatum
      ? o.starttijd
        ? `${formatDatumKort(o.startdatum)} ${o.starttijd.slice(0, 5)}`
        : formatDatumKort(o.startdatum)
      : "datum volgt";
    return `Hoi ${monteurNaam}, nieuwe klus: ${klant}${refDeel(o.referentienummer)}, ${wanneer}. ${linkRegel(appUrl)}`;
  }
  return `Hoi ${monteurNaam}, je hebt ${opdrachten.length} nieuwe of gewijzigde klussen. ${linkRegel(appUrl)}`;
}

export function annuleringSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  appUrl: string,
): string {
  return `Hoi ${monteurNaam}, klus ${klantNaam}${refDeel(referentienummer)} is geannuleerd. ${linkRegel(appUrl)}`;
}

export function ontplanningSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
): string {
  return `Hoi ${monteurNaam}, klus ${klantNaam}${refDeel(referentienummer)} is bij je weggehaald. Je hoeft er niet heen.`;
}

export function nieuwDocumentSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  appUrl: string,
): string {
  return `Hoi ${monteurNaam}, nieuw document bij klus ${klantNaam}${refDeel(referentienummer)}. ${linkRegel(appUrl)}`;
}

/** Bundelt openstaande bevestigingen in een herinnering. Bij veel klussen alleen een telling. */
export function herinneringSmsTekst(
  monteurNaam: string,
  klantNamen: string[],
  appUrl: string,
): string {
  const wat =
    klantNamen.length === 1
      ? `klus ${klantNamen[0]}`
      : `${klantNamen.length} klussen`;
  return `Hoi ${monteurNaam}, je hebt ${wat} nog niet bevestigd. Bevestig in de app: ${appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}
```

- [ ] **Step 4: Draai de test, zie hem slagen**

Run: `npx vitest run src/lib/sms-teksten.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sms-teksten.ts src/lib/sms-teksten.test.ts
git commit -m "feat(sms): pure tekstbouwers per gebeurtenis"
```

---

## Task 4: SMS-zender (CM.com) met dry-run en allowlist

**Files:**
- Create: `src/lib/sms.ts`
- Test: `src/lib/sms.test.ts`

CM.com Gateway-API: `POST https://gw.cm.com/v1.0/message`. Tijdens de bouw de exacte payload en foutrespons in de CM.com-docs verifieren; onderstaande is de gangbare vorm.

- [ ] **Step 1: Schrijf de falende test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verstuurSms } from "./sms";

describe("verstuurSms", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("CM_PRODUCT_TOKEN", "test-token");
    vi.stubEnv("SMS_DRY_RUN", "");
    vi.stubEnv("SMS_ALLOWLIST", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("post naar CM.com met token, afzender, nummer en tekst", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages.authentication.productToken).toBe("test-token");
    expect(body.messages.msg[0].from).toBe("KSV");
    expect(body.messages.msg[0].to[0].number).toBe("+31612345678");
    expect(body.messages.msg[0].body.content).toBe("hoi");
  });

  it("dry-run verstuurt niet echt", async () => {
    vi.stubEnv("SMS_DRY_RUN", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allowlist blokkeert nummers die er niet op staan", async () => {
    vi.stubEnv("SMS_ALLOWLIST", "+31600000000");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gooit bij een HTTP-fout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nee", { status: 500 })));
    await expect(
      verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" }),
    ).rejects.toThrow(/SMS versturen mislukt/);
  });

  it("gooit als het token ontbreekt", async () => {
    vi.stubEnv("CM_PRODUCT_TOKEN", "");
    await expect(
      verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" }),
    ).rejects.toThrow(/CM_PRODUCT_TOKEN/);
  });
});
```

- [ ] **Step 2: Draai de test, zie hem falen**

Run: `npx vitest run src/lib/sms.test.ts`
Expected: FAIL (module niet gevonden)

- [ ] **Step 3: Schrijf de implementatie**

```ts
const CM_URL = "https://gw.cm.com/v1.0/message";

export interface SmsInput {
  /** Ontvanger in internationaal formaat (+31...). */
  naar: string;
  /** Platte tekst, bij voorkeur onder 160 tekens. */
  tekst: string;
  /** Afzendernaam, max 11 tekens alfanumeriek (of een nummer). */
  afzender: string;
}

/**
 * Verstuurt een SMS via CM.com. Net als de mail (Resend) zit de provider expres achter een functie,
 * zodat een latere wissel alleen dit bestand raakt. Twee demo-vangnetten:
 *  - SMS_DRY_RUN=1 logt in plaats van echt te versturen.
 *  - SMS_ALLOWLIST (komma-lijst) staat alleen die nummers toe; al het andere wordt overgeslagen.
 */
export async function verstuurSms(input: SmsInput): Promise<void> {
  const token = process.env.CM_PRODUCT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "CM_PRODUCT_TOKEN ontbreekt. Vul hem in .env.local in (zie .env.example) en herstart de dev-server.",
    );
  }

  if (process.env.SMS_DRY_RUN?.trim() === "1") {
    console.log(`[SMS dry-run] naar ${input.naar} (${input.afzender}): ${input.tekst}`);
    return;
  }

  const allowlist = (process.env.SMS_ALLOWLIST ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(input.naar)) {
    console.log(`[SMS allowlist] ${input.naar} staat niet op de lijst, overgeslagen.`);
    return;
  }

  let res: Response;
  try {
    res = await fetch(CM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: {
          authentication: { productToken: token },
          msg: [
            {
              from: input.afzender,
              to: [{ number: input.naar }],
              body: { type: "auto", content: input.tekst },
            },
          ],
        },
      }),
    });
  } catch (err) {
    throw new Error(`SMS versturen mislukt: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`SMS versturen mislukt: HTTP ${res.status}`);
  }
}
```

- [ ] **Step 4: Draai de test, zie hem slagen**

Run: `npx vitest run src/lib/sms.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sms.ts src/lib/sms.test.ts
git commit -m "feat(sms): CM.com-zender met dry-run en allowlist"
```

---

## Task 5: Dispatcher (kanaalkeuze per gebeurtenis)

**Files:**
- Create: `src/lib/notificaties.ts`
- Test: `src/lib/notificaties.test.ts`

De dispatcher leest de monteur via `dbAdmin()` (service-role: werkt ook vanuit de cron en omzeilt RLS voor het lezen van een andere gebruiker), kiest de kanalen en vuurt ze best-effort af. `smsBestemming` is puur (krijgt het profiel mee) en is apart getest.

- [ ] **Step 1: Schrijf de falende test (puur deel + een dispatcher met mocks)**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./mail", () => ({
  verstuurAnnulering: vi.fn(async () => {}),
  verstuurOntplanning: vi.fn(async () => {}),
  verstuurMonteurMail: vi.fn(async () => {}),
}));
vi.mock("./sms", () => ({ verstuurSms: vi.fn(async () => {}) }));
vi.mock("./supabase-admin", () => ({ getGebruikerEmail: vi.fn(async () => "monteur@x.nl") }));
vi.mock("./db", () => ({
  dbAdmin: () => ({
    getProfiel: vi.fn(async () => ({
      telefoon: "06-12345678",
      sms_werk_kritiek: true,
      sms_overig: true,
    })),
  }),
}));

import { smsBestemming, notificeerAnnulering } from "./notificaties";
import { verstuurSms } from "./sms";
import { verstuurAnnulering } from "./mail";

describe("smsBestemming", () => {
  it("geeft +31-nummer als de categorie aanstaat en het nummer geldig is", () => {
    expect(
      smsBestemming({ telefoon: "06-12345678", sms_werk_kritiek: true, sms_overig: false }, "werk_kritiek"),
    ).toBe("+31612345678");
  });
  it("geeft null als de categorie uitstaat", () => {
    expect(
      smsBestemming({ telefoon: "06-12345678", sms_werk_kritiek: false, sms_overig: true }, "werk_kritiek"),
    ).toBeNull();
  });
  it("geeft null zonder geldig nummer", () => {
    expect(
      smsBestemming({ telefoon: null, sms_werk_kritiek: true, sms_overig: true }, "werk_kritiek"),
    ).toBeNull();
    expect(smsBestemming(null, "overig")).toBeNull();
  });
});

describe("notificeerAnnulering", () => {
  beforeEach(() => vi.clearAllMocks());
  it("mailt altijd en sms't als werk-kritiek aanstaat", async () => {
    const r = await notificeerAnnulering({
      toegewezenAan: "user-1",
      monteurNaam: "Piet",
      klantNaam: "Fam. Bakker",
      referentienummer: "7588",
      zaaknaam: "KSV",
    });
    expect(verstuurAnnulering).toHaveBeenCalledOnce();
    expect(verstuurSms).toHaveBeenCalledOnce();
    expect(r.gemaild).toBe(true);
    expect(r.gesmst).toBe(true);
  });
});
```

- [ ] **Step 2: Draai de test, zie hem falen**

Run: `npx vitest run src/lib/notificaties.test.ts`
Expected: FAIL (module niet gevonden)

- [ ] **Step 3: Schrijf de implementatie**

```ts
import { dbAdmin, type Profiel } from "./db";
import { getGebruikerEmail } from "./supabase-admin";
import { normaliseerNlMobiel } from "./telefoon";
import {
  verstuurAnnulering,
  verstuurOntplanning,
  verstuurMonteurMail,
} from "./mail";
import {
  annuleringSmsTekst,
  ontplanningSmsTekst,
  nieuweOpdrachtenSmsTekst,
  nieuwDocumentSmsTekst,
  herinneringSmsTekst,
} from "./sms-teksten";
import { verstuurSms } from "./sms";
import type { MailbareOpdracht } from "./monteur-mail";

export type SmsCategorie = "werk_kritiek" | "overig";

export interface NotificatieResultaat {
  gemaild: boolean;
  mailFout: string | null;
  gesmst: boolean;
  smsFout: string | null;
}

/** App-link voor in de SMS; leeg laten is prima, de tekstbouwer vangt dat op. */
function appUrl(): string {
  return process.env.APP_URL?.trim() ?? "";
}

/** Afzendernaam voor de SMS: de zaaknaam (max 11 tekens), met env-fallback. */
function smsAfzender(zaaknaam: string | null): string {
  const basis = (zaaknaam ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return basis || process.env.SMS_AFZENDER?.trim() || "KSV";
}

/**
 * Bepaalt het SMS-bestemmingsnummer voor een monteur, of null als er geen SMS hoort te gaan
 * (categorie uit, of geen geldig mobiel nummer). Puur: het profiel wordt meegegeven.
 */
export function smsBestemming(
  profiel: Pick<Profiel, "telefoon" | "sms_werk_kritiek" | "sms_overig"> | null,
  categorie: SmsCategorie,
): string | null {
  if (!profiel) return null;
  const aan = categorie === "werk_kritiek" ? profiel.sms_werk_kritiek : profiel.sms_overig;
  if (!aan) return null;
  return normaliseerNlMobiel(profiel.telefoon);
}

/** Mail + (optioneel) SMS, allebei best-effort. Verzamelt het resultaat per kanaal. */
async function vuurAf(
  toegewezenAan: string | null,
  categorie: SmsCategorie,
  zaaknaam: string | null,
  mailFn: (naar: string) => Promise<void>,
  smsTekst: string,
): Promise<NotificatieResultaat> {
  const r: NotificatieResultaat = { gemaild: false, mailFout: null, gesmst: false, smsFout: null };

  const email =
    (toegewezenAan ? await getGebruikerEmail(toegewezenAan) : null) ??
    process.env.RAPPORT_EMAIL?.trim() ??
    null;
  if (email) {
    try {
      await mailFn(email);
      r.gemaild = true;
    } catch (err) {
      r.mailFout = (err as Error).message;
    }
  }

  if (toegewezenAan) {
    const profiel = await dbAdmin().getProfiel(toegewezenAan);
    const nummer = smsBestemming(profiel, categorie);
    if (nummer) {
      try {
        await verstuurSms({ naar: nummer, tekst: smsTekst, afzender: smsAfzender(zaaknaam) });
        r.gesmst = true;
      } catch (err) {
        r.smsFout = (err as Error).message;
      }
    }
  }
  return r;
}

export function notificeerNieuweOpdrachten(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  opdrachten: MailbareOpdracht[];
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurMonteurMail({
        naar,
        monteurNaam: input.monteurNaam,
        opdrachten: input.opdrachten,
        zaaknaam: input.zaaknaam ?? undefined,
      }),
    nieuweOpdrachtenSmsTekst(input.monteurNaam, input.opdrachten, appUrl()),
  );
}

export function notificeerAnnulering(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurAnnulering({
        naar,
        monteurNaam: input.monteurNaam,
        klantNaam: input.klantNaam,
        referentienummer: input.referentienummer,
        organisatie: input.zaaknaam ?? undefined,
      }),
    annuleringSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer, appUrl()),
  );
}

export function notificeerOntplanning(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurOntplanning({
        naar,
        monteurNaam: input.monteurNaam,
        klantNaam: input.klantNaam,
        referentienummer: input.referentienummer,
        organisatie: input.zaaknaam ?? undefined,
      }),
    ontplanningSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer),
  );
}

export function notificeerNieuwDocument(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
  mailFn: (naar: string) => Promise<void>;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "overig",
    input.zaaknaam,
    input.mailFn,
    nieuwDocumentSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer, appUrl()),
  );
}

export function notificeerHerinnering(input: {
  toegewezenAan: string;
  monteurNaam: string;
  klantNamen: string[];
  zaaknaam: string | null;
  mailFn: (naar: string) => Promise<void>;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "overig",
    input.zaaknaam,
    input.mailFn,
    herinneringSmsTekst(input.monteurNaam, input.klantNamen, appUrl()),
  );
}
```

Let op: `notificeerNieuwDocument` en `notificeerHerinnering` krijgen hun mail-functie van de aanroeper. Reden: de mail voor die twee gebeurtenissen bestaat nog niet als aparte tekst in `mail.ts`. In Task 7 en 9 geef je een eenvoudige mail-thunk mee (of een no-op als je voor die gebeurtenis alleen SMS wilt, conform het open punt in het ontwerp). De werk-kritieke functies gebruiken de bestaande mail-functies rechtstreeks.

- [ ] **Step 4: Draai de test, zie hem slagen**

Run: `npx vitest run src/lib/notificaties.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/notificaties.ts src/lib/notificaties.test.ts
git commit -m "feat(sms): dispatcher die mail en SMS per gebeurtenis afvuurt"
```

---

## Task 6: Bestaande routes naar de dispatcher

**Files:**
- Modify: `src/app/api/dashboard/versturen/route.ts`
- Modify: `src/app/api/opdrachten/[id]/annuleren/route.ts`
- Modify: `src/app/api/opdrachten/[id]/ontplannen/route.ts`
- Test: de bestaande `route.test.ts` naast elk (aanpassen waar ze de mail-functie mockten)

- [ ] **Step 1: Pas de annuleer-route aan**

Vervang de import `import { verstuurAnnulering } from "@/lib/mail";` en `import { getGebruikerEmail } from "@/lib/supabase-admin";` door:

```ts
import { notificeerAnnulering } from "@/lib/notificaties";
```

Vervang het hele "Automatisch gevolg"-blok (de `let gemaild`/`mailFout` t/m de `if (wasVerstuurd ...)`) door:

```ts
  let gemaild = false;
  let mailFout: string | null = null;
  if (wasVerstuurd && opdracht.toegewezen_aan && opdracht.monteur_naam) {
    const r = await notificeerAnnulering({
      toegewezenAan: opdracht.toegewezen_aan,
      monteurNaam: opdracht.monteur_naam,
      klantNaam: opdracht.klant_naam ?? "de opdracht",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
    });
    gemaild = r.gemaild;
    mailFout = r.mailFout ?? r.smsFout;
  }
```

- [ ] **Step 2: Pas de ontplan-route aan (zelfde patroon)**

Vervang de imports door `import { notificeerOntplanning } from "@/lib/notificaties";` en vervang het gevolg-blok door:

```ts
  let gemaild = false;
  let mailFout: string | null = null;
  if (wasVerstuurd && toegewezenAan && monteurNaam) {
    const r = await notificeerOntplanning({
      toegewezenAan,
      monteurNaam,
      klantNaam: opdracht.klant_naam ?? "de opdracht",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
    });
    gemaild = r.gemaild;
    mailFout = r.mailFout ?? r.smsFout;
  }
```

- [ ] **Step 3: Pas de verstuur-route aan**

Vervang `import { verstuurMonteurMail } from "@/lib/mail";` en `import { getGebruikerEmail } from "@/lib/supabase-admin";` door:

```ts
import { notificeerNieuweOpdrachten } from "@/lib/notificaties";
```

Vervang de mail-lus (het `try { for (const eigen of perMonteur.values()) { ... } }`-blok) door:

```ts
  let mailWaarschuwing: string | null = null;
  for (const eigen of perMonteur.values()) {
    const eerste = eigen[0];
    const metHistorie = await Promise.all(
      eigen.map(async (o) => ({
        ...o,
        historie: o.referentienummer
          ? historieVoorMonteur(await dbi.zoekOpReferentie(o.referentienummer), o.id)
          : undefined,
      })),
    );
    const r = await notificeerNieuweOpdrachten({
      toegewezenAan: eerste.toegewezen_aan,
      monteurNaam: eerste.monteur_naam ?? "monteur",
      opdrachten: metHistorie,
      zaaknaam: eerste.keukenzaak,
    });
    if (!mailWaarschuwing && (r.mailFout || r.smsFout)) {
      mailWaarschuwing = r.mailFout ?? r.smsFout;
    }
  }
```

(De `fallback`-const en de losse `getGebruikerEmail`-aanroep verdwijnen; de dispatcher regelt de fallback-mail zelf.)

- [ ] **Step 4: Werk de route-tests bij**

Open `src/app/api/dashboard/versturen/route.test.ts`, `.../annuleren/route.test.ts`, `.../ontplannen/route.test.ts`. Waar ze nu `@/lib/mail` mockten, mock je nu ook (of in plaats daarvan) `@/lib/notificaties`. Voorbeeld voor de annuleer-test:

```ts
vi.mock("@/lib/notificaties", () => ({
  notificeerAnnulering: vi.fn(async () => ({ gemaild: true, mailFout: null, gesmst: true, smsFout: null })),
}));
```

Pas asserts die op `verstuurAnnulering`/`getGebruikerEmail` controleerden aan naar `notificeerAnnulering` (met de nieuwe argumentvorm: `toegewezenAan`, `monteurNaam`, `klantNaam`, `referentienummer`, `zaaknaam`).

- [ ] **Step 5: Draai de unit-suite**

Run: `npm test`
Expected: PASS (alle aangepaste route-tests groen)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard/versturen/route.ts src/app/api/opdrachten/[id]/annuleren/route.ts src/app/api/opdrachten/[id]/ontplannen/route.ts src/app/api/dashboard/versturen/route.test.ts src/app/api/opdrachten/[id]/annuleren/route.test.ts src/app/api/opdrachten/[id]/ontplannen/route.test.ts
git commit -m "refactor(sms): routes versturen/annuleren/ontplannen via de dispatcher"
```

---

## Task 7: Nieuw-document-trigger

**Files:**
- Modify: `src/app/api/opdrachten/[id]/documenten/route.ts`
- Test: `src/app/api/opdrachten/[id]/documenten/route.test.ts`

Alleen melden als de opdracht al verstuurd is (status `gepland` of `bevestigd`) en aan een monteur is toegewezen. Mail-thunk is voorlopig een no-op zodat we geen mailtekst hoeven te bouwen die nog niet bestaat; SMS gaat wel (categorie overig). Wil je later mail erbij, dan vul je de thunk in.

- [ ] **Step 1: Schrijf/breid de falende test**

In `documenten/route.test.ts`, voeg een test toe die mockt dat `notificeerNieuwDocument` wordt aangeroepen als de opdracht verstuurd is. Bovenaan:

```ts
vi.mock("@/lib/notificaties", () => ({
  notificeerNieuwDocument: vi.fn(async () => ({ gemaild: false, mailFout: null, gesmst: true, smsFout: null })),
}));
```

Test (na een geslaagde upload op een opdracht met `dashboard_status: "bevestigd"` en `toegewezen_aan: "u1"`):

```ts
import { notificeerNieuwDocument } from "@/lib/notificaties";
// ... in de test, na de POST:
expect(notificeerNieuwDocument).toHaveBeenCalledOnce();
```

En een tegentest: bij een opdracht met `dashboard_status: "binnen"` wordt `notificeerNieuwDocument` NIET aangeroepen.

- [ ] **Step 2: Draai de test, zie hem falen**

Run: `npx vitest run "src/app/api/opdrachten/[id]/documenten/route.test.ts"`
Expected: FAIL (notificeerNieuwDocument nog niet aangeroepen)

- [ ] **Step 3: Implementeer de trigger**

Voeg bovenaan toe: `import { notificeerNieuwDocument } from "@/lib/notificaties";`

Vlak voor de `return NextResponse.json({ documenten }, ...)`:

```ts
  // Was de opdracht al verstuurd, dan de monteur informeren (geen herbevestiging; datum/monteur blijven).
  const alVerstuurd =
    opdracht.dashboard_status === "gepland" || opdracht.dashboard_status === "bevestigd";
  if (alVerstuurd && opdracht.toegewezen_aan && opdracht.monteur_naam) {
    await notificeerNieuwDocument({
      toegewezenAan: opdracht.toegewezen_aan,
      monteurNaam: opdracht.monteur_naam,
      klantNaam: opdracht.klant_naam ?? "de opdracht",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
      mailFn: async () => {},
    });
  }
```

- [ ] **Step 4: Draai de test, zie hem slagen**

Run: `npx vitest run "src/app/api/opdrachten/[id]/documenten/route.test.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/opdrachten/[id]/documenten/route.ts" "src/app/api/opdrachten/[id]/documenten/route.test.ts"
git commit -m "feat(sms): melding aan monteur bij nieuw document op verstuurde klus"
```

---

## Task 8: Instellingen-scherm voor de monteur

**Files:**
- Modify: `src/app/api/mijn-gegevens/route.ts`
- Modify: `src/components/MijnGegevensForm.tsx`
- Modify: `src/app/mijn-gegevens/page.tsx`
- Test: `src/app/api/mijn-gegevens/route.test.ts` (bestaat) + e2e `e2e/sms-instellingen.spec.ts` (nieuw)

- [ ] **Step 1: Breid de mijn-gegevens-route uit**

In `src/app/api/mijn-gegevens/route.ts`, binnen de `updateEigenGegevens`-aanroep, twee booleans toevoegen. Voeg een helper toe en geef ze door:

```ts
  const boolOf = (v: unknown, val = true) => (typeof v === "boolean" ? v : val);
  // ...
    await dbi.updateEigenGegevens({
      naam: tekst(body.naam),
      bedrijfsnaam: tekst(body.bedrijfsnaam),
      telefoon: tekst(body.telefoon),
      contact_email: tekst(body.contact_email),
      sms_werk_kritiek: boolOf(body.sms_werk_kritiek),
      sms_overig: boolOf(body.sms_overig),
    });
```

- [ ] **Step 2: Werk de route-test bij**

In `src/app/api/mijn-gegevens/route.test.ts`: laat de mock van `updateEigenGegevens` de nieuwe velden accepteren en voeg een assert toe dat `sms_werk_kritiek`/`sms_overig` worden doorgegeven (default `true` als de body ze weglaat).

Run: `npx vitest run src/app/api/mijn-gegevens/route.test.ts`
Expected: PASS

- [ ] **Step 3: Breid het formulier uit (alleen tonen voor monteur)**

In `src/components/MijnGegevensForm.tsx`: voeg props `isMonteur: boolean`, `smsWerkKritiek: boolean`, `smsOverig: boolean` toe, breid de `velden`-state uit met `sms_werk_kritiek` en `sms_overig`, en stuur ze mee in de PATCH-body. Voeg onder het telefoon-veld een hint toe en, als `isMonteur`, een blok met twee schakelaars. Het nummer is geldig als `normaliseerNlMobiel` niet null geeft; anders schakelaars uitgrijzen.

Toe te voegen import en afgeleide:

```ts
import { normaliseerNlMobiel } from "@/lib/telefoon";
// in de component:
const nummerGeldig = normaliseerNlMobiel(velden.telefoon) !== null;
```

Onder het telefoon-`label` deze hint:

```tsx
        <span className="text-xs font-normal text-ink-muted">
          Dit nummer gebruiken we voor SMS-meldingen.
        </span>
```

En, alleen voor de monteur, na het contact-email-veld:

```tsx
      {isMonteur && (
        <fieldset className="flex flex-col gap-3 border-2 border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">SMS-meldingen</legend>
          {!nummerGeldig && (
            <p className="text-xs text-ink-muted">Vul je mobiele nummer in om SMS aan te zetten.</p>
          )}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Werk-kritiek
              <span className="block text-xs font-normal text-ink-muted">
                Nieuwe of gewijzigde klus, annulering, klus weggehaald.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={velden.sms_werk_kritiek}
              disabled={!nummerGeldig}
              onChange={(e) => zetBool("sms_werk_kritiek", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Herinneringen en overig
              <span className="block text-xs font-normal text-ink-muted">
                Bevestig-herinnering, nieuw document bij je klus.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={velden.sms_overig}
              disabled={!nummerGeldig}
              onChange={(e) => zetBool("sms_overig", e.target.checked)}
            />
          </label>
        </fieldset>
      )}
```

Voeg de helper `zetBool` toe naast `zet`:

```ts
  function zetBool(veld: "sms_werk_kritiek" | "sms_overig", waarde: boolean) {
    setVelden((v) => ({ ...v, [veld]: waarde }));
    setKlaar(false);
  }
```

En breid de begin-state uit:

```ts
  const [velden, setVelden] = useState({
    naam: naam ?? "",
    bedrijfsnaam: bedrijfsnaam ?? "",
    telefoon: telefoon ?? "",
    contact_email: contactEmail ?? "",
    sms_werk_kritiek: smsWerkKritiek,
    sms_overig: smsOverig,
  });
```

- [ ] **Step 4: Geef de props door vanuit de pagina**

In `src/app/mijn-gegevens/page.tsx`, in de `<MijnGegevensForm ... />`:

```tsx
        <MijnGegevensForm
          naam={profiel.naam}
          bedrijfsnaam={profiel.bedrijfsnaam}
          telefoon={profiel.telefoon}
          contactEmail={profiel.contact_email}
          isMonteur={isMonteur}
          smsWerkKritiek={profiel.sms_werk_kritiek}
          smsOverig={profiel.sms_overig}
        />
```

- [ ] **Step 5: Schrijf de e2e-test**

Maak `e2e/sms-instellingen.spec.ts`. Log in als de test-monteur (volg het patroon van een bestaande e2e die als monteur inlogt, bijv. in `e2e/`), ga naar `/mijn-gegevens`, en controleer:
- de twee schakelaars zijn zichtbaar voor de monteur;
- met een leeg/ongeldig nummer zijn ze `disabled`;
- na een geldig 06-nummer invullen zijn ze aan te vinken en blijft de keuze na opslaan + herladen bewaard.

Run: `npx playwright test e2e/sms-instellingen.spec.ts`
Expected: PASS

(Hapert het inloggen in e2e, kijk hoe bestaande specs `setup:test`-gebruikers en sessies opzetten; sluit daarop aan.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/mijn-gegevens/route.ts src/app/api/mijn-gegevens/route.test.ts src/components/MijnGegevensForm.tsx src/app/mijn-gegevens/page.tsx e2e/sms-instellingen.spec.ts
git commit -m "feat(sms): instellingen-scherm met twee SMS-schakelaars voor de monteur"
```

---

## Task 9: Bevestig-herinnering met Vercel Cron

**Files:**
- Create: `src/lib/herinnering.ts`
- Test: `src/lib/herinnering.test.ts`
- Create: `src/app/api/cron/bevestig-herinneringen/route.ts`
- Create: `vercel.json`
- Test (integratie): `integration/herinnering.int.test.ts`

- [ ] **Step 1: Schrijf de falende unit-test voor de cutoff**

```ts
import { describe, it, expect } from "vitest";
import { herinneringCutoff } from "./herinnering";

describe("herinneringCutoff", () => {
  it("trekt het aantal uren van nu af, als ISO", () => {
    const nu = new Date("2026-06-07T12:00:00.000Z");
    expect(herinneringCutoff(nu, 24)).toBe("2026-06-06T12:00:00.000Z");
  });
});
```

- [ ] **Step 2: Draai, zie falen**

Run: `npx vitest run src/lib/herinnering.test.ts`
Expected: FAIL (module niet gevonden)

- [ ] **Step 3: Implementeer de cutoff**

```ts
/**
 * Het kantelpunt voor de bevestig-herinnering: klussen die vóór dit moment zijn verstuurd en nog niet
 * bevestigd, krijgen een herinnering. Puur, zodat de cron-logica testbaar blijft.
 */
export function herinneringCutoff(nu: Date, uren: number): string {
  return new Date(nu.getTime() - uren * 60 * 60 * 1000).toISOString();
}
```

- [ ] **Step 4: Draai, zie slagen**

Run: `npx vitest run src/lib/herinnering.test.ts`
Expected: PASS

- [ ] **Step 5: Schrijf het cron-endpoint**

Maak `src/app/api/cron/bevestig-herinneringen/route.ts`:

```ts
import { NextResponse } from "next/server";
import { dbAdmin, type Melding } from "@/lib/db";
import { notificeerHerinnering } from "@/lib/notificaties";
import { herinneringCutoff } from "@/lib/herinnering";

export const dynamic = "force-dynamic";

/**
 * Cron-endpoint (Vercel Cron, GET): stuurt een bevestig-herinnering naar monteurs met klussen die langer
 * dan HERINNERING_NA_UUR geleden verstuurd zijn en nog niet bevestigd. Per monteur gebundeld, idempotent
 * via herinnering_verzonden_at. Beschermd met CRON_SECRET (Vercel stuurt 'Authorization: Bearer <secret>').
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
    }
  }

  const uren = Number(process.env.HERINNERING_NA_UUR?.trim() || "24");
  const cutoff = herinneringCutoff(new Date(), uren);

  const dbi = dbAdmin();
  const klussen = await dbi.getKlussenVoorHerinnering(cutoff);

  // Bundel per monteur (toegewezen_aan).
  const perMonteur = new Map<string, Melding[]>();
  for (const k of klussen) {
    const sleutel = k.toegewezen_aan;
    if (!sleutel) continue;
    (perMonteur.get(sleutel) ?? perMonteur.set(sleutel, []).get(sleutel)!).push(k);
  }

  const verstuurdeIds: string[] = [];
  for (const [toegewezenAan, eigen] of perMonteur.entries()) {
    const eerste = eigen[0];
    await notificeerHerinnering({
      toegewezenAan,
      monteurNaam: eerste.monteur_naam ?? "monteur",
      klantNamen: eigen.map((k) => k.klant_naam ?? "een klus"),
      zaaknaam: eerste.keukenzaak,
      mailFn: async () => {},
    });
    verstuurdeIds.push(...eigen.map((k) => k.id));
  }
  await dbi.markeerHerinneringVerzonden(verstuurdeIds);

  return NextResponse.json({ ok: true, monteurs: perMonteur.size, klussen: verstuurdeIds.length });
}
```

- [ ] **Step 6: Maak `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/bevestig-herinneringen", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 7: Schrijf de integratietest (idempotentie)**

Maak `integration/herinnering.int.test.ts`, in de stijl van `integration/scenario.int.test.ts`. Met de service-role `dbAdmin()`:
1. Maak een opdracht aan, plan hem op een test-monteur, en zet hem op `gepland` met `verzonden_at` ruim in het verleden (gebruik `markeerVerzonden` en zet daarna `verzonden_at` desnoods handmatig terug via een directe update of een ruime cutoff).
2. `getKlussenVoorHerinnering(cutoff)` levert de klus.
3. `markeerHerinneringVerzonden([id])`.
4. `getKlussenVoorHerinnering(cutoff)` levert de klus NIET meer (idempotent).
5. Opruimen (verwijder de testopdracht), zoals de bestaande integratietest dat doet.

Run: `npm run test:int`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/herinnering.ts src/lib/herinnering.test.ts "src/app/api/cron/bevestig-herinneringen/route.ts" vercel.json integration/herinnering.int.test.ts
git commit -m "feat(sms): bevestig-herinnering via Vercel Cron, idempotent"
```

---

## Task 10: Env-documentatie en toestandsmatrix

**Files:**
- Modify: `.env.example`
- Modify: `TOESTANDEN.md`

- [ ] **Step 1: Vul `.env.example` aan**

Voeg onderaan toe:

```
# ===== CM.com (SMS-notificaties) =====
# Product-token van CM.com (Gateway / Business Messaging). ALLEEN server-side.
CM_PRODUCT_TOKEN=
# Afzendernaam, max 11 tekens alfanumeriek. Fallback als de zaaknaam ontbreekt.
SMS_AFZENDER=KSV
# Demo-vangnet: "1" logt SMS in plaats van echt te versturen. Zet op 0 om echt te versturen.
SMS_DRY_RUN=1
# Optioneel: komma-lijst van +31-nummers waarnaar wel verzonden mag worden (demo).
SMS_ALLOWLIST=
# Basis-URL van de app, gebruikt in de SMS-link. Bijv. https://ksv.kluslus.nl
APP_URL=
# ===== Bevestig-herinnering (Vercel Cron) =====
# Geheim waarmee het cron-endpoint zich identificeert (Vercel Cron stuurt 'Authorization: Bearer <secret>').
CRON_SECRET=
# Na hoeveel uur zonder bevestiging een herinnering volgt.
HERINNERING_NA_UUR=24
```

- [ ] **Step 2: Werk de toestandsmatrix bij**

In `TOESTANDEN.md`, kolom "Bericht/notificatie": waar nu "mail naar monteur" staat, vul aan met "+ SMS (werk-kritiek)". Voeg twee notities/rijen toe:
- nieuw document na versturen: "mail/badge + SMS (overig)";
- bevestiging blijft uit: "automatische herinnering (mail + SMS overig) via cron na HERINNERING_NA_UUR".

Pas ook de datumregel "Laatst bijgewerkt" bovenaan aan naar vandaag.

- [ ] **Step 3: Volledige suite draaien**

Run: `npm test`
Expected: PASS
Run: `npm run test:int`
Expected: PASS

(De e2e draait via de pre-push-hook bij het pushen; push niet halverwege af i.v.m. de poort-3001-valkuil, zie het logboek.)

- [ ] **Step 4: Commit**

```bash
git add .env.example TOESTANDEN.md
git commit -m "docs(sms): env-sleutels en toestandsmatrix bijgewerkt"
```

---

## Zelf-review (na het schrijven, voor uitvoering)

- **Dekking:** elke ontwerp-sectie heeft een taak (kanaal-zender T4, tekstbouwers T3, dispatcher T5, datamodel T1, instellingen T8, nieuw-document T7, herinnering+scheduler T9, toestandsmatrix T10, testen verspreid). 
- **Open punt uit het ontwerp:** nieuw-document en herinnering gaan nu als SMS met een no-op mail-thunk. Wil je ze ook per mail, dan vul je de thunk in T7/T9 met een echte mailtekst (kleine uitbreiding, los te doen).
- **Volgorde-afhankelijkheid:** T1 levert de types die T5, T8 en T9 gebruiken. Houd de volgorde aan.
- **Vooraf (Reinier):** CM.com-account + product-token aanmaken; `CM_PRODUCT_TOKEN` in `.env.local`, en `SMS_DRY_RUN=0` zodra je echt wilt versturen. Voor de demo eerst `SMS_DRY_RUN=1` of `SMS_ALLOWLIST` met je eigen nummer, zodat nep-monteurs nooit echt ge-sms't worden.
