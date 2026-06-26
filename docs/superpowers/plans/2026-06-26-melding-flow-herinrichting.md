# Melding-flow herinrichting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **STATUS 2026-06-26: gebouwd, test-first, op `omgeving-test` → kluslus-test.** Alle taken (T2–T16) af. 872 unit + 106 e2e groen (16 skipped, 0 fail). `TESTDEKKING.md` + `TOESTANDEN.md` bijgewerkt. Branch `melding-flow` gepusht; gemerged in `omgeving-test` (kluslus-test deployt). **STOP-poort: wacht op Reins keuring (beide rollen) vóór de PR/merge naar master.** Productie-migratie `schema-compleet-28-melding-video.sql` moet Rein nog op prod draaien vóór merge (test+demo zijn gedaan). Extra t.o.v. plan: in verkort geen "geen foto/video"-waarschuwing (media-invoer is daar bewust weg).

**Goal:** Meldingen schoner en duidelijker maken voor een nieuwe monteur, video toevoegen aan meldingen, en "snel afsluiten" ontdubbelen (geen foto/video-herinvoer, maar een meldingen-overzicht + begeleidend bericht).

**Architecture:** Hergebruik bestaande componenten (`MeldingForm`, `OpleverFlow`-versturen-blok, `VideoMaken`, `OntvangerKeuze`, `ActieKaart`). Drie blokken werk: (A) video op melding, (B) detailpagina-herinrichting, (C) snel-afsluiten ontdubbelen. Volledige oplevering blijft ongewijzigd.

**Tech Stack:** Next.js (App Router, zie `AGENTS.md` — lees `node_modules/next/dist/docs/` vóór code), Supabase, Playwright e2e, Vitest unit. Design-tokens uit `globals.css`.

**Bron-ontwerp:** `docs/superpowers/specs/2026-06-26-melding-flow-herinrichting-design.md`.

---

## Belangrijk vóór je begint

- **Volgorde (zie spec, sectie Coördinatie):** dit is het LAATSTE van drie: oplever-herinrichting → mail-aflevering → melding-flow. Bouw op een verse worktree vanaf de dan-bijgewerkte master, NA de mail-aflevering-merge.
- **Verifieer tegen de actuele master bij de bouw.** Exacte regelnummers en de positie van `VerzendInfoBlok` (uit mail-aflevering) op `src/app/opdracht/[id]/page.tsx` staan pas vast als mail-aflevering op master staat. De taken hieronder geven bestand + bedoeling + tests; controleer de exacte plek bij de bouw. Dit is een echte afhankelijkheid, geen placeholder.
- **Werkwijze:** test-first, `TESTDEKKING.md` + `TOESTANDEN.md` in dezelfde commit bijwerken, eerst naar `omgeving-test`, STOP voor keuring, nooit zelf naar master (zie project-CLAUDE.md).
- **Migraties:** test+demo via `npm run migrate:test`, productie doet Reinier handmatig. Op ALLE drie, anders drift → CI rood.

---

## Setup

### T1: Worktree + branch
**Files:** n.v.t. (git)

- [ ] **Stap 1:** `git worktree add C:/Users/rkzij/ksv-worktrees/melding-flow -b melding-flow` (vanaf bijgewerkte master).
- [ ] **Stap 2:** `cp .env.local .env.test .env.demo-vercel .env.preview C:/Users/rkzij/ksv-worktrees/melding-flow/` en `cd` erheen, `npm ci`.
- [ ] **Stap 3:** Verifieer: `git status` schoon, `npm run typecheck` groen.

---

## Deel A: Video op melding

### T2: Migratie — `video_url` op meldingen
**Files:** Create `supabase/schema-compleet-28-melding-video.sql`

- [ ] **Stap 1:** Schrijf de migratie:

```sql
-- Video op een melding (net als de oplevering al een video_url heeft).
alter table public.meldingen
  add column if not exists video_url text;
```

- [ ] **Stap 2:** Draai tegen test+demo: `npm run migrate:test -- supabase/schema-compleet-28-melding-video.sql`. Verwacht: geen fout.
- [ ] **Stap 3:** Noteer in de PR-omschrijving dat Reinier deze migratie ook op productie moet draaien vóór merge.
- [ ] **Stap 4:** Commit: `git add supabase/schema-compleet-28-melding-video.sql && git commit -m "feat(melding): video_url kolom op meldingen"`

### T3: API meldingen accepteert `video_url`
**Files:** Modify `src/app/api/meldingen/route.ts` (POST), `src/app/api/meldingen/[id]/route.ts` (PATCH); Test: bijbehorende route-tests

- [ ] **Stap 1:** Schrijf de falende test: POST met `video_url` slaat die op en geeft hem terug; PATCH werkt `video_url` bij; weglaten = `null`.
- [ ] **Stap 2:** Run de test, verwacht FAIL (veld wordt genegeerd).
- [ ] **Stap 3:** Voeg `video_url` toe aan de body-validatie en de insert/update (volg het bestaande patroon van `foto_urls`/`ruwe_tekst`).
- [ ] **Stap 4:** Run de test, verwacht PASS. Bestaande melding-tests blijven groen.
- [ ] **Stap 5:** Commit.

### T4: `MeldingForm` — video toevoegen
**Files:** Modify `src/components/MeldingForm.tsx`; Modify `BestaandeMelding`-interface (veld `video_url`); de aanroepende pagina's (`melding/page.tsx`, `melding/[meldingId]/page.tsx`) geven `video_url` door

- [ ] **Stap 1:** Breid `BestaandeMelding` uit met `video_url: string | null`.
- [ ] **Stap 2:** Voeg state `videoUrl` toe en neem hem mee in `isDirty`, in de POST/PATCH-body, en in de offline-queue (`voegToeAanQueue`, indien video offline ondersteund wordt — anders bewust uitsluiten en documenteren).
- [ ] **Stap 3:** Render `VideoMaken` (hergebruik uit `OpleverFlow`) onder het foto-blok, in de bestaande invoer-stijl (zie mockup `melding-inklap.html` voor de plek, maar op de bestaande aparte pagina).
- [ ] **Stap 4:** Verifieer handmatig in dev: foto + video toevoegen, opslaan, terug op detail.
- [ ] **Stap 5:** Commit.

### T5: Rapport-PDF — video-link in de melding-sectie
**Files:** Modify `src/lib/rapport.ts` (melding-sectie, rond regel 260-275); Test: `src/lib/rapport.test.ts`

- [ ] **Stap 1:** Schrijf de falende test: een melding met `video_url` levert in de PDF een zichtbare video-verwijzing (zoals de oplevering dat al doet voor `video_url`).
- [ ] **Stap 2:** Run, verwacht FAIL.
- [ ] **Stap 3:** Voeg de video-regel toe in de melding-loop, hergebruik de manier waarop de oplevering-video al wordt getoond.
- [ ] **Stap 4:** Run, verwacht PASS. De volledige-PDF-snapshot van bestaande tests blijft kloppen (alleen aangevuld waar een melding video heeft).
- [ ] **Stap 5:** Commit.

---

## Deel B: Detailpagina-herinrichting

### T6: Koppen + melding-knop label
**Files:** Modify `src/app/opdracht/[id]/page.tsx` (meldingen-sectie)

- [ ] **Stap 1:** Wijzig de sectiekop "Meldingen (N)" naar "Meldingen tijdens de klus" met subtekst "Iets kapot of ontbrekend? Meld het, per stuk."
- [ ] **Stap 2:** Wijzig het knoplabel "Melding toevoegen" → "Beschadiging of manco melden" (knop blijft `Link` naar `/opdracht/${id}/melding`).
- [ ] **Stap 3:** Verifieer in dev: detailpagina toont de nieuwe teksten, knop navigeert nog steeds.
- [ ] **Stap 4:** Commit.

### T7: "Aan het einde van de klus"-blok + onderbalk
**Files:** Modify `src/app/opdracht/[id]/page.tsx`

- [ ] **Stap 1:** Verwijder "Klus afsluiten" uit de vaste onderbalk; laat daar alleen "Terug naar kluspool".
- [ ] **Stap 2:** Voeg onderaan de inhoud een kop "Aan het einde van de klus" toe met een `ActieKaart` (pijl naar rechts) "Klus afsluiten" → `/opdracht/${id}/afronden`, in de bestaande kaart-stijl.
- [ ] **Stap 3:** **Verifieer tegen master:** plaats dit blok logisch t.o.v. het `VerzendInfoBlok` (mail-aflevering) als dat er staat. Controleer dat beide blokken samen leesbaar onder elkaar staan.
- [ ] **Stap 4:** Verifieer in dev: afsluiten werkt via het pagina-blok; balk toont alleen kluspool.
- [ ] **Stap 5:** Commit.

### T8: Meldingenlijst — alleen spoed-label
**Files:** Modify `src/components/MeldingStaatBadge.tsx`; Modify de meldingen-lijst in `src/app/opdracht/[id]/page.tsx`; Test: component-test voor de badge

- [ ] **Stap 1:** Schrijf de falende test: badge toont rood "Spoed" bij `spoed=true`; bij `spoed=false` rendert hij niets (geen "Melding"/"Achteraf"-label).
- [ ] **Stap 2:** Run, verwacht FAIL.
- [ ] **Stap 3:** Pas `MeldingStaatBadge` aan: niet-spoed = niets renderen (return null). Spoed = bestaande rode badge.
- [ ] **Stap 4:** In de lijst: een niet-spoed melding toont alleen tekst + foto/video-telling, geen badge-regel.
- [ ] **Stap 5:** Run, verwacht PASS. Commit.

---

## Deel C: Snel afsluiten ontdubbelen

### T9: Meldingen-overzicht component (read-only)
**Files:** Create `src/components/MeldingenOverzicht.tsx`; Test: component-test

- [ ] **Stap 1:** Schrijf de falende test: gegeven een lijst meldingen rendert het "Dit gaat mee in het rapport (N)", per melding tekst + foto/video-telling, spoed gelabeld; lege lijst rendert een nette "geen meldingen"-regel.
- [ ] **Stap 2:** Run, verwacht FAIL.
- [ ] **Stap 3:** Bouw het component (read-only, bestaande meldingen-stijl, hergebruik de telling-weergave en `MeldingStaatBadge`).
- [ ] **Stap 4:** Run, verwacht PASS. Commit.

### T10: `OpleverFlow` verkort-modus — oplever- en intern-blok eruit
**Files:** Modify `src/components/OpleverFlow.tsx`

- [ ] **Stap 1:** In de `verkort`-tak: render het blok "De oplevering" (foto/video/opmerking) NIET, en het "Ook aan de klant" + interne "Voor de opdrachtgever"-blok NIET. (Volledige modus ongewijzigd.)
- [ ] **Stap 2:** Behoud in `verkort`: het vervolg-vinkje ("Klus is niet af") en het volledige versturen-blok ongewijzigd.
- [ ] **Stap 3:** Verifieer in dev: snel afsluiten toont geen media-invoer meer.
- [ ] **Stap 4:** Commit.

### T11: Begeleidend bericht in verkort
**Files:** Modify `src/components/OpleverFlow.tsx`

- [ ] **Stap 1:** In `verkort`: toon één tekstveld "Begeleidend bericht (optioneel)" met `SpraakOpname`, gekoppeld aan het bestaande `opmerking`-veld (hergebruik state + opslag, geen nieuw datamodel).
- [ ] **Stap 2:** Verifieer in dev: tekst wordt bewaard in het concept en gaat mee bij versturen.
- [ ] **Stap 3:** Commit.

### T12: Meldingen-overzicht + ontsnap-knop in het snel-scherm
**Files:** Modify `src/app/opdracht/[id]/afronden/snel/page.tsx` en/of `src/components/OpleverFlow.tsx`

- [ ] **Stap 1:** Haal de meldingen van de klus op en toon `MeldingenOverzicht` boven het begeleidend bericht in de verkort-flow.
- [ ] **Stap 2:** Voeg onderaan een `ActieKaart` (gestippeld/neutraal) "Toch foto, video of handtekening? → volledige oplevering" toe, link naar `/opdracht/${id}/opleveren`.
- [ ] **Stap 3:** Verifieer in dev: overzicht klopt, ontsnap-knop linkt naar de volledige oplevering.
- [ ] **Stap 4:** Commit.

### T13: Waarschuwing bij 0 meldingen
**Files:** Modify `src/components/OpleverFlow.tsx` (verstuur-handler, verkort-tak)

- [ ] **Stap 1:** Schrijf de falende test (component/integratie): versturen in verkort met 0 meldingen toont een bevestiging "Versturen zonder melding?"; bevestigen gaat door, annuleren stopt.
- [ ] **Stap 2:** Run, verwacht FAIL.
- [ ] **Stap 3:** Voeg in de verstuur-handler (verkort) een `window.confirm("Versturen zonder melding?")` toe wanneer de meldingen-lijst leeg is, vóór het echte versturen.
- [ ] **Stap 4:** Run, verwacht PASS. Commit.

---

## Deel D: Verkorte PDF

### T14: Verkorte PDF bevat meldingen + begeleidend bericht
**Files:** Modify `src/lib/rapport.ts` indien nodig; Test: `src/lib/rapport.test.ts`

- [ ] **Stap 1:** Schrijf de falende test: de verkorte variant (`variant: "verkorting"`) bevat de meldingen-sectie (incl. video uit T5) en het begeleidend bericht (`opmerking`).
- [ ] **Stap 2:** Run, verwacht FAIL of PASS. Als al gedekt (meldingen zaten al in de verkorte PDF), bevestig en sla implementatie over.
- [ ] **Stap 3:** Indien FAIL: vul de verkorte PDF aan zodat meldingen + begeleidend bericht erin staan.
- [ ] **Stap 4:** Run, verwacht PASS. Commit.

---

## Afronding

### T15: Registers bijwerken
**Files:** Modify `TESTDEKKING.md`, `TOESTANDEN.md`

- [ ] **Stap 1:** Voeg regels toe: video op melding, spoed-only label, snel-afsluiten zonder media + overzicht + begeleidend bericht + ontsnap-knop + 0-meldingen-waarschuwing, detailpagina-herinrichting.
- [ ] **Stap 2:** Vul de toestandsmatrix aan (zie spec, sectie Toestanden en ketens). Commit.

### T16: E2e
**Files:** Create `e2e/melding-flow.spec.ts` (of uitbreiden bestaande)

- [ ] **Stap 1:** E2e: melding met foto + video toevoegen, verschijnt in de lijst (spoed-only label).
- [ ] **Stap 2:** E2e: snel afsluiten end-to-end — overzicht toont meldingen, géén media-invoer, begeleidend bericht, versturen naar opdrachtgever én naar klant; 0-meldingen toont de waarschuwing; ontsnap-knop opent de volledige oplevering.
- [ ] **Stap 3:** E2e: detailpagina-koppen + afsluiten via het pagina-blok.
- [ ] **Stap 4:** Run `npm run test:e2e`, verwacht groen. Commit.

### T17: Volledige suite → omgeving-test → STOP voor keuring
- [ ] **Stap 1:** `rm -rf .next`, volledige suite (unit + e2e) groen.
- [ ] **Stap 2:** Push branch, merge in `omgeving-test`, laat kluslus-test deployen. Niet doen terwijl Reinier elders op kluslus-test keurt (gedeelde test-DB).
- [ ] **Stap 3:** STOP. Vraag Reinier beide rollen te keuren op kluslus-test. Pas na "ga maar" verder; nooit zelf naar master.

---

## Self-review (afgevinkt bij schrijven)

- Spec-dekking: video (A), detailpagina-koppen/afsluit-blok/spoed-label (B), snel-afsluiten ontdubbelen + overzicht + begeleidend + ontsnap + 0-meldingen (C), verkorte PDF (D), registers + e2e (afronding). Volledige oplevering bewust ongewijzigd.
- Afhankelijkheid op mail-aflevering (detailpagina, rapport-route) expliciet gemarkeerd als build-time verificatie, geen placeholder.
