# FASE 5 cutover: data-isolatie tussen CI en handmatige keuring (handmatig, samen met Reinier)

Doel: CI-runs en Reiniers handmatige keuring delen veilig dezelfde test-DB (`mslexkwwhhwlxmwbnyff`),
zonder dat een testrun zijn keuringsdata wist. Dit document is het stappenplan voor de cutover die
Reinier en de hoofdsessie samen doen. De veilige, omkeerbare code-stappen (test-first) zijn al gedaan op
branch `test-isolatie`; dit document beschrijft wat NOG handmatig moet en welke geheimen/accounts
coordinatie vereisen.

## Wat al klaar/veilig is (branch `test-isolatie`)

- `e2e/global-teardown.ts` is puur prefix-gescoped: het wist alleen klussen waarvan `klant_naam` op een
  vaste prefix begint (`E2E %`, `ZELF %`, `WERKOMS %`, `KANTOOR %`, `VERPLAATS %`, `ONTPLAN %`, `TERUG %`)
  plus de tijdelijke test-opdrachtgever. GEEN brede wis. De opruimkern is uitgesplitst naar
  `ruimE2eKlussenOp(admin)` zodat hij testbaar is.
- `integration/isolatie.int.test.ts` bewijst tegen de echte test-DB dat de teardown een keuring-klus met
  een gewone naam laat staan en alleen de `E2E %`-klus verwijdert. Groen.
- De vaste e2e-accounts staan in `.env.test` al op een test-namespace
  (`test-beheerder@kluslus.test`, `test-monteur@kluslus.test`), NIET op Reiniers echte Gmail-adressen.
  De oude echte-mail-fallback staat alleen nog in `e2e/test-env.ts` als terugval; die wordt in een
  echte run overschreven door `.env.test`.

## De resterende risico's (waarom CI nu nog niet veilig is tijdens keuring)

1. **GROOTSTE RISICO — brede wipe in de integratie-suite.** `integration/scenario.int.test.ts` draait in
   CI via `npm run test:int` (zie `.github/workflows/ci.yml`) en doet in `wipe()` een
   `admin.from("meldingen").delete().not("id","is",null)` (idem `opleveringen`, `documenten`). Dat wist
   ALLE meldingen in de test-DB, dus ook Reiniers handmatige keuringsdata. Dit is een echte brede wis en
   weegt zwaarder dan de e2e-teardown. **Zolang dit niet gescoped is, blijft "geen CI tijdens keuring"
   gelden, ongeacht de e2e-teardown.**

2. **Gedeelde accounts en zaak.** Reinier keurt via `/test-login` ingelogd als precies dezelfde accounts
   die de e2e gebruikt (`test-beheerder@kluslus.test` / `test-monteur@kluslus.test`, zie
   `src/lib/demo.ts` `TEST_LOGIN_ACCOUNTS` en `e2e/global-setup.ts`). Een CI-run reset het wachtwoord op
   die UID's en upsert hun profiel onder de standaard-zaak. Loopt dat tijdens een keuring, dan kan Reinier
   eruit vliegen of profiel-velden zien wijzigen. Keuring hoort een eigen account + eigen zaak te hebben.

## Cutover-stappen (samen uitvoeren)

### Stap 1 — Integratie-suite scopen (code, test-first; blokkeert de rest)

Maak `scenario.int.test.ts` (en `herinnering.int.test.ts`, `adres-idempotentie.int.test.ts` checken) zo
dat `wipe()` NIET meer de hele tabel leegt, maar alleen de eigen geseede rijen. Twee opties:

- **Optie A (voorkeur): eigen zaak + naam-prefix.** Seed alle integratiedata onder een vaste
  integratie-opdrachtgever (bv. `INT Reinier`) en/of met `klant_naam`-prefix `INT %`, en laat `wipe()`
  alleen `.like("klant_naam", "INT %")` (of `.eq("opdrachtgever_id", intZaakId)`) verwijderen.
- **Optie B: alleen rijen van de eigen run** verwijderen via verzamelde id's (zoals
  `adres-idempotentie.int.test.ts` al doet met `gemaakteOpdrachten`).

Test-first: voeg aan `isolatie.int.test.ts` (of een tweede int-test) een case toe die bewijst dat de
integratie-wipe een keuring-klus met gewone naam laat staan. Pas daarna `wipe()` aan tot groen.

### Stap 2 — Eigen keuring-zaak + keuring-accounts ontwerpen (DB + code)

- Maak in de test-DB een vaste keuring-opdrachtgever (zaak), bv. naam `Keuring Reinier`.
- Maak keuring-accounts in een EIGEN namespace, los van de e2e-accounts, bv.
  `keuring-kantoor@keuring.kluslus.test` en `keuring-monteur@keuring.kluslus.test`, gekoppeld aan die zaak.
- Laat `/test-login` voor de keuring deze keuring-accounts gebruiken in plaats van de e2e-accounts. Pas
  `src/lib/demo.ts` `TEST_LOGIN_ACCOUNTS` daarop aan (of splits: e2e-accounts voor de robot,
  keuring-accounts voor Reinier). De e2e blijft de `test-*@kluslus.test`-accounts gebruiken; Reinier de
  `keuring-*@keuring.kluslus.test`-accounts. Zo raakt een CI-run nooit de accounts/zaak waarin Reinier keurt.

### Stap 3 — E2e-accounts hard losmaken van Reiniers echte mail (code)

- Haal in `e2e/test-env.ts` de echte-mail-fallbacks weg (`bkmkeukenmontage@gmail.com`,
  `r.k.zijlstra@gmail.com`) of vervang ze door `*.kluslus.test`-fallbacks, zodat een ontbrekende
  `.env.test`-waarde nooit per ongeluk een echt adres als test-account pakt.
- `scripts/setup-test-users.ts` maakt de e2e-accounts al op `*@kluslus.test`; laat dat zo en voeg een
  keuring-account-aanmaak toe (eigen namespace) als je stap 2 scriptbaar wilt.

### Stap 4 — `.env.test`-variabelen omzetten (samen met Reinier)

Pas in `.env.test` aan (gitignored, lokaal in elke worktree + de hoofdmap):

- `E2E_BEHEERDER_UID` / `E2E_MONTEUR_UID`: zet op de UID's van de e2e-accounts in de EIGEN e2e-namespace
  (na stap 3 evt. nieuwe accounts; draai `npm run setup:test` om ze aan te maken en de UID's terug te
  schrijven).
- `E2E_BEHEERDER_EMAIL` / `E2E_MONTEUR_EMAIL`: de e2e-namespace-adressen (`*@kluslus.test`), gescheiden
  van de keuring-adressen.
- Eventueel nieuwe keuring-variabelen toevoegen als `/test-login` ze uit env haalt (bv.
  `KEURING_KANTOOR_UID`, `KEURING_MONTEUR_UID`).

LET OP: verander GEEN UID naar een account dat niet in de test-DB bestaat; maak het account eerst aan.

### Stap 5 — GitHub Actions-secret omzetten (coordinatie vereist)

CI bouwt `.env.test` uit ÉÉN repo-secret: **`ENV_TEST`** (zie `ci.yml`, stap "Testomgeving (.env)
aanmaken uit secret"; `env: ENV_TEST: ${{ secrets.ENV_TEST }}`). De inhoud van die secret is de hele
`.env.test`. Na elke wijziging in stap 4 moet de secret opnieuw geupload worden, anders draait CI nog op
de oude UID's/adressen.

- GitHub → repo `rkzijlstra-ops/ksv-demo` → Settings → Secrets and variables → Actions → secret
  `ENV_TEST` → Update, en plak de nieuwe volledige `.env.test`-inhoud.
- Er zijn verder GEEN aparte CI-secrets voor de UID's/adressen; alles zit in `ENV_TEST`. De dummy
  AI-keys en de publishable-key-truc zet de workflow zelf (niet aanraken).
- Coordinatie: doe de secret-update en de lokale `.env.test`-update in dezelfde sessie, zodat CI en lokaal
  niet uiteenlopen. Draai daarna eenmalig de e2e + int lokaal groen voordat je op CI vertrouwt.

### Stap 6 — Documentatie en waarschuwingen bijwerken

Pas NA stap 1 t/m 5 groen zijn:

- `docs/OMGEVINGEN.md`: noteer dat de test-DB gedeeld wordt door CI en handmatige keuring, met gescheiden
  keuring-zaak/-accounts en e2e-namespace, en dat zowel de e2e-teardown als de integratie-wipe
  prefix/zaak-gescoped zijn.
- Project-`CLAUDE.md`: verwijder de "todo, laag 2"-waarschuwing "geen CI triggeren terwijl Reinier keurt"
  zodra stap 1 (integratie-wipe gescoped) EN stap 2 (eigen keuring-zaak/-accounts) staan. Niet eerder: de
  e2e-teardown alleen is niet genoeg, de integratie-wipe is de echte blokker.

## Acceptatie (klaar wanneer)

- Een volledige CI-run (`npm test` + `npm run test:int` + `npm run test:e2e`) laat een vooraf met de hand
  aangemaakte keuring-klus (gewone naam, keuring-zaak) volledig intact.
- Reinier kan tijdens een CI-run ingelogd blijven en blijft zijn keuringsdata zien.
- `.env.test` lokaal en de `ENV_TEST`-secret zijn gelijk.
