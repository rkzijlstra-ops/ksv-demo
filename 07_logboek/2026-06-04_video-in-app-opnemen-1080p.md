# Video in-app opnemen op 1080p (i.p.v. 4K uit de camera-app)

## Aanleiding
Na de 50 MB-fix (zie `2026-06-04_video-upload-50mb-limiet.md`) bleef het echte
probleem: een telefoonvideo van 2 minuten is al snel 400-700 MB en uploadt traag
en kwetsbaar over 4G. Oplossing: klein opnemen vanaf het begin in plaats van een
groot bestand achteraf comprimeren (te zwaar/crasht op een telefoon).

## Wat gebouwd
- `src/lib/video-opname.ts` (+ test): pure helpers en constanten.
  - `VIDEO_OPNAME_CONSTRAINTS` (1080p achtercamera + audio),
    `VIDEO_BITS_PER_SECOND` = 5 Mbps (~37 MB/min, dus 2 min ~75 MB).
  - `kiesVideoMimeType` kiest mp4 (breedst afspeelbaar), valt terug op webm.
  - `isGrootBestand` / `bytesNaarMB` / `GROOT_BESTAND_BYTES` (200 MB) voor de
    galerij-waarschuwing.
- `src/components/VideoOpnemen.tsx`: in-app opnamescherm met live preview,
  start/stop, timer, gecapte bitrate via MediaRecorder. Levert een File af via
  `onCapture`. Patroon volgt `SpraakOpname.tsx` (refs, cleanup, track-stop).
- `src/components/VideoMaken.tsx`: "Opnemen" opent nu het in-app scherm (niet
  meer de native camera met `capture`). "Galerij" blijft, maar toont bij een
  bestand > 200 MB één korte regel: "Groot bestand (~X MB), uploaden kan even
  duren. Tip: opnemen in de app gaat sneller." Geen blokkade.

## Keuzes
- 1080p i.p.v. 720p: detail telt voor een opleveringsvideo (schade/afwerking),
  en ~75 MB voor 2 min blijft klein genoeg.
- Galerij niet verwijderd maar behouden met waarschuwing, op verzoek.

## Verificatie
- `vitest run`: 353 tests groen (incl. 6 nieuwe voor video-opname).
- `next build`: slaagt (types + lint ok).
- NIET getest: de echte camera-opname op een toestel. getUserMedia +
  MediaRecorder gedraagt zich per telefoon/browser anders (vooral iOS Safari).
  Reinier moet dit op de telefoon proberen na deploy.

## Te doen door Reinier
1. Branch deployen (Vercel).
2. Op de telefoon: Opnemen -> camera/microfoon toestaan (eenmalig) -> 1080p
   opname -> upload -> versturen. Ook galerij-route en de tip checken.
