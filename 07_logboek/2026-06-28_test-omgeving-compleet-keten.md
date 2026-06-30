# Test-omgeving compleet maken: hele keten veilig testbaar (27 -> 28 juni 2026)

Doel: van de bestaande test-omgeving (kluslus-test) één veilige plek maken waar de hele
keten (mail-invoer, klus, uitgaande mail, sms) end-to-end loopt, zonder vierde database
of vierde omgeving. Aanleiding: op geen enkele veilige omgeving kon de hele loop
dichtgetest worden, en testruns overschreven handmatige keuringsdata.

Spec: `docs/superpowers/specs/2026-06-27-test-omgeving-compleet-keten-design.md`
Plan: `docs/superpowers/plans/2026-06-27-test-omgeving-compleet-keten.md`

## Besluit (na afweging)

Geen vierde DB en geen aftakking op de demo. De demo draait in nepmodus (DEMO_MODE),
stuurt naar iedereen en draait master, niet de feature-branch. De test-omgeving
(kluslus-test, echt product, allowlist = alleen Reinier, draait de branch) is de juiste
basis; die compleet gemaakt.

## Resultaat: alles LIVE op master

- **PR #31** — data-isolatie (fase 5) + automatische keten-test (fase 4).
- **PR #30** — app-versie automatisch uit build-id (fase 6).

### Fase 1 — mail-invoer echt op test
Eigen subdomein `klus-test.kluslus.nl`, MX naar `inbound-smtp.eu-west-1.amazonaws.com`,
DKIM + SPF; Resend-domein verified + Receiving aan; webhook `email.received` ->
`https://kluslus-test.vercel.app/api/inbound`. In Vercel (kluslus-test):
`INBOUND_DOMAIN=klus-test.kluslus.nl` + `RESEND_WEBHOOK_SECRET`. Live geverifieerd: een
correct met svix ondertekende `email.received` gaf HTTP 200 `{voorstellen:1}` en er
ontstond een echte klus in de test-DB. Productie (`klus.kluslus.nl`) ongemoeid.

### Fase 2 — sms echt naar alleen Reinier op test
`SMS_DRY_RUN=0` + `SMS_ALLOWLIST=+31631665814` op kluslus-test. Kanaal bewezen: een
echte test-sms via de project-sms-code kwam aan op Reiniers telefoon.

### Fase 3 — instellingen leesbaar
De niet-geheime env-vars op kluslus-test (`*_DRY_RUN`, `*_ALLOWLIST`, `DEMO_MODE`,
`TEST_LOGIN`, `RESEND_FROM`, `CM_GW_URL`, `SMS_AFZENDER`, `INBOUND_DOMAIN`) van
"sensitive" naar zichtbaar gezet (verwijderen + opnieuw aanmaken; omzetten kan Vercel
niet). Echte geheimen (keys/tokens/DB) blijven sensitive.

### Fase 4 — automatische keten-test
`integration/keten.int.test.ts`: inbound-route -> plannen -> bevestigen (mail + sms-poging
op dry-run gecontroleerd) -> opleveren (rapport-mailpoging), in één doorloop. Groen
betekent nu echt dat de keten werkt.

### Fase 5 — data-isolatie (de echte oorzaak van overschreven keuringsdata)
Niet de e2e-teardown (was al prefix-gescoped), maar de integratie-tests die in `wipe()`
de hele `meldingen`-tabel leegden (draait in CI). Nu gescoped via
`integration/int-harnas.ts` (eigen INT-zaak + `INT_PREFIX`); `int-isolatie.int.test.ts`
bewijst dat een keuring-klus onder een andere zaak blijft staan.

### Fase 6 — app-versie automatisch
`public/sw.js` met placeholder `ksv-__BUILD_ID__`; `scripts/genereer-sw-versie.mjs` zet
de versie bij `prebuild` uit `VERCEL_GIT_COMMIT_SHA`. Geen handmatige bump meer.

## Leerpunt: CI-race op de gedeelde test-DB

De eerste CI-runs van #30 en #31 werden allebei rood. Oorzaak was niet de code (lokaal
groen), maar dat beide CI-runs tegelijk tegen dezelfde test-DB draaiden en #30 (nog
zonder de wipe-fix) de data van #31 wiste. Opgelost door de runs te serialiseren: #31
solo opnieuw -> groen -> merge; #30 daarna op de nieuwe master gerebased -> solo groen ->
merge. Dit is precies de valkuil uit `CLAUDE.md`: geen overlappende CI/keuring op de
gedeelde test-DB. Met de wipe-fix in master is de impact daarvan kleiner geworden.

## Nog open (optioneel, geen blocker)

De volledige data-isolatie-cutover: eigen keuring-zaak + keuring-accounts in een eigen
namespace, e2e-accounts losmaken van de echte-mail-fallback, en de GitHub Actions-secret
`ENV_TEST` bijwerken. Uitgeschreven in `docs/superpowers/plans/fase5-cutover-handmatig.md`.
Het hoofdprobleem (brede wipe) is al weg, dus dit is een extra isolatie-laag.

## Opruiming

De drie feature-worktrees/branches (app-versie-autobump, keten-test, test-isolatie) zijn
na merge verwijderd. Reiniers eigen worktrees zijn ongemoeid.
