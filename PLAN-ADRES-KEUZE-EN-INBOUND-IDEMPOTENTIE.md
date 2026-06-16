# Plan: adres-keuze bij meerdere adressen + inbound-idempotentie

Twee items uit de testronde van 16-06-2026 (zie `_ksv-testronde-2026-06-16/`).
Branch: `feature/adres-keuze-en-inbound-idempotentie`.

## Item 1 — Adres-keuze bij meerdere adressen op een PDF

**Probleem:** een order-PDF kan twee adressen bevatten (montagelocatie én
opdrachtgever/bouwbedrijf). De parser pakt er blind één, soms de verkeerde →
monteur rijdt naar het verkeerde adres. Groot risico.

**Keuze (vastgelegd):** bij 2+ adressen kiest een mens bewust, niets
voorgeselecteerd. Monteur kiest bij zelfinvoer; planner kiest op het dashboard.
Bij één adres verandert er niets.

### Toestandsmatrix adres

| Bron | #adressen | klant_adres | adres_keuze_nodig | UI |
|------|-----------|-------------|-------------------|-----|
| zelfinvoer | 0 of 1 | parser-waarde (of leeg) | false | gewoon tekstveld |
| zelfinvoer | 2+ | leeg tot keuze | n.v.t. (keuze in formulier vóór opslaan) | keuze-radio, verplicht |
| inbound mail | 0 of 1 | parser-waarde | false | normaal |
| inbound mail | 2+ | NULL | true | klus gevlagd "adres controleren" |
| dashboard-inschieten | 2+ | NULL | true | gevlagd, plannen geblokkeerd tot keuze |
| na keuze (dashboard/inbox) | - | gekozen adres | false | vlag weg |

### Stappen (test-first)

1. **Parser-schema** (`src/lib/parser-schema.ts`): veld `adressen:
   {adres, soort}[]` toevoegen (`soort`: montage | opdrachtgever | factuur |
   onbekend). `klant_adres` blijft (montage-gok / enige adres). JSON-schema +
   required bijwerken. Test: schema-spiegel-test + zod-parse.
2. **Parser-prompt** (`src/lib/claude-client.ts`): uitleggen dat er meerdere
   adressen kunnen zijn en hoe ze te labelen; montage/aflever → klant_adres.
3. **Pure helper** (`src/lib/adres-keuze.ts`, nieuw): `uniekeAdressen()` (dedupe)
   en `adresKeuzeNodig(adressen)` (>=2 unieke). Volledig unit-getest.
4. **Migratie** `supabase/schema-compleet-20-adres-kandidaten.sql`:
   `meldingen.adres_kandidaten jsonb`, `meldingen.adres_keuze_nodig boolean
   default false`. Idempotent. Zelf op test-DB via `npm run migrate:test`.
5. **db.ts**: OpdrachtInput + Opdracht (lees-model) uitbreiden; createOpdracht
   inserten; nieuwe methode `kiesAdres(id, adres)` (zet klant_adres,
   adres_keuze_nodig=false). Integratietest.
6. **API**: inbound + dashboard-inschieten zetten bij 2+ adressen
   klant_adres=NULL, adres_keuze_nodig=true, kandidaten opslaan. Zelfinvoer:
   keuze gebeurt in het formulier, dus keuze_nodig=false; kandidaten wel bewaren.
   Nieuw endpoint `POST /api/opdrachten/[id]/adres` → kiesAdres. Route-tests.
7. **UI**: herbruikbaar `AdresKeuze.tsx` (radio, niets voorgeselecteerd, +
   "ander adres"). KlusInvoer: bij 2+ keuze tonen i.p.v. voorvullen, verplicht.
   Dashboard-opdracht: vlag + keuze, plannen/bevestigen geblokkeerd tot gekozen.
   Inbox: keuze bij bevestigen.
8. **e2e** (in CI): zelfinvoer met 2-adres-order toont keuze; dashboard
   blokkeert plannen tot gekozen.

## Item 2 — Dubbele klussen bij inbound (idempotentie)

**Probleem:** de webhook parseert de PDF synchroon (10-30s) en geeft pas daarna
200; Resend levert dan opnieuw af → dezelfde mail wordt 2x verwerkt → dubbele
klussen. Geen dedup op `email_id`.

### Stappen (test-first)

1. **Migratie** `supabase/schema-compleet-21-inbound-idempotentie.sql`: tabel
   `inbound_verwerkt(email_id text primary key, verwerkt_at timestamptz default
   now())`. Idempotent. Zelf op test-DB.
2. **db.ts**: `markeerInboundVerwerkt(emailId): Promise<boolean>` — insert; bij
   PK-conflict false (al verwerkt), anders true. Atomisch, dus retry-veilig.
3. **inbound/route.ts**: zodra `emailId` bekend is en het event voor ons is,
   `markeerInboundVerwerkt` aanroepen; bij false meteen `{ok:true, dubbel:true}`
   teruggeven vóór het parsen. Route-test: tweede call met zelfde email_id maakt
   geen nieuwe klus.

## Testlagen

- Unit (vitest): parser-schema, adres-keuze helper.
- Integratie (vitest test:int, test-DB): createOpdracht + kiesAdres,
  markeerInboundVerwerkt.
- Route-tests: inbound (idempotentie + adres-vlag), opdrachten/adres.
- e2e (Playwright, in CI op GitHub): zelfinvoer-keuze + dashboard-blokkade.

Migraties draai ik zelf op de test-DB; productie doet Rein later (bewust).
