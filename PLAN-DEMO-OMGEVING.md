# Bouwplan: demo/sandbox-omgeving van Kluslus

Datum: 2026-06-19. Volgt op DEMO-OMGEVING-VOORSTEL.md. Test-first. Migratie indien nodig draait Rein op
prod; demo-DB doe ik.

## Besloten (uit het gesprek)

- **Optie A:** een kopie. Zelfde code (zelfde repo/branch), eigen demo-Supabase-project, eigen
  Vercel-demo-project met eigen instellingen. Loopt mee met elke migratie, veroudert dus nooit, botst
  nooit met productie.
- **Dubbel nut:** dezelfde kopie dient ook als "eerst testen, dan productie" (staging) via een aparte
  tak met een eigen preview-link. Werkwijze: branch -> preview testen -> pas dan naar master/productie.
- **SMS/mail aan, maar met allowlist.** De tester registreert zijn eigen 06/mail (+ evt. collega).
  Alleen die ontvangen echt; elke andere ontvanger (verzonnen klantnummers) wordt overgeslagen en
  gelogd. Hergebruik van de bestaande CM/Resend-sleutels; de allowlist is de grendel en wordt getest.
  **Fail-safe:** in demo-modus met een LEGE allowlist gaat er NIETS uit (nooit "naar iedereen").
- **Gevulde, altijd-actuele seed:** 2-3 nep-monteurs, ~6-8 klussen over alle statussen, één klaar om af
  te melden, plus lege ruimte om zelf te doen. Datums relatief aan vandaag, dus elke (re)seed schuift
  mee naar de huidige week.
- **Reset-knop:** alleen in de demo, met bevestiging; ververst meteen de datums naar deze week.

## Harde regels (veiligheid + architectuur) — niet schenden

1. **Allowlist is fail-closed in de verzendcode**, niet alleen env. `ontvangerToegestaan()` (lib/demo.ts)
   wordt aangeroepen in sms.ts én in de centrale verzendMail() in mail.ts; geen match = overslaan; demo +
   lege allowlist = niets versturen. (Gebouwd, getest.)
2. **Seed-data bevat UITSLUITEND nep-contactgegevens** (voorbeelddomein-mailadressen, fictieve 06-nummers).
   Nooit een echt klantnummer/-mail in de vuldata, als dubbele bodem naast de allowlist.
3. **Alle demo-gedrag via `isDemoMode()` (env DEMO_MODE), geen aparte codepaden.** Demo en productie
   deployen dezelfde code van master; het enige verschil is de env. Elk demo-onderdeel zit achter
   isDemoMode(). De demo_berichten-tabel staat in beide DB's (schema gelijk, geen drift) maar krijgt
   alleen in demo-modus schrijfacties.
4. **PDF-verwerking in het Ed-scenario** wordt in de demo getoond via de UPLOAD-route (F7), niet via
   inbound-mail. Bewuste keuze (zie F7); inbound-via-mail blijft fase 2. Niet stilletjes laten wegvallen:
   in het verhaal benoemen dat het in productie automatisch via mail binnenkomt.

## Architectuur

- Demo-deploy draait `master` (altijd de live versie) met demo-instellingen en demo-data.
- "demo-modus" wordt aangezet via een env-vlag `DEMO_MODE=1` op de demo-deploy. Die vlag stuurt:
  reset-knop + demo-banner zichtbaar, allowlist-fail-safe actief. Veiligheid tegen vreemden komt van de
  allowlist (+ fail-safe), niet van de vlag alleen.
- Opstart-/route-grendel: een demo-actie (reset) weigert hard als de Supabase-URL het PRODUCTIE-project
  blijkt te zijn. Voorkomt het ergste scenario (demo-deploy pakt per ongeluk prod-DB).

## Deel 1 — Fundament: grendels + kopie (test-first)

- [ ] T1. `lib/demo.ts`: `isDemoMode()` + `MAIL_ALLOWLIST` lezen. Unit-test.
- [ ] T2. `lib/mail.ts`: mail-allowlist net als SMS. Niet-toegestane ontvanger -> overslaan + loggen.
  In demo-modus met lege allowlist -> niets versturen (fail-safe). Unit-test.
- [ ] T3. `lib/sms.ts`: fail-safe bevestigen/uitbreiden: lege allowlist in demo = niets versturen. Unit-test.
- [ ] T4. `scripts/seed-demo.mjs`: nep-monteurs + klussen over alle statussen, één klaar om af te melden,
  pool met ruimte. Datums relatief aan vandaag (patroon uit screenshots.spec + fake-PDF-generator +
  setup-test-users). Idempotent: eerst leegmaken (alleen demo-DB!), dan vullen. Alleen tegen `SUPABASE_DEMO_DB_URL`.
- [ ] T5. `scripts/migrate` uitbreiden: één commando draait een blok ook tegen de demo-DB.
- [ ] T6. API-route `POST /api/demo/reset`: alleen als `DEMO_MODE=1` én de DB niet het prod-project is
  (harde prod-DB-grendel); draait de seed (service-role). Route-test (weigert buiten demo / op prod-DB).
- [ ] T7. UI: demo-banner ("DEMO, nepdata") + zichtbare "Speel opnieuw"-knop met bevestiging, demo-only.

## Deel 2 — Demo-ervaring (features 1 t/m 7)

- [ ] F1. **Live meebewegen** (feature 1): in demo-modus een lichte auto-verversing op dashboard,
  planbord en werkpool, zodat een wijziging binnen enkele seconden op het andere scherm verschijnt.
  Haakje: niet verversen terwijl een formulier/venster openstaat (anders wist het invoer). Client-component
  `DemoAutoRefresh`, alleen demo, met die guard.
- [ ] F2. **QR-code naar de monteur-app** (feature 2): op het dashboard een QR die `/demo/monteur` opent,
  een demo-only login-route die als het vaste demo-monteuraccount inlogt en naar de werkpool gaat (en
  `/demo/kantoor` idem). Gegrendeld op `DEMO_MODE` + alleen de vaste demo-accounts. QR lokaal genereren
  (kleine lib, geen externe dienst). Route-test op de grendel.
- [ ] F3. **Notificatie-activiteit zichtbaar** (feature 3): in demo-modus leggen de SMS/mail-functies elk
  (bedoeld) bericht vast in een `demo_berichten`-log (kanaal, ontvanger, korte inhoud, verstuurd/
  overgeslagen). Een paneel "Verstuurde berichten" toont de recente. Migratie (alleen demo-DB) +
  vastleg-logica met unit-test.
- [ ] F4. **"Wat kun je proberen?"-kaartje** (feature 4): statisch stappen-kaartje, demo-only, bij
  binnenkomst (plan een klus -> scan QR als monteur -> meld af).
- [ ] F5. **"Zet mijn gegevens in een voorbeeldklus"** (feature 5): demo-only helper waarmee de tester
  zijn eigen 06/mail op een voorbeeldklus zet en meteen echte SMS/mail krijgt. (Allowlist blijft in fase 1
  env-gebaseerd; zelf-registratie van de allowlist is een fase-2-verfijning.)
- [ ] F6. **Versie-/buildlabel in de voettekst** (feature 6): commit/buildtijd via `VERCEL_GIT_COMMIT_SHA`,
  alleen tonen in demo/staging. Voor "eerst testen dan productie".
- [ ] F7. **Voorbeeld-order-PDF** (feature 7): downloadbare voorbeeld-PDF in de demo (via de bestaande
  fake-PDF-generator) + de bestaande upload/parse-flow, zodat de tester de AI de order ziet inlezen.

## Verificatie (doorlopend)

Unit + integratie groen, typecheck/lint/build schoon. E2e voor reset-route, QR-login-grendel en de
live-meebeweeg-flow waar zinvol (Rein draait de browser-e2e).

## Jouw setup-stappen (eenmalig, ~30 min; ik kauw elke stap voor)

1. **Supabase:** nieuw project `kluslus-demo`. Geef me: Project URL, anon/publishable key, service/secret
   key, en de database-connectiestring. (Alleen jij kunt een project aanmaken.)
2. **Vercel:** nieuw project van dezelfde repo. Env-variabelen (waarden geef ik kant-en-klaar):
   demo-Supabase-keys, `DEMO_MODE=1`, `SMS_ALLOWLIST` + `MAIL_ALLOWLIST` = jouw 06/mail, CM/Resend-keys
   (hergebruik), `APP_URL` = demo-url. Geen eigen domein nodig (gratis vercel.app-adres).
3. Daarna doe ik: schema + migraties op de demo-DB, seed, reset-route, allowlist, banner.

## Fase 2 (later, pas als nodig)

- "Eerst testen dan productie" als vaste werkwijze: preview-deploys op feature-branches die naar de
  demo-DB wijzen; pas mergen naar master als het goed is. (F6, het buildlabel, ondersteunt dit nu al.)
- Eigen domein `demo.kluslus.nl`.
- Prospect-naam/branding in de seed (D-light) en schone-lei-bij-binnenkomst per prospect.
- Zelf-registratie van de allowlist (tester voert eenmalig zijn 06/mail in -> wordt de allowlist), i.p.v.
  env-gebaseerd. Maakt de demo volledig self-serve op afstand.
- Nachtelijke auto-reset (alleen als de demo onbeheerd publiek rondgaat).

## Volgorde van bouwen

1. Deel 1 (T1-T7): het fundament. De allowlist-grendel (T2/T3) en de prod-DB-grendel (T6) zijn
   randvoorwaarde en gaan vóór er ook maar iemand in de demo klikt.
2. Deel 2 (F1-F7): de demo-ervaring, in deze volgorde van waarde: eerst F1 (live meebewegen), F2 (QR) en
   F3 (notificaties zichtbaar), want die dragen de kernbelofte; daarna F4-F7.

Veel hiervan bouw en test ik lokaal + tegen de demo-DB zodra jij stap 1-2 (Supabase + Vercel) hebt
gedaan. F1 (live meebewegen) zoek ik sowieso eerst goed uit, want dat raakt de kern.

## Status 2026-06-19: alle code gebouwd (T1-T7 + F1-F7)

Alle 14 onderdelen zijn gebouwd, getest (689 unit groen, build + lint schoon) en gecommit op master
(lokaal). Alles gegrendeld op DEMO_MODE; productie-gedrag ongewijzigd.

**Wat nog moet (zodra jij het demo-project hebt aangemaakt):**
1. Jij: demo-Supabase + demo-Vercel aanmaken (DEMO-SETUP-STAPPEN.md), en mij de pooler-connectiestring +
   demo-URL + service-key geven (in .env.local als SUPABASE_DEMO_DB_URL, SUPABASE_DEMO_URL,
   SUPABASE_DEMO_SECRET_KEY), plus je 06/mail voor de allowlist.
2. Ik: schema-bootstrap + alle migratieblokken (t/m 24) tegen de demo-DB draaien, dan `npm run seed:demo`.
3. Jij: env-vars in de demo-Vercel zetten (DEMO_MODE=1 etc.) en deployen.
4. Push van master naar productie kan apart wanneer je wilt; de demo-code is daar inert (DEMO_MODE uit).
   Migratie blok 24 (demo_berichten) hoeft niet op productie (niets queryt het daar), mag wel voor
   schema-gelijkheid.

**Niet gedaan (bewust fase 2):** inbound mail-naar-app op de demo; eigen domein demo.kluslus.nl;
zelf-registratie van de allowlist; nachtelijke auto-reset.
