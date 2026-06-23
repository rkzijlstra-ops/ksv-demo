# Herinrichting opleveren + snel afsluiten — Implementatieplan

> **Voor uitvoering:** test-first per taak. Volg de vaste werkwijze uit `CLAUDE.md` (branch → TEST-omgeving → akkoord → productie). Werk `TOESTANDEN.md` en `TESTDEKKING.md` in dezelfde commit bij. Stappen met checkbox (`- [ ]`).

**Doel:** Snel afsluiten wordt een uitgeklede opleveren met een verkorte PDF; het opleverscherm wordt heringericht zodat een monteur bij eerste gebruik begrijpt wat zijn opties zijn. Klant-levering wordt een gegrendelde optie per opdrachtgever. `werkpool` wordt app-breed `kluspool`.

**Architectuur:** Eén rapport-basis; klant-levering en de interne "voor de opdrachtgever"-inhoud verschijnen alleen wanneer toegestaan. De bestaande `genereerRapportPdf()` krijgt een `variant`-vlag voor de verkorte PDF (volledige PDF blijft ongewijzigd). Versturen via de bestaande ActieKaart-kleur-staat-taal; oranje "nog te versturen" = de kluspool-oranje.

**Tech stack:** Next.js 16 (App Router), Tailwind v4, Supabase (3 DB's: prod/test/demo), pdf-lib, Playwright + Vitest.

**Branch/worktree:** `oplever-herinrichting` in `C:\Users\rkzij\ksv-worktrees\oplever-herinrichting`.

---

## Bouwvolgorde (van fundament naar buiten)

| # | Brok | Waarom op deze plek |
|---|---|---|
| A | `werkpool` → `kluspool` (app-breed) | Schone basis; nieuwe UI gebruikt meteen "kluspool" |
| D1 | DB-fundament klant-levering (kolom + db-functies + type) | Dependency voor de conditionele klant-kant in B |
| B | Opleveren herinrichting | Kern monteur-app; gebruikt D1 |
| C | Snel afsluiten → verkorte oplever-variant | Hergebruikt B + verkorte PDF |
| D2 | Dashboard opdrachtgever-instelling (schakelaar) | UI om D1 te bedienen; mag na de monteur-kant |

Migraties: D1 raakt het schema. Draai met `npm run migrate:test` (test + demo). **Productie-migratie doet Reinier handmatig** (apart benoemen). Niet mergen naar master voordat CI groen is én de test-omgeving is goedgekeurd (STOP-poort, `CLAUDE.md`).

---

## Brok A — `werkpool` → `kluspool` (app-breed)

**Doel:** alle zichtbare teksten en codenamen van "werkpool" naar "kluspool", met backward-compat op de URL-parameter.

**Bestanden (UI-teksten):** `src/app/page.tsx:79`, `src/app/handleiding/page.tsx:17,30`, `src/app/inbox/page.tsx:23`, `src/app/mijn-gegevens/page.tsx:15`, `src/app/opdracht/[id]/page.tsx:280`, `src/app/over/page.tsx:10`, `src/app/prullenbak/page.tsx:15`, `src/components/UserMenu.tsx:117`, `src/components/WerkpoolOnboarding.tsx:46,69`.
**Bestanden (codenamen):** `src/app/page.tsx` (`WerkpoolPage`, import), `src/components/WerkpoolOnboarding.tsx` → `KluspoolOnboarding.tsx`, `src/lib/werkpool.ts` → `src/lib/kluspool.ts` (`Werkpool` interface, `groepeerMeldingen` blijft), `src/lib/db.ts` (`getWerkpoolVoor` → `getKluspoolVoor`), `?werkpool=1` searchparam.
**Tests:** `src/lib/werkpool.test.ts` → `kluspool.test.ts`; 11 e2e-bestanden met `"Werkpool"`-asserties.

- [ ] **A1. UI-teksten omzetten.** Vervang elke zichtbare "Werkpool"/"werkpool" door "Kluspool"/"kluspool" in de UI-bestanden hierboven. Geen codenamen in deze stap.
- [ ] **A2. Backward-compat searchparam.** Accepteer in `src/app/page.tsx` zowel `?kluspool=1` als (legacy) `?werkpool=1`. Lees beide; gebruik intern `kluspool`.
- [ ] **A3. Codenamen hernoemen.** `werkpool.ts`→`kluspool.ts`, `Werkpool`→`Kluspool`, `getWerkpoolVoor`→`getKluspoolVoor`, `WerkpoolOnboarding`→`KluspoolOnboarding`, `WerkpoolPage`→`KluspoolPage`. Imports meeverhuizen. `groepeerMeldingen` ongemoeid.
- [ ] **A4. Tests bijwerken.** Hernoem `werkpool.test.ts`→`kluspool.test.ts`; pas asserties in de 11 e2e-specs aan naar "Kluspool". Pas testbestandsnaam `e2e/werkpool-zichtbaarheid.spec.ts`→`e2e/kluspool-zichtbaarheid.spec.ts` aan.
- [ ] **A5. Draaien + commit.** `npm test` (unit groen), `npm run test:e2e -- e2e/kluspool-zichtbaarheid.spec.ts e2e/monteur.spec.ts` (steekproef groen). Werk in `TESTDEKKING.md` de naamverwijzingen bij. Commit: `refactor: werkpool → kluspool (app-breed, met url-backcompat)`.

> Let op: dit raakt ook dashboard-bestanden. Alleen uitvoeren nadat Reiniers dashboard-werk geland/afgesloten is (anders merge-conflicten).

---

## Brok D1 — DB-fundament klant-levering

**Doel:** opdrachtgever krijgt `klant_levering_toegestaan` (default UIT), met db-functies om te lezen/schrijven.

**Bestanden:**
- Create: `supabase/schema-compleet-16-klant-levering.sql`
- Modify: `src/lib/db.ts` (interface `Opdrachtgever`, nieuwe functies)
- Test: `src/lib/db.test.ts` (of integratietest `test:int`)

- [ ] **D1.1. Migratiebestand schrijven.**
```sql
-- supabase/schema-compleet-16-klant-levering.sql
alter table public.opdrachtgevers
  add column if not exists klant_levering_toegestaan boolean not null default false;
```
- [ ] **D1.2. Migratie draaien op test+demo.** Run: `npm run migrate:test -- supabase/schema-compleet-16-klant-levering.sql`. Verwacht: succes op test- én demo-DB. (Prod = handmatig door Reinier, apart benoemen bij oplevering.)
- [ ] **D1.3. Type uitbreiden.** In `src/lib/db.ts` de interface `Opdrachtgever` aanvullen met `klant_levering_toegestaan: boolean`.
- [ ] **D1.4. Failing test: getOpdrachtgever leest de vlag.** Schrijf een test die een opdrachtgever ophaalt en `klant_levering_toegestaan` verwacht (default false). Run, verwacht FAIL (functie bestaat niet).
- [ ] **D1.5. Implementeer `getOpdrachtgever(id)` en `updateOpdrachtgever(id, { klant_levering_toegestaan })`** in `src/lib/db.ts` (selecteer/patch op `opdrachtgevers`). Test groen.
- [ ] **D1.6. Helper `magKlantLeveren(opdracht)`.** Regel: `true` als bron === 'monteur' (eigen klus) OF de gekoppelde opdrachtgever `klant_levering_toegestaan` heeft. Failing test eerst (eigen klus → true; opdrachtgever uit → false; opdrachtgever aan → true), dan implementeren.
- [ ] **D1.7. Commit:** `feat(db): opdrachtgever klant_levering_toegestaan + magKlantLeveren`.

---

## Brok B — Opleveren herinrichting

**Doel:** het opleverscherm volgens de mockup (`docs/mockups/oplever-mockups.html`).

**Hoofdbestand:** `src/components/OpleverFlow.tsx` (huidig 971 regels). Aanpassingen:
- "interne notitie" (tekst-only) → blok **"Voor de opdrachtgever"** met foto + video + tekst, alleen zichtbaar als `magKlantLeveren` true (anders: één rapport, geen splitsing).
- Akkoord/controle + handtekening samen in één **inklapbaar** blok "Handtekening" (compacte Akkoord/Niet akkoord).
- "Rapport voorvertonen" als ActieKaart in de flow (bestaat al, behouden/positioneren).
- Verstuur-kaarten via ActieKaart-kleur-staat-taal + een **"Later versturen"**-kaart (grijs, klok, "zet klaar in je kluspool").
- "Ook aan de klant"-keuzekaart die de klant-kant + voorvertoning-bevestiging onthult, alleen bij `magKlantLeveren`.
- Slimme standaard-ontvanger: opdrachtgever-klus → opdrachtgever; eigen klus → adresboek/zelf intikken; klant-mail blijft voorgevuld uit `meldingen.klant_email`.

**Ondersteunende bestanden:** `src/lib/db.ts` (oplevering-velden voor opdrachtgever-media), `src/components/OpleverFotos.tsx` + `VideoMaken.tsx` (hergebruik voor het opdrachtgever-blok), `src/app/api/opdrachten/[id]/rapport/route.ts`, `src/lib/rapport.ts` + `RapportWeergave.tsx` (de media van het opdrachtgever-blok in de zaak-versie tonen, uit de klant-versie houden).

**DB-velden (migratie):** het opdrachtgever-blok heeft naast `interne_opmerking` (tekst, bestaat) ook media nodig. Voeg toe: `interne_foto_urls text[]`, `interne_video_url text` op de oplevering-tabel.

- [ ] **B1. Migratie opdrachtgever-media.** Create `supabase/schema-compleet-17-opdrachtgever-media.sql`:
```sql
alter table public.opleveringen
  add column if not exists interne_foto_urls text[] not null default '{}',
  add column if not exists interne_video_url text;
```
Run `npm run migrate:test -- supabase/schema-compleet-17-opdrachtgever-media.sql`. (Prod handmatig.)
- [ ] **B2. Types + db-concept uitbreiden.** In `src/lib/db.ts` de `Oplevering`-interface en de concept-opslag (`bewaarConcept`-pad) uitbreiden met `interne_foto_urls`, `interne_video_url`. Failing test (registreer/lees oplevering met interne media) → implementeren → groen.
- [ ] **B3. Rapport: opdrachtgever-media in zaak-versie.** In `src/lib/rapport.ts` (sectie interne notitie, regels ~387-420) de interne foto's/video opnemen in de **zaak**-versie; `interneNotitieVoorRapport()`-logica (regels 111-117) uitbreiden zodat klant-versie deze media NOOIT krijgt. Failing test in `src/lib/rapport.test.ts` (zaak-versie bevat interne media; klant-versie niet) → implementeren → groen.
- [ ] **B4. UI: opdrachtgever-blok met media.** In `OpleverFlow.tsx` de tekst-only interne notitie vervangen door het gele blok "Voor de opdrachtgever" met `OpleverFotos` + `VideoMaken` + textarea, alleen gerenderd als `magKlantLeveren`. Anders: huidige enkele notitie behouden (alles naar opdrachtgever).
- [ ] **B5. UI: handtekening inklapbaar + compacte akkoord.** Akkoord/controle + handtekening-canvas samen in een `<details>`-blok met ActieKaart-kop (potlood, "Handtekening", "optioneel"). Akkoord/Niet akkoord compact (groen/rood). Dichtgeklapt default.
- [ ] **B6. UI: verstuur-kaarten + Later.** Verstuur-sectie als ActieKaarten: "Rapport voorvertonen" (neutraal), "Naar de opdrachtgever" (actie→klaar), "Naar de klant" (alleen bij klant-aan), en **"Later versturen"** (neutraal, klok, "zet klaar in je kluspool"). "Later" slaat het concept op en navigeert terug; de klus blijft oranje "nog te versturen" in de kluspool.
- [ ] **B7. UI: ook-aan-de-klant keuzekaart + voorvertoning-bevestiging.** Keuzekaart (alleen bij `magKlantLeveren`) die de klant-kant onthult. "Naar de klant" toont eerst de "dit ziet de klant"-voorvertoning (klant-versie, zonder opdrachtgever-blok) met bevestigknop.
- [ ] **B8. Slimme standaard-ontvanger.** Bij laden de standaard-ontvanger zetten op basis van bron (opdrachtgever-klus → opdrachtgever-adres/keuze; eigen klus → adresboek/leeg). Klant-mail voorvullen uit `meldingen.klant_email`.
- [ ] **B9. E2e uitbreiden.** `e2e/opleveren.spec.ts`: (a) opdrachtgever-klant met klant-levering UIT → geen klant-kant, geen opdrachtgever-blok-splitsing; (b) klant-levering AAN → opdrachtgever-blok met media verschijnt, klant-kaart aanwezig, voorvertoning vóór klant; (c) "Later versturen" → klus blijft oranje in kluspool, niet verzonden. Per scenario data- én UI-assertie (CLAUDE.md opleverlat).
- [ ] **B10. TOESTANDEN.md + TESTDEKKING.md bijwerken** met de nieuwe overgangen (later-versturen-status, klant-levering aan/uit) en de nieuwe testdekking. Commit per logische stap.

---

## Brok C — Snel afsluiten → verkorte oplever-variant

**Doel:** snel afsluiten levert dezelfde oplever-flow op, zonder handtekening en voorvertoon-stap, met een **verkorte PDF**.

**Bestanden:**
- Modify: `src/lib/rapport.ts` (param `variant`), `src/app/api/opdrachten/[id]/rapport/route.ts` (variant doorgeven), `src/app/opdracht/[id]/afronden/snel/page.tsx` + `src/components/AfgerondMeldenScherm.tsx` (vervangen door de oplever-flow in verkorte modus).
- Mogelijk verwijderen/uitfaseren: `src/lib/afgerond-mail.ts` (tekstmailtje) wordt vervangen door de oplever-mail.

- [ ] **C1. Failing test: verkorte PDF.** In `src/lib/rapport.test.ts` een test die `genereerRapportPdf(..., variant: "verkorting")` aanroept en verwacht dat de handtekening-sectie en controle-checklist ontbreken (en de volledige variant ze wél heeft). Run → FAIL.
- [ ] **C2. Implementeer `variant`-param.** Voeg `variant: "volledig" | "verkorting" = "volledig"` toe aan `genereerRapportPdf()`. In `"verkorting"`: sla de handtekening-sectie (regels ~270-278) en controle-checklist (sectie ~241-246) over; sectie-nummering loopt automatisch door. Volledige variant ongewijzigd. Test groen.
- [ ] **C3. Route: variant doorgeven.** `rapport/route.ts` accepteert `{ variant }` in de body en geeft het door aan `genereerRapportPdf()`. Bestandsnaam-suffix `-verkort` toevoegen. Failing route-test → implementeren → groen.
- [ ] **C4. Snel-afsluiten-scherm = oplever-flow (verkort).** `/opdracht/[id]/afronden/snel` rendert de oplever-flow in verkorte modus: geen handtekening-kaart, geen voorvertoon-stap, klant-kant alleen bij `magKlantLeveren`. Hergebruik dezelfde verstuur-kaarten + "Later". Bij KSV blijft over: oplevering + "Naar de opdrachtgever"/"Later".
- [ ] **C5. Status-gedrag gelijktrekken.** Versturen naar de opdrachtgever zet de klus op "opgeleverd" (zoals opleveren). Het "er komt nog een vervolg"-vinkje behouden als optie (klus terug naar kantoor om opnieuw in te plannen). Failing test in `afgerond/route.test.ts`/opvolger → implementeren → groen.
- [ ] **C6. E2e snel afsluiten.** `e2e/afgerond.spec.ts` herzien: snel afsluiten produceert een verkorte PDF en verstuurt naar de opdrachtgever (status opgeleverd); vervolg-vinkje-case blijft werken; "Later" laat hem oranje in de kluspool.
- [ ] **C7. Opruimen + docs.** Uitgefaseerde `afgerond-mail.ts`-pad netjes verwijderen of laten verwijzen naar oplever-mail. `TOESTANDEN.md`/`TESTDEKKING.md` bij. Commit.

---

## Brok D2 — Dashboard opdrachtgever-instelling (schakelaar)

**Doel:** beheerder kan per opdrachtgever klant-levering aan/uit zetten.

**Bestanden:**
- Create: dashboard-sectie/route voor opdrachtgever-instellingen (voorstel: `src/app/dashboard/instellingen/page.tsx` of een sectie op `src/app/gebruikers/page.tsx`).
- Create: `src/app/api/opdrachtgever/[id]/instellingen/route.ts` (PATCH).
- Modify: `src/lib/db.ts` (gebruikt `updateOpdrachtgever` uit D1).

- [ ] **D2.1. Failing route-test.** PATCH zet `klant_levering_toegestaan`; alleen beheerder mag. Run → FAIL.
- [ ] **D2.2. Implementeer PATCH-route** met rol-check (`vereisRol(["beheerder"])`) → `updateOpdrachtgever`. Test groen.
- [ ] **D2.3. Dashboard-UI.** Pagina/sectie met de opdrachtgever(s) en een schakelaar "Ook aan de klant opleveren toestaan" (default uit), korte uitleg. In app-stijl (ActieKaart/checkbox-toon).
- [ ] **D2.4. E2e.** Beheerder zet de schakelaar aan → bij een klus van die opdrachtgever verschijnt in de monteur-app de klant-kant; uit → niet. (Koppelt D2 aan B7.)
- [ ] **D2.5. TOESTANDEN/TESTDEKKING + commit.**

---

## Afronding (na alle brokken)

- [ ] Volledige suite: `npm test`, `npm run test:int`, `npm run test:e2e` groen. `rm -rf .next` vóór push (validator-cache).
- [ ] Push branch; CI in de cloud groen afwachten.
- [ ] Naar `omgeving-test` brengen; Reinier keurt op `kluslus-test` (beide rollen, end-to-end, opleverlat).
- [ ] **STOP-poort:** pas na Reins expliciete "merge" naar master. **Productie-migraties (schema 16 + 17) draait Reinier handmatig** vóór/bij de merge.

## Open punten (vóór go bevestigen)

1. `klant_levering_toegestaan` default **UIT** voor alle bestaande opdrachtgevers (incl. KSV). [aanname: ja]
2. Snel afsluiten zet status **opgeleverd** bij versturen naar de opdrachtgever, net als opleveren. [aanname: ja]
3. "Er komt nog een vervolg"-vinkje **behouden** in de nieuwe snel afsluiten. [aanname: ja]
4. Verkorte PDF = volledige PDF **zonder handtekening + controle-checklist**, foto/video/opmerking blijven. [aanname: ja]
5. Plek van de dashboard-schakelaar (eigen instellingen-pagina vs sectie op `/gebruikers`). [aanname: eigen sectie; laag-risico]
