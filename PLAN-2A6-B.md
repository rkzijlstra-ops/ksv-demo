# PLAN Sessie 2A.6 - Blok B: opleveren -> rapport -> PDF -> mail

## STATUS (2026-05-29) - BLOK B COMPLEET
- B0 t/m B7: KLAAR + live geverifieerd (opleveren-mail kwam aan via Resend).
- Extra uit live-test-feedback van Rein:
  - B8: Concept-knop verwijderd (één meldingknop "Toevoegen aan rapport"; concepten kwamen toch al in
    het rapport). Meldingknop hernoemd, statuslabels "Verzonden" -> "In rapport".
  - B9: opdracht verwijderen (db + DELETE-route + knop met bevestiging; FK-cascade).
- 145 tests groen, tsc schoon, `next build` slaagt. Logboek: 2026-05-29_ksv-demo-sessie-2a6-blok-b.md.

Basis: BRAINSTORM-2A6.md (keuzes 4/5/6) + DESIGN-2A6.md. TDD per taak (RED -> GREEN -> commit).
Keuzes Rein (2026-05-29): Resend nu instellen; rapport naar eigen mail (Resend-testopzet, geen domein).
Testcommando: `npm test`. Baseline na Blok A: 125 tests groen.

## Aanpak / architectuur
- `pdf-lib` naar dependencies; `resend` installeren.
- Resend-config (RESEND_API_KEY, RAPPORT_EMAIL, RESEND_FROM) wordt in `lib/mail.ts` zelf gelezen +
  gevalideerd, NIET in de globale env-schema (anders breekt de hele app zonder key).
- Opleveren-volgorde in de route: PDF genereren -> uploaden -> mailen -> pas dan opgeleverd zetten.
  Mail mislukt => 502 + NIET op opgeleverd (brainstorm-edge-case). Rapport-PDF blijft wel bewaard.

---

## B0 - Dependencies + .env.example
- `npm install pdf-lib` (naar dependencies), `npm install resend`.
- `.env.example`: RESEND_API_KEY, RAPPORT_EMAIL, RESEND_FROM (default onboarding@resend.dev) met uitleg.
- Verifiëren: `npm test` blijft groen; package.json toont pdf-lib + resend in dependencies.
- Tijd: 6 min - Status: open

## B1 - lib/rapport.ts: PDF-generatie
- Bestand: `src/lib/rapport.ts` (+ `.test.ts`)
- `genereerRapportPdf(opdracht, meldingen): Promise<Uint8Array>` met pdf-lib: kop (klant/adres/ref/
  leverweek/opleverdatum) + per melding urgentie-label + tekst + datum. Foto's best-effort embedden
  (fetch foto_urls, embedJpg/Png, per foto try/catch zodat 1 kapotte foto het rapport niet sloopt).
- Test eerst: produceert bytes die met '%PDF' beginnen; werkt met 0 meldingen; faalt niet als een
  foto-fetch faalt (global fetch mocken).
- Tijd: 18 min - Status: open

## B2 - db: markeerOpgeleverd + groepering
- Bestand: `src/lib/db.ts` (+ `.test.ts`), `src/lib/werkbak.ts` (+ `.test.ts`)
- `markeerOpgeleverd(id, rapportUrl)`: update opdracht_status='opgeleverd', opgeleverd_at=now(), rapport_url.
- `groepeerMeldingen`: opdracht naar history als `opdracht_status === 'opgeleverd'` (of legacy status verzonden).
- Test eerst: markeerOpgeleverd-patch klopt; opgeleverde opdracht belandt in history.
- Tijd: 12 min - Status: open

## B3 - lib/mail.ts: Resend achter interface
- Bestand: `src/lib/mail.ts` (+ `.test.ts`)
- `verstuurOpleverRapport({ naar, opdracht, pdf, bestandsnaam })`: Resend SDK, from=RESEND_FROM
  (default onboarding@resend.dev), subject "Opleverrapport <klant> (ref <ref>)", PDF als attachment.
  Leest RESEND_API_KEY/RAPPORT_EMAIL zelf; duidelijke error als RESEND_API_KEY ontbreekt.
- Test eerst: mock resend, assert send-args (from/to/subject/attachment); gooit error zonder key.
- Tijd: 14 min - Status: open

## B4 - API: POST /api/opdrachten/[id]/opleveren
- Bestand: `src/app/api/opdrachten/[id]/opleveren/route.ts` (+ `.test.ts`)
- Flow: getMeldingById (404 bij onbekend) -> getMeldingenVoorOpdracht -> genereerRapportPdf ->
  storage.uploadOpdrachtDocument (rapport-PDF) -> verstuurOpleverRapport(naar=RAPPORT_EMAIL) ->
  markeerOpgeleverd. Mail-fout => 502, niet opgeleverd.
- Test eerst: happy path zet opgeleverd + returnt rapport_url; mail-fout => 502 + niet gemarkeerd; 404.
- Tijd: 15 min - Status: open

## B5 - UI: opleveren-knop + rapportpagina-link
- Bestand: `src/components/OpleverKnop.tsx` (client) + `src/app/opdracht/[id]/page.tsx`
- Detail: bij opdracht_status 'open' knop "Opdracht opleveren" (bevestiging bij 0 meldingen);
  bij 'opgeleverd' tonen "Opgeleverd op <datum>" + knop "Rapport openen" (rapport_url).
- Verifiëren: browser (na B-live).
- Tijd: 18 min - Status: open

## B6 - rapportpagina (web-bron)
- Bestand: `src/app/opdracht/[id]/rapport/page.tsx`
- Server-rendered: kop + meldingen + foto's (FotoGalerij), print-vriendelijk. Link vanaf detail.
- Verifiëren: browser.
- Tijd: 12 min - Status: open

## B7 - live test (Rein)
- RESEND_API_KEY + RAPPORT_EMAIL (= je Resend-account-mail) in .env.local.
- Lever een opdracht op -> mail met PDF binnen, opdracht naar history, rapport te openen.
- Tijd: 10 min - Status: open

---
Na Blok B: logboek-entry + PROJECT.md bijwerken. Daarna eventueel zelf-gebruik fase / 2A.5.
