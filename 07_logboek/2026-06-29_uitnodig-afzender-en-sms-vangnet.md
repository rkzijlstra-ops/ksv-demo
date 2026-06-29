# Uitnodig-afzender gladgetrokken + SMS-vangnet (2026-06-29)

## Aanleiding
Monteur Thu's uitnodigingsmail belandde in de spam, de Supabase magic-link in de inbox. Onderzoek wees
uit: authenticatie van kluslus.nl is goed (DKIM aligned, DMARC `p=reject; adkim=s; aspf=s` slaagt via
DKIM), dus geen auth-fout. De spam-plaatsing komt door reputatie (koud, nieuw verzenddomein vs Supabase'
warme infra), de afzender-naam "Keukenstudio Voorschoten" die botst met domein kluslus.nl, en dunne
inhoud. Details in `BRAINSTORM-UITNODIG-FLOW-SMS.md`.

## Gebouwd (branch `uitnodig-flow-sms`, off origin/master)
1. **Afzender lidmaatschap-mails** = "&lt;zaak&gt; via Kluslus &lt;adres&gt;" via nieuwe helper
   `lidmaatschapAfzender` in `mail.ts`, toegepast op uitnodiging én afmelding. Herkenbare zaaknaam,
   domein-merk erachter zodat naam/domein niet meer botsen.
2. **Uitnodig-mail-inhoud** zaaknaam-prominent: onderwerp "&lt;zaak&gt; heeft je toegevoegd aan de
   planning-app", opening noemt de zaak + één uitlegzin over Kluslus.
3. **SMS-vangnet** (`uitnodig-sms.ts`): bij een geldig 06 gaat er een korte SMS mee met zaaknaam, Kluslus
   en de login-URL. Geen inloglink in de SMS; de monteur vraagt op `/login` zelf een magic link aan
   (die via Supabase betrouwbaar in de inbox komt). Afzender via `smsAfzender` (zaaknaam, env-fallback).
4. **Route** `mensen/uitnodigen`: leest optioneel 06, normaliseert naar +31 (`normaliseerNlMobiel`),
   schrijft het op het profiel (alleen als geldig, anders bestaand nummer ongemoeid), stuurt de SMS
   best-effort. Respons: `mailVerstuurd`, `smsGevraagd`, `smsVerstuurd`.
5. **Formulier** `UitnodigForm`: optioneel 06-veld met korte uitleg ("Stuurt er een SMS bij, voor het
   geval de mail in de spam belandt. Optioneel."), toont SMS-status in de bevestiging.

## Tests
Test-first. 928 unit groen, typecheck 0, lint 0. Nieuw/uitgebreid: uitnodig-mail.test, uitnodig-sms.test
(nieuw), mail.test (From-naam uitnodiging + afmelding), uitnodigen/route.test (06-paden). TESTDEKKING.md
en TOESTANDEN.md bijgewerkt in dezelfde wijziging.

## Bewust open
- Overige opdracht-mails (annulering/ontplanning/herinnering/document/terugmelding) gebruiken nog de kale
  afzender; later gelijktrekken indien gewenst.
- Spam-headers van Thu's mail nog niet ingezien (Rein had ze niet); de diagnose staat los daarvan al hard
  op de DNS.

## Status
Op de test-omgeving gezet voor Reins visuele keuring. NIET naar master (STOP-poort = Rein).
