# Stap 2: mail-naar-app (inbound)

Datum: 2026-06-13

## STATUS: GEPAUZEERD (2026-06-13)

De app-kant is af, getest en **live op productie** (migratie 18 op prod gedraaid, CI groen). De feature
**werkt nog niet end-to-end**, want de mail-ontvangst-infra staat nog niet aan. Je ziet wel je
ontvangstadres bij Mijn gegevens en het lege "te verwerken"-bakje, maar er komt nog geen mail binnen.

**Hervatten = deze externe setup doen (Rein), daarna een test:**
1. Resend → Domains → `kluslus.nl` → **Receiving aanzetten**; het getoonde **MX-record** toevoegen bij de
   DNS van kluslus.nl.
2. Resend → Webhooks → event **`email.received`** → URL `https://<app-url>/api/inbound`; **signing secret**
   (`whsec_...`) kopiëren.
3. Vercel env: `RESEND_WEBHOOK_SECRET=<whsec_...>` en `INBOUND_DOMAIN=kluslus.nl`; **redeploy**.
4. Test: mail met PDF naar `klus-<token>@kluslus.nl` → verschijnt als voorstel in `/inbox`.

**Daarna nog open (verfijning, niet blokkerend):** een voorstel aanpassen vóór bevestigen (zelf-invoer-
formulier in edit-modus). En het idee "verstuurd met Kluslus"-regel op de zaak-versie van het rapport
om de lead-blootstelling te versterken (zie [[project_ksv-leads-model]] in geheugen).

---


Tweede spoor van "zelf invoeren makkelijker": een monteur stuurt een mail van zijn opdrachtgever
(met PDF/foto's) naar een eigen adres, de app haalt eruit wat bruikbaar is en zet het als voorstel
in een "te verwerken"-bakje dat hij bevestigt. App-kant gebouwd en live; mail-ontvangst wacht op de
Resend/DNS-setke (zie onder).

## Keuze infra

Resend Inbound (Receiving), want we gebruiken Resend al en kluslus.nl is daar geverifieerd. De SDK
(`resend.emails.receiving.get(id)` + `...attachments.get({emailId,id})`) en de webhook `email.received`
(`data.email_id`, `data.to[]`, `data.attachments[]`) zijn de basis.

## Wat is gebouwd

- **Migratie 18** (`schema-compleet-18-inbound.sql`, op test én prod gedraaid): `meldingen.te_verwerken`
  (default false, houdt voorstellen uit de werkpool) en `profielen.inbound_token` (uniek, per-monteur
  ontvangstadres).
- **`src/lib/inbound.ts`**: token genereren (16 hex), adres `klus-<token>@<INBOUND_DOMAIN>` bouwen, token
  uit een ontvanger-adres halen (ook uit "Naam <adres>"). Pure + getest.
- **`src/lib/webhook-handtekening.ts`**: Svix-handtekening van de Resend-webhook verifiëren (+ test).
- **`/api/inbound`**: webhook-endpoint. Verifieert de handtekening (als de secret gezet is), herkent de
  monteur aan het token, haalt mail + bijlagen op, parseert elke PDF tot een `te_verwerken`-voorstel
  (document bewaard). Geen PDF: één voorstel met het onderwerp als hint + de bijlagen. Maakt nooit blind
  een echte klus.
- **db**: `getProfielByInboundToken`, `ensureInboundToken`, `getInboxVoor`, `markeerVerwerkt`;
  `createOpdracht` zet `te_verwerken`; de werkpool verbergt voorstellen.
- **UI**: `/inbox` (bakje met Bevestigen → werkpool / Weggooien), werkpool-banner "N klussen te
  verwerken uit je mail", en het ontvangstadres bij Mijn gegevens. E2e voor de bevestig-flow.

## Nog te doen (Rein, extern) voor echte ontvangst

Resend Receiving aanzetten op kluslus.nl + MX-record bij DNS; webhook `email.received` →
`/api/inbound`; in Vercel `RESEND_WEBHOOK_SECRET` + `INBOUND_DOMAIN=kluslus.nl`, redeploy.

## Bewust nog niet

Een voorstel aanpassen vóór bevestigen (nu: bevestigen-zoals-het-is of weggooien; gegevens zie je in
het geopende voorstel). Logische volgende verfijning: het zelf-invoer-formulier hergebruiken in
edit-modus. Lead-context: de opdrachtgever die het rapport ontvangt is de lead, niet het klant-mailadres
([[project_ksv-leads-model]] in geheugen).

## Verificatie

tsc schoon, 573 unit-tests groen (+ inbound/handtekening), e2e inbox-bevestig-flow, CI volledig groen.
Migratie eerst op prod gedraaid (Rein) voor de deploy, want createOpdracht en de werkpool lezen de
nieuwe kolom (schema-drift-valkuil vermeden).
