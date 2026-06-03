# KSV Demo - Sessie 2A.6 Blok B gebouwd (opleveren + rapport + mail)

Datum: 2026-05-29
Project: `01_projecten/keukenstudio-voorschoten-demo`
Doel Blok B: opdracht opleveren -> opleverrapport (PDF) -> per mail. Plus feedback-fixes uit live-test.
Resultaat: end-to-end werkend en live geverifieerd (mail kwam aan). 145 tests groen, tsc schoon, build slaagt.

## Keuzes (door Rein bevestigd)
- Mail via Resend, eigen account-key nu ingesteld; rapport gaat naar Reins eigen mailadres
  (Resend-testopzet, geen eigen verzend-domein nodig). `lib/mail.ts` schermt Resend af, config wordt
  daar zelf gelezen (RESEND_API_KEY / RAPPORT_EMAIL / RESEND_FROM), niet in de globale env-schema.

## Wat is gebouwd (TDD)
- `lib/rapport.ts`: `genereerRapportPdf` met pdf-lib (kop + meldingen + foto's best-effort embedden,
  defensief per foto). `pdf-lib` naar dependencies, `resend` toegevoegd.
- `lib/mail.ts`: `verstuurOpleverRapport` via Resend; duidelijke fout zonder key.
- `db.markeerOpgeleverd` + `groepeerMeldingen`: opgeleverde opdracht naar history.
- `POST /api/opdrachten/[id]/opleveren`: PDF -> upload -> mail -> markeren. Mail-fout = 502 en NIET
  op opgeleverd (rapport-PDF blijft wel bewaard).
- UI: `OpleverKnop` op opdracht-detail (bevestiging + leeg-rapport-waarschuwing); bij opgeleverd een
  groen blok met "Rapport-PDF openen". Rapportpagina `/opdracht/[id]/rapport` als leesbare web-bron.

## Live-test + feedback van Rein (en wat eruit volgde)
- Mail kwam aan (na de echte opleveren-actie). Opleverketen werkt end-to-end.
- **Feedback 1:** de melding-knop "Verzenden" (pijl-icoon) suggereerde mailen, terwijl een melding
  alleen wordt klaargezet voor het rapport. -> hernoemd naar "Toevoegen aan rapport" / "Bijwerken in
  rapport" met vinkje-icoon; statuslabel "Verzonden" -> "In rapport"; history-kop -> "Opgeleverd".
  (Geheugen: feedback-eerlijke-knop-labels.)
- **Feedback 2:** wat doet de Concept-knop? Bleek: concepten kwamen óók in het rapport, dus de knop
  deed niets onderscheidends. -> Concept-knop verwijderd; nog maar één knop, elke melding telt mee.
- **Feedback 3:** een foutief ingeschoten opdracht kon niet gewist worden. Was geen bewuste keuze,
  alleen nog niet gebouwd (en nog geen auth). -> `db.verwijderOpdracht` + `DELETE /api/opdrachten/[id]`
  + `VerwijderKnop` op detail met bevestiging. FK-cascade ruimt documenten + meldingen. Permissies
  (wie mag wissen) komen later met auth (2A.5).

## Aandachtspunten / geparkeerd
- Resend-testopzet stuurt alleen naar het eigen account-mailadres; voor mailen naar de zaak/derden
  later een eigen verzend-domein verifiëren (DNS, geen code-herbouw; `lib/mail.ts` blijft gelijk).
- Bij verwijderen blijven de bestanden in de storage-buckets achter (ongebruikt). Voor de demo prima;
  later eventueel opruimen.
- `onboarding@resend.dev` kan bij Gmail in spam/Promoties belanden.

## Stand
Sessie 2A.6 (documenten + opleverrapport) compleet. Demo kan nu: opdracht met meerdere documenten
aanmaken, meldingen met foto/spraak toevoegen, opleveren tot een gemailde PDF, en foutieve opdrachten
wissen. Volgende logische stappen blijven: zelf-gebruik fase, daarna 2A.5 (auth/RLS), dan 2B (Gmail).
