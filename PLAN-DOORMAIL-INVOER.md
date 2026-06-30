# Doormailen robuust — Implementatieplan

> **Voor de bouwer:** test-first per taak (Vitest unit / `*.int.test.ts` integratie / Playwright e2e).
> Werk `TESTDEKKING.md` en `TOESTANDEN.md` bij in de relevante commit. Volg de werkwijze in
> `CLAUDE.md`: branch → `omgeving-test` → keuring Reinier → master. Niet zelf naar master mergen.

**Doel:** doormailen de wrijvingsloze hoofd-invoerweg maken: (1) bij een vermoeden van meerdere
opdrachten in één mail één voorstel met waarschuwing + één-tik-splitsen; (2) het inbound-adres
kopieerbaar in het klus-toevoegen-venster.

**Architectuur:** detectie draait in de inbound-route bij binnenkomst (gratis heuristiek op
PDF-koppen + lichte LLM-beoordeling van de mailtekst). Bij vermoeden bewaart de route de
voorgestelde splitsing in een nieuwe jsonb-kolom en zet een waarschuwingsvlag, zonder uit te
splitsen. Een splits-API maakt op verzoek de losse klussen. De UI hergebruikt bestaande patronen
(`InboxItem`, `KopieerKnop`, het adres-patroon uit `mijn-gegevens`).

**Tech stack:** Next.js 16 App Router, Supabase (service-role `dbAdmin()`), Anthropic SDK
(`@anthropic-ai/sdk`), Vitest, Playwright, Tailwind v4.

---

## Bestandsoverzicht

**Nieuw:**
- `supabase/schema-compleet-30-controleer-splitsing.sql` — migratie (KLAAR).
- `src/lib/splits-detectie.ts` — pure heuristiek op PDF-koppen + het `SplitsVoorstel`-type.
- `src/lib/splits-detectie.test.ts` — unit.
- `src/app/api/inbound/[id]/splitsen/route.ts` — splits-API.
- `src/components/SplitsWaarschuwing.tsx` — gele band + knoppen "Splits" / "Bevestig als één".
- `integration/splitsen.int.test.ts` — integratie.
- `e2e/splits-voorstel.spec.ts` — e2e.

**Wijzigen:**
- `src/lib/db.ts` — types + 3 db-functies.
- `src/lib/claude-client.ts` — `beoordeelMeerdereOpdrachten`.
- `src/app/api/inbound/route.ts` — detectie inhaken, splits_voorstel bewaren.
- `src/app/api/inbound/[id]/bevestigen/route.ts` — vlag mee wissen.
- `src/components/InboxItem.tsx` — waarschuwing + splits-knop tonen.
- `src/components/KlusInvoer.tsx` — adres-blok (variant A).
- `src/app/page.tsx`, `src/app/dashboard/page.tsx` — `inboundAdres`-prop doorgeven.
- `TESTDEKKING.md`, `TOESTANDEN.md`.

---

## Fase 0 — Datamodel

### Taak 1: Migratie (KLAAR)

**Files:** Create `supabase/schema-compleet-30-controleer-splitsing.sql` (al geschreven:
`controleer_splitsing boolean default false`, `controleer_splitsing_reden text`,
`splits_voorstel jsonb`, partial index).

- [ ] **Stap 1:** draai tegen test + demo: `npm run migrate:test -- supabase/schema-compleet-30-controleer-splitsing.sql`. Verwacht: 3 kolommen + index toegevoegd, idempotent.
- [ ] **Stap 2:** noteer in het logboek dat de productie-migratie nog door Reinier handmatig gedraaid moet worden (vóór merge naar master).

### Taak 2: db-types en -functies

**Files:** Modify `src/lib/db.ts`. Test: `src/lib/db.test.ts` (als die bestaat; anders de mapping dekken via de integratietest in Taak 9).

- [ ] **Stap 1:** voeg aan `OpdrachtInput` toe:
```ts
  controleer_splitsing?: boolean;
  controleer_splitsing_reden?: string | null;
  splits_voorstel?: SplitsVoorstel | null;   // import uit "@/lib/splits-detectie"
```
en aan de `Melding`-interface:
```ts
  controleer_splitsing: boolean;
  controleer_splitsing_reden: string | null;
  splits_voorstel: SplitsVoorstel | null;
```

- [ ] **Stap 2:** in `createOpdracht` de insert-mapping uitbreiden met de drie kolommen (default `false`/`null`), analoog aan hoe `adres_keuze_nodig`/`adres_kandidaten` gemapt worden.

- [ ] **Stap 3:** voeg drie functies toe aan de `Db`-interface + implementatie (admin-variant):
```ts
// Bewaart de voorgestelde splitsing + reden en zet de waarschuwingsvlag aan.
bewaarSplitsVoorstel(id: string, reden: string, voorstel: SplitsVoorstel): Promise<void>;
//   .update({ controleer_splitsing: true, controleer_splitsing_reden: reden, splits_voorstel: voorstel }).eq("id", id)

// "Bevestig als één" / gecontroleerd: wist alleen de splits-waarschuwing.
wisSplitsWaarschuwing(id: string): Promise<void>;
//   .update({ controleer_splitsing: false, controleer_splitsing_reden: null, splits_voorstel: null }).eq("id", id)

// Verplaatst een document naar een andere opdracht (bestaat nog niet).
verplaatsDocument(documentId: string, naarOpdrachtId: string): Promise<void>;
//   .from("documenten").update({ opdracht_id: naarOpdrachtId }).eq("id", documentId)
```

- [ ] **Stap 4:** commit. `git add src/lib/db.ts supabase/... && git commit -m "feat(db): velden + functies voor splits-waarschuwing"`

---

## Fase 1 — Feature 2: adres in het invoer-venster (variant A)

Klein en los; eerst, zodat er snel iets toonbaars is.

### Taak 3: `inboundAdres`-prop op KlusInvoer

**Files:** Modify `src/components/KlusInvoer.tsx`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`.

- [ ] **Stap 1:** breid de props uit:
```tsx
export function KlusInvoer({ context = "monteur", inboundAdres = null }:
  { context?: "monteur" | "kantoor"; inboundAdres?: string | null })
```

- [ ] **Stap 2:** in `src/app/page.tsx` boven de render het adres ophalen en meegeven:
```tsx
import { inboundAdres } from "@/lib/inbound";
const inboundAdresStr = inboundAdres(await dbAdmin().ensureInboundToken(profiel.id));
// ...
<KlusInvoer context="monteur" inboundAdres={inboundAdresStr} />
```
(`dbAdmin` is al beschikbaar of importeren uit `@/lib/db`.)

- [ ] **Stap 3:** idem in `src/app/dashboard/page.tsx` met `context="kantoor"`.

- [ ] **Stap 4:** commit.

### Taak 4: adres-blok renderen (variant A)

**Files:** Modify `src/components/KlusInvoer.tsx`. Test: `e2e/mail-opdracht.spec.ts` (uitbreiden) of nieuw `e2e/adres-in-invoer.spec.ts`.

- [ ] **Stap 1 (e2e eerst):** test: open de kluspool als monteur, klik "Klus toevoegen", verwacht zichtbaar het inbound-adres (`klus-...@`) en een knop met tekst "Kopieer".

- [ ] **Stap 2:** voeg in de geopende form, direct ná de `div.flex.gap-2` met "Bestand kiezen"/"Order fotograferen" (rond regel 426), dit blok toe (alleen tonen als `inboundAdres`):
```tsx
{inboundAdres && (
  <div className="border-2 border-dashed border-line bg-surface p-3">
    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
      <Mail size={18} strokeWidth={2.5} aria-hidden="true" />
      Of mail de opdracht door
    </p>
    <p className="mt-1.5 text-xs text-ink-muted">
      Stuur een opdracht naar dit adres, dan staat de klus vanzelf in je kluspool.
    </p>
    <div className="mt-2 flex items-stretch gap-2">
      <span className="min-w-0 flex-1 select-all truncate border border-ink bg-white px-2.5 py-2 font-mono text-sm font-bold text-ink">
        {inboundAdres}
      </span>
      <KopieerKnop tekst={inboundAdres} />
    </div>
  </div>
)}
```
Importeer `Mail` uit `lucide-react` en `KopieerKnop` uit `@/components/KopieerKnop`.

- [ ] **Stap 2b:** controleer dat `Mail` aan de bestaande lucide-import wordt toegevoegd (regels 5-16).
- [ ] **Stap 3:** e2e draaien, verwacht groen. Commit.

---

## Fase 2 — Detectie

### Taak 5: type + heuristiek op PDF-koppen

**Files:** Create `src/lib/splits-detectie.ts`, `src/lib/splits-detectie.test.ts`.

Het `SplitsVoorstel`-type (gedeeld door db, route en API):
```ts
import type { OpdrachtInput } from "@/lib/db";

export interface SplitsDeel {
  velden: Partial<OpdrachtInput>;   // kop van deze klus (klant_naam, klant_adres, referentienummer, werkomschrijving, ...)
  document_ids: string[];           // documenten die bij dit deel horen (leeg bij body-only)
}
export type SplitsVoorstel = SplitsDeel[];
```

Heuristiek (PDF-flow): gegeven de geparste koppen van één samengevoegde groep, bepaal of er
meerdere klanten in zitten met `naamKern` uit `@/lib/order-groep`.
```ts
import { naamKern } from "@/lib/order-groep";

export interface KopMetIndex { klant_naam: string | null; klant_adres: string | null; referentienummer: string | null; pdfIndex: number; }

/** True + groepering als er 2+ verschillende klant-kernen in de samengevoegde groep zitten. */
export function detecteerMeerdereKlanten(koppen: KopMetIndex[]):
  { vermoeden: boolean; reden: string; groepen: KopMetIndex[][] } {
  const kernVan = (k: KopMetIndex) => naamKern(k.klant_naam) ?? k.klant_adres ?? null;
  const kernen = [...new Set(koppen.map(kernVan).filter(Boolean))];
  if (kernen.length < 2) return { vermoeden: false, reden: "", groepen: [koppen] };
  const groepen = kernen.map((kern) => koppen.filter((k) => kernVan(k) === kern));
  return {
    vermoeden: true,
    reden: `De mail bevat ${kernen.length} verschillende klanten (${kernen.join(", ")}).`,
    groepen,
  };
}
```

- [ ] **Stap 1:** test schrijven: twee koppen "Jansen" + "De Vries" → `vermoeden true`, 2 groepen; twee koppen "T van Bavel" + "De familie T van Bavel" → `vermoeden false` (zelfde kern); één kop → false.
- [ ] **Stap 2:** `npx vitest run src/lib/splits-detectie.test.ts` → FAIL.
- [ ] **Stap 3:** implementeer zoals hierboven.
- [ ] **Stap 4:** test → PASS. Commit.

### Taak 6: body-LLM-beoordeling

**Files:** Modify `src/lib/claude-client.ts`. Test: `src/lib/claude-client.test.ts` (Anthropic gemockt).

Nieuwe functie naast `parseOrderWithClaude`, tekst-only, eigen geforceerde tool:
```ts
export interface MeerdereOpdrachtenOordeel {
  meerdere: boolean;
  reden: string;
  delen: Array<{ klant_naam: string | null; klant_adres: string | null; referentienummer: string | null; werkomschrijving: string | null }>;
}

const TELLER_TOOL = "beoordeel_opdrachten";
const TELLER_SCHEMA = { /* JSON-schema: meerdere(bool), reden(string), delen(array van de 4 velden) */ };

export async function beoordeelMeerdereOpdrachten(
  mailtekst: string,
  bekendeKoppen: Array<{ klant_naam: string | null; referentienummer: string | null }>,
): Promise<MeerdereOpdrachtenOordeel> {
  // client.messages.create met model env().ANTHROPIC_MODEL, max_tokens 1024,
  // system: "Je bepaalt of een doorgestuurde mail één of meerdere afzonderlijke keuken-opdrachten bevat.
  //          Bij twijfel: meerdere=true. Geef per opdracht een kort kop-record terug.",
  // tools: [{ name: TELLER_TOOL, input_schema: TELLER_SCHEMA }], tool_choice geforceerd,
  // messages: [{ role: "user", content: <mailtekst + bekendeKoppen samengevat> }]
  // → tool_use-block parsen naar MeerdereOpdrachtenOordeel.
}
```

- [ ] **Stap 1:** test: mock `client.messages.create` zodat het een tool_use met `{meerdere:true, reden, delen:[...]}` teruggeeft; verwacht dat de functie dat netjes parset. Tweede test: `meerdere:false` → lege `delen`.
- [ ] **Stap 2:** vitest → FAIL.
- [ ] **Stap 3:** implementeer (volg het patroon van `createParser`: gecachte client, `buildOrderContent` niet nodig, puur tekst-content).
- [ ] **Stap 4:** vitest → PASS. Commit.

---

## Fase 3 — Inbound-route koppelt detectie aan opslag

### Taak 7: detectie + splits_voorstel bewaren in de inbound-route

**Files:** Modify `src/app/api/inbound/route.ts`. Test: `src/app/api/inbound/route.test.ts` (bestaande unit-test uitbreiden, db + Anthropic gemockt).

Logica (na de bestaande `groepeerInboundOrder`-stap, regels 237-259):
- **PDF-flow, 1 groep, 2+ PDF's met inhoud:** draai `detecteerMeerdereKlanten` op de koppen. Bij
  `vermoeden`: maak het ene voorstel zoals nu (alle PDF's eraan), maar bouw daarná een
  `SplitsVoorstel` uit `groepen` (per groep: `velden` van de beste kop + `document_ids` van de
  document-rijen die bij die PDF-indexen horen) en roep `bewaarSplitsVoorstel(opdrachtId, reden, voorstel)` aan.
- **Geen PDF (regels 260-269)** of **PDF-flow zonder klant-verschil maar met substantiële body:**
  roep `beoordeelMeerdereOpdrachten(mailtekst, koppen)` aan. Bij `meerdere`: bouw `SplitsVoorstel`
  uit `oordeel.delen` (`velden` = de kop, `document_ids` = []) en `bewaarSplitsVoorstel(...)`.
- **2+ refs (huidige echte splitsing):** ongewijzigd, geen waarschuwing.

Belangrijk: `bewaarSplitsVoorstel` pas ná `createOpdracht` + `bewaarBijlage` (document-id's nodig).
`bewaarBijlage` geeft nu niets terug; pas aan zodat het de aangemaakte `document.id` teruggeeft, zodat
de route weet welke document-id bij welke PDF-index hoort.

- [ ] **Stap 1:** test: simuleer een inbound met 2 PDF's, parse-mock geeft "Jansen" en "De Vries" met dezelfde/geen ref → verwacht dat er één voorstel ontstaat met `controleer_splitsing=true` en een `splits_voorstel` met 2 delen.
- [ ] **Stap 2:** tweede test: 1 PDF "Jansen", geen body → `controleer_splitsing=false`.
- [ ] **Stap 3:** derde test: geen PDF, body-mock `beoordeelMeerdereOpdrachten` → `meerdere:true, 2 delen` → `controleer_splitsing=true`.
- [ ] **Stap 4:** `bewaarBijlage` retourneert `{ id }`; route verzamelt `documentIdPerPdfIndex`.
- [ ] **Stap 5:** implementeer de detectie-vertakking.
- [ ] **Stap 6:** vitest → PASS. Commit.

---

## Fase 4 — Splitsen en bevestigen

### Taak 8: splits-API

**Files:** Create `src/app/api/inbound/[id]/splitsen/route.ts`. Test: `integration/splitsen.int.test.ts`.

`POST(_req, { params: Promise<{id}> })`, autorisatie identiek aan `bevestigen/route.ts`
(monteur eigenaar of beheerder; anders 403). Daarna met `dbAdmin()`:
```ts
const melding = await db().getMeldingById(id);
const voorstel = melding.splits_voorstel;          // SplitsVoorstel; leeg/null → 400
const adm = dbAdmin();
for (const deel of voorstel) {
  const { id: nieuwId } = await adm.createOpdracht({
    ...deel.velden,
    user_id: melding.user_id,
    toegewezen_aan: melding.toegewezen_aan,
    opdrachtgever_id: melding.opdrachtgever_id,
    te_verwerken: melding.te_verwerken,            // monteur-voorstel blijft voorstel; kantoor-klus blijft klus
    controleer_splitsing: false,
  });
  for (const docId of deel.document_ids) await adm.verplaatsDocument(docId, nieuwId);
}
await adm.verwijderOpdracht(id);                    // origineel soft-deleten (documenten zijn verplaatst)
return NextResponse.json({ ok: true, aantal: voorstel.length });
```

- [ ] **Stap 1:** integratietest: seed een melding met `splits_voorstel` (2 delen, elk met een echt document) → POST splitsen → verwacht 2 nieuwe meldingen met de juiste koppen, documenten bij het juiste deel, origineel `verwijderd_at` gezet.
- [ ] **Stap 2:** `npm run test:int -- splitsen` → FAIL.
- [ ] **Stap 3:** implementeer de route.
- [ ] **Stap 4:** test → PASS. Commit.

### Taak 9: bevestigen wist de waarschuwing

**Files:** Modify `src/app/api/inbound/[id]/bevestigen/route.ts`.

- [ ] **Stap 1:** test (in `route.test.ts` van bevestigen of integratie): een voorstel met `controleer_splitsing=true` bevestigen → daarna `te_verwerken=false` én `controleer_splitsing=false`.
- [ ] **Stap 2:** na `markeerVerwerkt(id)` toevoegen: `await dbAdmin().wisSplitsWaarschuwing(id);`
- [ ] **Stap 3:** test → PASS. Commit.

---

## Fase 5 — UI

### Taak 10: SplitsWaarschuwing-component + InboxItem

**Files:** Create `src/components/SplitsWaarschuwing.tsx`; Modify `src/components/InboxItem.tsx`,
`src/app/inbox/page.tsx` (de twee nieuwe velden doorgeven aan `InboxItem`).

`SplitsWaarschuwing` (client): gele band (urgent-geel, zwarte tekst, `TriangleAlert`-icoon) met de
reden, plus knoppen "Splits in aparte klussen" (POST `/api/inbound/[id]/splitsen`) en "Bevestig als
één" (POST `/api/inbound/[id]/bevestigen`), beide met `router.refresh()` na succes. Stijl = exact de
knop-stijl uit `InboxItem` (border-2, accent voor de hoofdactie).

- [ ] **Stap 1 (e2e eerst, zie Taak 12):** sla over hier; unit-rendering optioneel.
- [ ] **Stap 2:** `inbox/page.tsx`: geef `controleerSplitsing={v.controleer_splitsing}` en
  `splitsReden={v.controleer_splitsing_reden}` mee aan `InboxItem`.
- [ ] **Stap 3:** `InboxItem`: props uitbreiden; als `controleerSplitsing`, render `<SplitsWaarschuwing id reden />` bovenaan de kaart (boven de bestaande Bevestigen/weggooien-rij). Bij splitsen/bevestigen via het component verdwijnt de kaart na refresh.
- [ ] **Stap 4:** commit.

### Taak 11: kantoor — waarschuwing op het dashboard/detail

**Files:** Modify de dashboard-kluskaart of de klusdetailpagina (`src/app/opdracht/[id]/...`) waar een
kantoor-klus getoond wordt. Toon dezelfde `SplitsWaarschuwing` als `controleer_splitsing` true is.

- [ ] **Stap 1:** lokaliseer de component die een dashboard-klus/detail rendert; geef de twee velden door.
- [ ] **Stap 2:** render `SplitsWaarschuwing` (id, reden) als de vlag aan staat.
- [ ] **Stap 3:** commit.

---

## Fase 6 — End-to-end + administratie

### Taak 12: e2e splits-voorstel

**Files:** Create `e2e/splits-voorstel.spec.ts` (volg `e2e/inbox.spec.ts` + `e2e/mail-opdracht.spec.ts`).

- [ ] **Stap 1:** seed (via de test-helper) een monteur-voorstel met `controleer_splitsing=true` +
  `splits_voorstel` van 2 delen. Open `/inbox`, verwacht de gele band + de tekst van de reden.
- [ ] **Stap 2:** klik "Splits in aparte klussen" → verwacht 2 losse voorstellen in de inbox.
- [ ] **Stap 3:** tweede scenario: zelfde seed, klik "Bevestig als één" → verwacht 1 klus in de kluspool, geen band meer.
- [ ] **Stap 4:** `npm run test:e2e -- splits-voorstel` → groen. Commit.

### Taak 13: TESTDEKKING + TOESTANDEN

**Files:** Modify `TESTDEKKING.md`, `TOESTANDEN.md`.

- [ ] **Stap 1:** `TOESTANDEN.md`: neem de toestandsmatrix uit `DESIGN-DOORMAIL-INVOER.md` over
  (te_verwerken × controleer_splitsing × splits_voorstel).
- [ ] **Stap 2:** `TESTDEKKING.md`: noteer de nieuwe unit/integratie/e2e-dekking.
- [ ] **Stap 3:** commit.

---

## Afronding (handmatig, met Reinier)

- [ ] Volledige suite groen: `npm run test:all`. `rm -rf .next` vóór push (validator-cache).
- [ ] Branch pushen, PR openen; wachten op groene cloud-CI.
- [ ] Feature naar `omgeving-test` brengen; Reinier draait migratie 30 op de TEST-DB (al via
  `migrate:test`) — productie-migratie 30 draait Reinier handmatig vlak vóór de master-merge.
- [ ] **STOP-poort:** Reinier keurt op `kluslus-test` (beide rollen, echte mail doorsturen met 2
  opdrachten). Pas na zijn expliciete "ga maar" → merge naar master.
- [ ] Na merge: hoofdmap naar master bijwerken, logboek schrijven in `07_logboek/`.

---

## Zelf-review (gedaan)

- **Spec-dekking:** feature 1 (detectie heuristiek T5 + body-LLM T6 → route T7 → splits-API T8 →
  UI T10/T11), feature 2 (T3/T4), datamodel (T1/T2), tests 4 lagen (T5/T6 unit, T8 int, T12 e2e),
  TOESTANDEN/TESTDEKKING (T13). Alle spec-secties hebben een taak.
- **Types consistent:** `SplitsVoorstel`/`SplitsDeel` gedefinieerd in T5, gebruikt in T2/T7/T8.
  `bewaarSplitsVoorstel`/`wisSplitsWaarschuwing`/`verplaatsDocument` in T2 gedefinieerd, in T7/T8/T9
  gebruikt. `controleer_splitsing(_reden)` consistent overal.
- **Open punt voor de bouw:** de exacte prompt/JSON-schema van `beoordeelMeerdereOpdrachten` (T6)
  en de drempel "substantiële body" (T7) afstellen met echte voorbeeldmails tijdens de bouw.
