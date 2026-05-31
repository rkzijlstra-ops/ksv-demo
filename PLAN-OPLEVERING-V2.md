# Oplevering v2 - verbeteringen uit testronde

Datum: 2026-05-31
Status: beslissingen akkoord in chat, gaat naar bouw. Branch `feat/oplevering-v2`.
Aanpak: TDD waar logica zit, browser-only stukken gebouwd en handmatig te testen. Commit per blok.

## Beslissingen (akkoord)

1. **Voortgang tonen.** Echte procentbalk bij de video-upload (XHR met upload-progress naar
   Supabase Storage), nette stap-tekst bij server-werk (rapport). Eén gedeeld
   `Voortgang`-component. "Bezig" overal vervangen door wat er echt gebeurt
   ("Informatie inlezen…", "Video uploaden…", "Rapport maken…").
2. **Eindstaat geschrapt.** Geen afgerond/openstaande-keuze meer. De monteur legt bewijs +
   optionele notitie + handtekening vast en verstuurt; bij succes een korte
   "Opgeleverd!"-animatie als beloning. De uitkomst-kolom blijft (default 'afgerond'), maar
   wordt niet meer gekozen of in het rapport getoond.
3. **Tekstveld + spraak op de oplevering.** Vrij notitieveld (geen melding) met inspreek-knop;
   komt in rapport en mail.
4. **Menu + uitleg.** Menu met uitloggen (bestaat al), "Over de app"-hulppagina en app-versie.
5. **Prullenbak.** Verwijderen wordt soft-delete (`verwijderd_at`) met herstel; aparte
   prullenbak-weergave; definitief wissen apart.
6. **WhatsApp-stuur-knop** naast bellen (wa.me deeplink, eenrichting). Tweeweg-koppeling is
   een later, apart betaald project (WhatsApp Business Platform), niet nu.

Supabase Pro-upgrade (voor grote video's) doet Rein los; de bouw hangt er niet op.

## Blokken

### Blok 1 - Voortgang + duidelijke status
- `src/lib/voortgang.ts` (+ test): pure helpers (percent clampen/formatteren, storage-upload-URL bouwen).
- `src/components/Voortgang.tsx`: balk, determinate (percent) of indeterminate, met label.
- Video-upload met echte progress: XHR PUT naar Supabase storage REST met sessie-token,
  `upload.onprogress`. Vervangt de huidige `.upload()` in de video-stap.
- "Bezig"-teksten vervangen in OpdrachtAanmaken, FotoMaken, OpleverFlow, VideoMaken.

### Blok 2 - Eindstaat schrappen + animatie
- `oplever-validatie.ts` (+ test): uitkomst eruit; `magVersturen` altijd true; alleen
  zachte `waarschuwing` als geen bewijs.
- Concept-route `oplevering`: uitkomst niet meer verplicht (default 'afgerond'); tests bij.
- `rapport.ts` (+ test): uitkomst-regel weg uit PDF; `rapportSamenvatting` zonder uitkomst.
- `OpleverFlow`: uitkomst-UI weg; "Opgeleverd!"-animatie na succes.

### Blok 3 - Tekstveld + spraak
- `supabase/schema-oplevering-v2.sql`: kolom `opmerking text` op `opleveringen`.
- db: `OpleveringConceptInput.opmerking`, upsert neemt het mee (+ test).
- Concept-route: `opmerking` accepteren (+ test).
- `OpleverFlow`: textarea + `SpraakOpname` (hergebruik).
- `rapport.ts`: opmerking tonen indien aanwezig (+ test). mail: opmerking meenemen (+ test).

### Blok 4 - Menu + uitleg + versie
- `src/lib/versie.ts`: app-versie-constante.
- `UserMenu`: link "Over de app" + versie tonen.
- `src/app/over/page.tsx`: korte hulppagina (wat doet de app, opleveren, offline, contact Rein).

### Blok 5 - Prullenbak (soft-delete)
- `supabase/schema-oplevering-v2.sql`: kolom `verwijderd_at timestamptz` op `meldingen` + index.
- db (+ tests): `verwijderOpdracht` wordt soft (zet `verwijderd_at`); `herstelOpdracht`;
  `getVerwijderdeOpdrachten`; `definitiefVerwijderen` (hard delete); `getMeldingen` filtert
  `verwijderd_at is null`.
- Routes: herstel + definitief wissen.
- `src/app/prullenbak/page.tsx` + knoppen. Link vanuit menu.

### Blok 6 - WhatsApp-knop
- `src/lib/whatsapp.ts` (+ test): NL-nummer normaliseren naar internationaal, wa.me-URL bouwen.
- `src/components/WhatsAppKnop.tsx`: naast `BelKnop` op opdracht-detail.

### Blok 7 - Afronden
- `npm test` groen, `next build` slaagt.
- Ochtend-checklist v2 bijwerken (SQL v2 draaien, Supabase Pro voor video, testpunten).

## Niet nu (bewust)
- WhatsApp tweeweg (Business Platform): apart betaald project.
- Echte client-side videocompressie.
