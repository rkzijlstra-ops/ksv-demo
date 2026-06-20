# Plan: oplever-foto-upload robuust (fase 1 "binnen de pagina")

Datum: 2026-06-19. Hoort bij DESIGN-OPLEVER-UPLOAD-ROBUUST.md. TDD: test eerst, dan code.
Unit/route-tests draai ik (`npm test`). E2e draait Rein in PowerShell. Bestaande `opleveren.spec` moet groen blijven.

## Blok A: per-foto upload met zichtbare voortgang (de kern)

- **A1. Pure reducer/helper voor upload-items**
  - Bestand: `src/lib/foto-upload-queue.ts` (nieuw)
  - Test eerst: `src/lib/foto-upload-queue.test.ts` — items toevoegen, status wachten→bezig→klaar/mislukt,
    teller (klaar/totaal), "iets bezig?", opnieuw zet mislukt→wachten, verwijder haalt item eruit.
  - Code: pure functies/reducer op een items-lijst `{id, status, url?, fout?}`. Geen DOM, geen fetch.
  - Verifiëren: `npm test` groen op dit bestand.
  - Tijd: 20 min. Status: AFGEVINKT 2026-06-19 (11 tests groen)

- **A2. FotoMaken ombouwen naar per-item upload**
  - Bestand: `src/components/FotoMaken.tsx`
  - Test eerst: leunt op bestaande `e2e/opleveren.spec` + nieuwe e2e in A4. Geen losse component-test-infra.
  - Code: gebruik de reducer; per gekozen bestand: comprimeren → upload met `AbortController` → bij klaar
    `onChange` met volledige urls; tegels tonen per-item status (spinner/thumbnail/mislukt); teller "x van n";
    knoppen blijven zichtbaar tijdens upload (geen volledige spinner-overlay meer). Behoud aria-label
    "Foto verwijderen" en `HydratieKlaar`. `useEffect`-cleanup abort lopende uploads.
  - Verifiëren: handmatig + A4-e2e; `opleveren.spec` blijft groen.
  - Tijd: 40 min. Status: AFGEVINKT 2026-06-19. NB: FotoMaken bleek gedeeld met MeldingForm
    (meldingen, met werkende offline-queue) en AfgerondMeldenScherm. Daarom NIET FotoMaken omgebouwd
    maar een apart component `src/components/OpleverFotos.tsx` gemaakt; FotoMaken ongemoeid. Oplever-flow
    is online-only: offline → mislukt-tegel + opnieuw (oude local:-pad gold alleen voor meldingen).

- **A3. Per-item fout + "opnieuw"**
  - Bestand: `src/components/FotoMaken.tsx`
  - Test eerst: e2e in A4 (geforceerde upload-fout → één tegel mislukt, rest blijft, opnieuw werkt).
  - Code: mislukte upload zet item op "mislukt" met knop "Opnieuw"; rest van de batch loopt door.
  - Verifiëren: A4-e2e.
  - Tijd: 20 min. Status: AFGEVINKT 2026-06-19 (zit in OpleverFotos; verwijder-X = "Foto verwijderen",
    annuleer/mislukt-X = "Upload annuleren", ondubbelzinnig).

- **A4. E2e voortgang + fout (Rein draait)**
  - Bestand: `e2e/oplever-upload.spec.ts` (nieuw)
  - Test: meerdere foto's tegelijk → tegels verschijnen 1-voor-1, teller klopt, concept bevat alle URLs;
    per-item fout → één mislukt, rest blijft, opnieuw lukt.
  - Verifiëren: `npx playwright test e2e/oplever-upload.spec.ts` → 2 passed (zelf gedraaid).
  - Tijd: 25 min. Status: AFGEVINKT 2026-06-19 (2 tests groen; serverlogs tonen per-foto concept-save).

## Blok B: verlaat-waarschuwing + in-app navigatie-bevestiging

- **B1. "bezig" omhoog rapporteren + verlaat-waarschuwing voor foto's**
  - Bestand: `src/components/FotoMaken.tsx`, `src/components/OpleverFlow.tsx`
  - Test eerst: e2e in B3.
  - Code: FotoMaken krijgt `onBezigChange(bezig)`; OpleverFlow houdt `fotoBezig` + `videoBezig` bij en
    breidt `useVerlaatWaarschuwing(...)` uit naar foto/video erbij.
  - Verifiëren: B3-e2e + handmatig (verversen tijdens upload geeft waarschuwing).
  - Tijd: 20 min. Status: open

- **B2. In-app navigatie-bevestiging bij lopende upload**
  - Bestand: `src/components/OpleverFlow.tsx` (Terug-knop + "Rapport voorvertonen"-link)
  - Test eerst: e2e in B3.
  - Code: die twee navigaties via een handler die bij lopende upload `window.confirm` toont; klaar-foto's
    zijn al opgeslagen, alleen de lopende stopt.
  - Verifiëren: B3-e2e.
  - Tijd: 20 min. Status: open

- **B3. E2e navigatie-bevestiging (Rein draait)**
  - Bestand: `e2e/oplever-upload.spec.ts`
  - Test: tijdens lopende upload op Terug klikken → bevestiging verschijnt.
  - Tijd: 15 min. Status: open

## Blok C: foto en video na elkaar (serialiseren)

- **C1. Gedeelde upload-blokkade**
  - Bestand: `src/components/OpleverFlow.tsx`, `src/components/VideoMaken.tsx`, `src/components/FotoMaken.tsx`
  - Test eerst: e2e in C2.
  - Code: VideoMaken krijgt `geblokkeerd` (= fotoBezig) en, bij een keuze tijdens blokkade, status
    "wacht op foto's…" + start automatisch zodra gedeblokkeerd. Andersom: FotoMaken wacht als video bezig.
  - Verifiëren: C2-e2e + handmatig.
  - Tijd: 30 min. Status: open

- **C2. E2e serialisatie (Rein draait)**
  - Bestand: `e2e/oplever-upload.spec.ts`
  - Test: video kiezen tijdens foto-upload → "wacht op foto's", daarna start de video vanzelf.
  - Tijd: 15 min. Status: open

## Blok D: weesbestanden structureel opruimen

- **D1. Pad-uit-URL-helper + storage-verwijder**
  - Bestand: `src/lib/storage.ts` (+ helper), test `src/lib/storage-pad.test.ts` (nieuw, pure helper)
  - Test eerst: pad-uit-publicUrl voor `meldingen-fotos` en `oplever-videos` correct afgeleid.
  - Code: `verwijderOpleverFoto(pad)` (bucket meldingen-fotos) + `verwijderOpleverVideo(pad)` (bucket
    oplever-videos), beide `.remove([pad])`. Pure helper voor pad-extractie uit URL.
  - Verifiëren: `npm test` groen op de helper.
  - Tijd: 20 min. Status: open

- **D2. DELETE-route oplever-bestand met veiligheidscheck**
  - Bestand: `src/app/api/opdrachten/[id]/oplever-bestand/route.ts` (nieuw) + `route.test.ts`
  - Test eerst: monteur/beheerder mag; URL moet bij het concept van die opdracht horen (anders 404/403);
    storage-fout is best-effort (route faalt niet).
  - Code: DELETE met body `{ url }`; check rol + dat de URL in de oplevering van die opdracht staat én nog
    niet verstuurd is; dan storage wissen.
  - Verifiëren: `npm test` groen op route-test.
  - Tijd: 30 min. Status: open

- **D3. Verwijderen in UI koppelt aan opruimen (mits niet verstuurd)**
  - Bestand: `src/components/FotoMaken.tsx`, `src/components/VideoMaken.tsx`, `src/components/OpleverFlow.tsx`
  - Test eerst: e2e in D4.
  - Code: OpleverFlow geeft `alVerstuurd` (= klant/zaakVerzondenAt) door; `verwijder()` roept de DELETE-route
    aan mits niet verstuurd; bezig item dat verwijderd wordt: abort.
  - Verifiëren: D4-e2e.
  - Tijd: 20 min. Status: open

- **D4. E2e verwijderen ruimt op (Rein draait)**
  - Bestand: `e2e/oplever-upload.spec.ts`
  - Test: foto uploaden, verwijderen → tegel weg, uit concept. (Storage-wissen is best-effort, UI/concept geverifieerd.)
  - Tijd: 15 min. Status: open

## Blok E: afronding

- **E1. Registers bijwerken** — `TOESTANDEN.md` (rij oplevering vastleggen) + `TESTDEKKING.md` (nieuwe regel). 10 min. open
- **E2. Alles groen + logboek** — `npm test` + `npm run test:int` (ik); e2e door Rein; logboek-entry in `07_logboek/`. 15 min. open

Totaal geschat: ~6 uur werk, opgedeeld in losse stappen. Bouwvolgorde: A → B → C → D → E.

## Afronding (2026-06-20)

Alle blokken gebouwd en getest. Status per blok:
- **A (per-foto upload):** AF. `foto-upload-queue` (11 unit), nieuw component `OpleverFotos` (i.p.v. FotoMaken
  ombouwen, want dat is gedeeld met meldingen), e2e 1-voor-1 + fout-isolatie.
- **B (verlaat-waarschuwing + nav-bevestiging):** AF. Store `oplever-upload-status` (3 unit), waarschuwing in
  OpleverFlow, `OpleverTerugLink`, e2e bevestiging tijdens upload + niet als niets loopt.
- **C (foto/video serieel):** AF. VideoMaken wacht op foto's (en andersom), e2e video-wacht-en-start. NB: bug
  gevonden+gefixt: store-abonnement miste het "foto's klaar"-moment door her-abonneren per render; nu via de
  hook (useSyncExternalStore) + effect op de gerenderde foto-status.
- **D (weesbestanden):** AF. `storage-pad` (6 unit) + storage-verwijder-functies, DELETE-route
  `oplever-bestand` met rol/toegang/verstuurd/bucket-check (10 route-unit), UI-koppeling in OpleverFlow, e2e
  verwijderen → opruim-route + uit concept. Alleen structureel; historische sweep apart (nog te doen).
- **E (registers/afronding):** AF. TESTDEKKING + TOESTANDEN bijgewerkt, logboek geschreven.

Verificatie: 719 unit-tests groen, 6 e2e groen (5 nieuw + bestaande opleveren.spec), typecheck schoon.
Lint: alleen één pre-existing melding (OpleverFlow reconcile-effect), niet door deze wijziging.

Open punten voor de review (in het rapport aan Rein):
1. Offline oplever-foto's: nieuwe flow doet offline → mislukt + opnieuw (oud local:-pad was kapot, gold
   alleen voor meldingen). Bewuste keuze.
2. Veiligheidscheck DELETE-route: rol + opdracht-toegang + bucket + niet-verstuurd, GEEN "url hoort exact bij
   dit concept" (botst met de concept-update-race). Vertrouwde monteur-rol; mogelijk wil Rein strenger.
3. Historische weesbestand-sweep: nog niet gebouwd (apart, gedeelde bucket, dry-run).
4. Pre-existing `geladenRef`-gate kan een héél vroege concept-save inslikken (koude pagina). Niet door deze
   wijziging; aanbevolen om los aan te pakken.
