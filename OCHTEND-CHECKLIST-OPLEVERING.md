# Ochtend-checklist: oplevering live krijgen

De code staat klaar op branch `feat/oplevering` (alle tests groen, `next build` slaagt).
Dit zijn de stappen die jouw input nodig hebben. Doe ze in deze volgorde.

## 1. Supabase: migratie draaien
- Open de Supabase SQL-editor van dit project.
- Plak en draai de inhoud van `supabase/schema-oplevering.sql`.
- Dit maakt: tabel `opleveringen`, kolom `keukenzaak` op `meldingen`, en de storage-bucket
  `oplever-videos` (publiek). Idempotent, herhaald draaien is veilig.
- Controleer in Table Editor dat `opleveringen` bestaat en dat `meldingen` een
  `keukenzaak`-kolom heeft.
- Controleer in Storage dat de bucket `oplever-videos` er is en op public staat.

## 2. Env-variabelen controleren
De video-upload gebeurt rechtstreeks vanuit de browser, die heeft de publieke Supabase-keys
nodig. Controleer in `.env.local` (en in Vercel) dat deze staan:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- En de bestaande: `RAPPORT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM`, server-side
  Supabase-keys, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`.
Zie `.env.example` voor de volledige lijst.

## 3. Deployen
- Branch `feat/oplevering` naar Vercel (merge naar je hoofdbranch of een preview-deploy).
- Wacht tot de deploy klaar is.

## 4. Functioneel testen op de telefoon (Android, jij)
Open een montage- of service-opdracht en tik "Oplevering starten":
- [ ] Foto's maken van de eindstaat, zie ze verschijnen.
- [ ] Video opnemen, upload lukt, "Video vastgelegd" verschijnt.
- [ ] Uitkomst kiezen (Afgerond / Nog openstaande punten).
- [ ] Zacht-verplicht: probeer te versturen zonder foto/video, je krijgt de
      "toch doorgaan?"-waarschuwing.
- [ ] Handtekening: "Klant laten tekenen", teken iets, en ook de "Toch overslaan"-route.
- [ ] Versturen: rapport komt per mail bij de zaak, met de juiste zaaknaam en de videolink.
- [ ] Opdracht staat daarna op "Opgeleverd", rapport-PDF te openen vanaf de opdracht.
- [ ] Offline: "Oplevering starten" is grijs met "netwerk nodig".
- [ ] Een KKS- en een KSV-opdracht: juiste zaaknaam in kop, rapport en mail.

## 5. iPhone-test via collega
- [ ] Handtekening-canvas werkt op iOS Safari (touch).
- [ ] Video opnemen + uploaden werkt op iOS.

## Bekende latere punten (niet nu)
- Keukenzaak van een al-aangemaakte opdracht achteraf corrigeren (nu: parser + handmatig
  veld bij aanmaken; geen edit-knop op detail). Kleine toevoeging als je het nodig hebt.
- Ontvanger-mailadres per zaak/opdracht (nu vast `RAPPORT_EMAIL`).
- Video-bewaarbeleid / opslagkosten in de gaten houden.
- `verstuurSpoedMelding` zegt nog "Keukenstudio Voorschoten" hardcoded (los van deze flow).
