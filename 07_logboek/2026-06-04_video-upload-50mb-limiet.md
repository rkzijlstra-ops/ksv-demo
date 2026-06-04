# Video-upload liep vast: 50 MB Storage-limiet, niet de duur

## Klacht
Oplevering "Dijk" bleef op "niet verzonden" staan. Video-upload faalde met een
melding die als "te lang" werd gelezen, ook na upgrade naar Supabase Pro, en ook
met een kortere video.

## Oorzaak
- Video's gaan rechtstreeks vanuit de browser naar de Storage-bucket
  `oplever-videos` (zie `src/lib/oplever-upload.ts`).
- De bucket is aangemaakt zonder eigen `file_size_limit`
  (`supabase/schema-oplevering.sql` r. 35-37), dus hij erft de globale
  Storage-limiet van het project.
- Die globale limiet stond nog op 50 MB. Pro verhoogt alleen het maximum dat je
  *mag* instellen (tot 50 GB), niet de instelling zelf. Die moet je handmatig
  ophogen.
- Een telefoonvideo is al snel groter dan 50 MB (1080p ~130 MB/min, 4K
  ~350 MB/min), dus ook de kortere video viel buiten de grens. Het ging om
  bytes, niet om seconden.
- De server gaf 413 (Payload Too Large); de app toonde dat als
  "Video-upload mislukt (413)".

## Fix (in Supabase, door Reinier)
In deze volgorde:
1. Dashboard -> Storage -> Settings -> "Upload file size limit" op 1024 MB.
2. SQL-editor: `update storage.buckets set file_size_limit = 1073741824 where id = 'oplever-videos';`
Bucket-limiet kan nooit boven de globale limiet, dus stap 1 eerst. 1 GB gekozen
zodat ook 2 minuten 4K (~700 MB) past met marge.

## Codewijziging
- `src/lib/oplever-upload.ts`: 413 wordt nu vertaald naar een begrijpelijke
  melding voor de monteur ("Video te groot... neem kortere video of lagere
  kwaliteit") in plaats van de rauwe statuscode.

## Open / overweging
- Grote video's (honderden MB) over 4G zijn traag en kwetsbaar voor afbreken.
  Betere aanpak op termijn: video client-side comprimeren/cappen naar 1080p
  voor upload, zodat 2 minuten ~150 MB wordt i.p.v. ~700 MB. Apart bouwwerk,
  nog niet gedaan.
- Eventueel later: resumable upload (TUS) i.p.v. losse POST voor robuustheid.
