# Oplever-foto-upload robuust gemaakt (fase 1 "binnen de pagina")

Datum: 2026-06-20. Zie DESIGN-OPLEVER-UPLOAD-ROBUUST.md en PLAN-OPLEVER-UPLOAD-ROBUUST.md.

## Aanleiding
De oplever-foto-upload was alles-of-niets per batch en hing aan de levensduur van de pagina-component.
Wegnavigeren (in-app, verversen, app-switch met tab-kill) of één mislukte foto liet de hele batch
vallen, zonder waarschuwing en met weesbestanden in storage. Vraag van Rein: geen vastlopers, geen
dataverlies, en zichtbare voortgang. Besloten: gefaseerd, eerst "binnen de pagina" (deze sessie),
fase 2 "volledig naadloos" (service-worker/background-sync) later en nog niet zeker.

## Wat er nu is
- **Per foto committen:** nieuw component `OpleverFotos` (los van `FotoMaken`, dat de meldingen-flow met
  offline-queue bedient). Elke foto wordt zodra hij klaar is in het concept opgeslagen. Teller "x van n",
  thumbnails verschijnen 1-voor-1, per-item status.
- **Per-item fout + opnieuw:** een mislukte foto isoleert zich met een "opnieuw"-knop; de rest blijft.
- **Verlaat-waarschuwing + in-app navigatie-bevestiging:** gedeelde store `oplever-upload-status`
  (useSyncExternalStore). OpleverFlow waarschuwt bij verversen/sluiten; `OpleverTerugLink` en de
  "Rapport voorvertonen"-link vragen bevestiging bij een lopende upload. Klaar = al opgeslagen.
- **Abort bij verlaten:** elke upload heeft een AbortController; bij unmount/annuleren wordt afgebroken.
- **Foto en video serieel:** een video die tijdens een foto-upload gekozen wordt, wacht ("Video wacht tot
  de foto's klaar zijn…") en start daarna vanzelf; andersom wachten foto's op een lopende video.
- **Weesbestanden structureel opgeruimd:** een verwijderde/vervangen foto of video wordt ook uit storage
  gewist via de DELETE-route `/api/opdrachten/[id]/oplever-bestand`, mits er nog geen rapport verstuurd
  is (anders blijft het bestand staan voor voorvertoning/herverzending). Best-effort.

## Bug onderweg
De wachtende video startte eerst niet: hij hing aan een store-abonnement dat per render her-abonneerde
(omdat `onChange` uit OpleverFlow elke render nieuw is), waardoor het "foto's klaar"-moment gemist werd.
Opgelost door in VideoMaken de foto-status via de hook te lezen en op de gerenderde waarde te reageren.
De e2e ving dit; het was geen test-artefact maar een echte fout.

## Verificatie
719 unit-tests groen, 6 e2e groen (`oplever-upload.spec` 5 nieuw + bestaande `opleveren.spec`), typecheck
schoon. Lint: alleen een pre-existing melding (OpleverFlow reconcile-effect), niet door deze wijziging.

## Bewuste keuzes / open punten (voor de review)
1. Offline oplever-foto's: nu mislukt + opnieuw i.p.v. het oude `local:`-pad (dat was kapot, gold alleen
   voor meldingen). De oplever-flow is online-only.
2. DELETE-route checkt rol + opdracht-toegang + bucket + niet-verstuurd, maar niet "url hoort exact bij
   dit concept" (botst met de concept-update-race). Vertrouwde monteur-rol; eventueel later strenger.
3. Historische weesbestand-sweep nog niet gebouwd (apart, gedeelde bucket `meldingen-fotos`, met dry-run).
4. Pre-existing `geladenRef`-gate kan een héél vroege concept-save op een koude pagina inslikken (de
   bestaande `opleveren.spec` is daarom af en toe flaky met retry). Niet door deze wijziging; los aan te
   pakken.
5. Fase 2 "volledig naadloos" (doorlopen over navigatie/backgrounding, idempotentie) bewust uitgesteld.

## Nieuwe bestanden
`src/lib/foto-upload-queue.ts` (+test), `src/lib/oplever-upload-status.ts` (+test),
`src/lib/storage-pad.ts` (+test), `src/components/OpleverFotos.tsx`, `src/components/OpleverTerugLink.tsx`,
`src/app/api/opdrachten/[id]/oplever-bestand/route.ts` (+test), `e2e/oplever-upload.spec.ts`.
Aangepast: `OpleverFlow`, `VideoMaken`, `storage.ts`, `opleveren/page.tsx`, TESTDEKKING/TOESTANDEN.
