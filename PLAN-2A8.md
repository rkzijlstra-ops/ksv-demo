# PLAN Sessie 2A.8 - Mobiel polijsten

Basis: live-feedback Rein na zelf-gebruik op 5G. Vijf concrete verbeteringen.

## E1 - Foto's ook uit eigen galerij
- Bestand: `src/components/FotoMaken.tsx`
- Verwijder `capture="environment"` van het file-input zodat iOS het standaard "Foto-bibliotheek / Foto nemen / Bestand kiezen"-menu opent. Een knop, twee mogelijkheden, geen UI-vervuiling.
- Verifiëren: telefoon -> melding -> Foto toevoegen toont OS-keuze menu.
- Tijd: 5 min. Status: open

## E2 - Bevestiging bij terug-navigeren met onopgeslagen werk
- Bestand: `src/components/MeldingForm.tsx`, `src/app/opdracht/[id]/melding/page.tsx`, `src/app/opdracht/[id]/melding/[meldingId]/page.tsx`
- MeldingForm signaleert `isDirty` (foto's of tekst ingevoerd, niet identiek aan bestaand).
- Een client-component wrapt de "Terug naar opdracht"-link en intercept de klik wanneer dirty -> `window.confirm("Melding is niet opgeslagen. Weggooien en terug?")`.
- Alleen relevant voor de melding-pagina's (niet voor opdracht-detail zelf).
- Tijd: 25 min. Status: open

## E3 - Spraak: 5s stilte-VAD + bitrate omlaag + start/stop geluidjes + visuele indicatie
- Bestand: `src/components/SpraakOpname.tsx`
- **VAD**: Web Audio AnalyserNode op MediaStream; als amplitude < threshold gedurende 5s -> stop automatisch.
- **Bitrate**: `MediaRecorder` opnemen met opus-codec op 24kbps (was waarschijnlijk hoger). Werkt voor spraak.
- **Geluid bij start/stop**: korte oscillator-beeps via Web Audio API. Start = oplopende toon (660Hz korte beep), stop = dalende toon (440Hz korte beep). Geen audio-bestand nodig.
- **Visuele indicatie**: een knipperend rood puntje of "luistert..."-tekst zolang opname loopt, en duidelijke indicatie wanneer stilte detected wordt.
- Tijd: 35 min. Status: open

## E4 - Foto's sneller: thumbnails via Supabase Storage transform + next/image
- Supabase Storage URL kan een transform-parameter krijgen: `/storage/v1/render/image/public/{bucket}/{path}?width=400&quality=70`. Daarmee komt een verkleinde versie over de lijn.
- Code: `src/components/FotoGalerij.tsx` aanpassen om transform-URL te gebruiken voor grid-weergave; full-res alleen on-click/lightbox.
- Eventueel `next/image`-component overwegen, maar Supabase transform alleen is al ~70-90% kleiner.
- Verifiëren: werkbak + opdracht-detail laden sneller op 5G.
- Tijd: 25 min. Status: open

## E5 - Live test + push naar Vercel
- `npm test` groen, `npm run build` slaagt, `git push origin master` -> Vercel rebuild ~60s.
- Op telefoon over 5G: foto laden snelheid voelt beter, spraak hoorbaar geluid bij start/stop, terug zonder opslaan -> bevestiging, galerij-keuze beschikbaar.
- Tijd: 10 min. Status: open

Na E5: logboek-entry afsluiten van deze polijst-sessie.
