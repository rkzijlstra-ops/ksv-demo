# KSV Demo - Sessie 2A.8 (mobiel polijsten)

Datum: 2026-05-30 (laat avond, na Vercel-deploy en eerste mobiel-test op 5G)
Project: `01_projecten/keukenstudio-voorschoten-demo`
Live: <https://ksv-demo.vercel.app>

## Aanleiding

Eerste praktijk-test op 5G na de Vercel-deploy. Vier concrete pijnpunten naar voren:

1. Foto's laden traag op 5G
2. Spraak-naar-tekst (Whisper) op het randje qua snelheid en betrouwbaarheid
3. Bij teruggaan zonder opslaan was alles weg -- geen waarschuwing
4. Foto's konden alleen via camera, niet uit galerij; en foto's verdwijnen in de app

Plus: geluidsfeedback bij start/stop van een spraakopname (Rein wilde standaard "ding"-geluidjes).

## Gebouwd (E1-E4, direct na de feedback gepushed)

### E1 - Foto's ook uit eigen galerij
- `FotoMaken.tsx`: `capture="environment"`-attribuut verwijderd. iOS toont nu het standaard
  systeemmenu (Foto-bibliotheek / Foto nemen / Bestand kiezen). Eén knop, drie ingangen,
  geen UI-vervuiling. Knoplabel "Foto toevoegen (camera of galerij)" maakt het expliciet.
- Foto's *naar* de telefoongalerij weggeschreven? Bewust niet -- iOS staat dat niet stilletjes
  toe, en een extra "Bewaar in galerij"-knop bij elke foto zou de UI overvuilen. Werk
  in galerij ophalen kan, andere richting niet vanuit een PWA.

### E2 - Dirty-check bij terug-navigeren
- `MeldingForm`: rekent intern `isDirty` uit door huidige form-state te vergelijken met initial
  (`tekst`, `fotoUrls`, `spoed`).
- Back-link "Terug naar opdracht" verhuisd van de page-componenten naar binnen MeldingForm,
  zodat dirty-check naast de state staat. `onClick` doet `window.confirm` als dirty.
- MeldingForm krijgt `terugHref` (verplicht) + `kop` (optionele JSX) als props; pages worden
  trivial wrappers.

### E3 - Spraak: VAD + bitrate + geluidjes + indicatie
- Voice-activity-detection: `AnalyserNode` op de MediaStream, `requestAnimationFrame`-loop meet
  RMS-amplitude. Onder `STILTE_THRESHOLD = 0.012` start een teller; bij 5s stilte -> auto-stop.
- Bitrate naar opus 24 kbps via `MediaRecorder({ audioBitsPerSecond: 24000 })`. Voor spraak
  klinkt het identiek, upload is fors kleiner.
- Start/stop-feedback via Web Audio API-oscillator. Start = korte oplopende toon (660 -> 880 Hz),
  stop = dalende toon (880 -> 440 Hz). Geen audio-bestand nodig, werkt op iOS na de eerste
  user-gesture.
- Visueel: knipperend wit puntje, label wisselt naar "Stilte - auto-stop in Xs", en een
  groene amplitude-bar onder de knop loopt mee met spreken (zodat je ziet dat hij hoort).

Achtergrond op Reins vraag "moet hij mijn stem leren?": nee -- Whisper is een statisch model.
"Rare teksten" bij stilte zijn een bekend hallucinatie-effect bij zachte audio. Door VAD +
duidelijker spreken in een normale luidheid neemt dat af.

### E4 - Foto's sneller: next/image
- `next.config.ts`: `images.remotePatterns` toegevoegd voor `*.supabase.co/storage/**` zodat
  Vercel de optimalisatie mag uitvoeren.
- `FotoGalerij` en `FotoMaken` gebruiken nu `next/image` met `fill` + `sizes`. Vercel serveert
  WebP, lazy loading, en kleinere thumbnails per `sizes`. Onafhankelijk van Supabase image-
  transformations (die op free tier beperkt zijn).

## Stand

- 160 tests groen, tsc schoon, `next build` lokaal slaagt.
- Commit `0177b78`, pushed naar `master`, Vercel-deploy automatisch gestart.
- Live test op 5G volgt na de deploy.

## Open punten (later)

- Image-laadtijd echt meten op 5G en zien hoeveel verschil `next/image` maakt vs voor de fix.
- Spraak-feedback: kijken of de oscillator-beeps op iPhone werken zoals bedoeld (eerste
  user-gesture is de "Inspreken"-knop; daarna mag audio spelen).
- Eventueel een "stilte-grens" instelbaar maken als 0.012 niet altijd klopt.
- Sessie 2A.5 (auth) blijft de volgende grote bouwsessie: Magic Link + Google OAuth, daarna RLS.
- "Activiteiten-log" (welke monteur deed wat wanneer) is een open vraag voor productie.
