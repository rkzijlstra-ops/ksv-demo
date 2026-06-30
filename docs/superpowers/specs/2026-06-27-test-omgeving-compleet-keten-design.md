# Test-omgeving compleet: de hele keten veilig end-to-end testbaar

Datum: 2026-06-27
Status: design, wacht op review Reinier

## Het probleem

Er zijn drie omgevingen (productie, test/kluslus-test, demo), maar op geen enkele
veilige omgeving is de volledige keten end-to-end te testen: een mail die binnenkomt
en een klus wordt, gevolgd door uitgaande mail en sms. Daardoor wordt de keten
feitelijk in productie getest, precies wat de omgeving-opzet wilde voorkomen.

Concreet, vastgesteld in de code en de live Vercel-instellingen:

- **Inbound mail (mail-naar-app) werkt alleen op productie.** De inbound loopt via
  Resend Receiving met een MX-record op `klus.kluslus.nl` dat naar de productie-app
  wijst. Op kluslus-test bestaat de variabele `INBOUND_DOMAIN` niet eens en is er geen
  mailroute. Een echte binnenkomende mail kan daar dus nooit een klus worden.
- **SMS is op de testlagen niet bruikbaar.** In `.env.test` (de automatische
  test/CI-laag) staat `SMS_DRY_RUN=1`, dus daar gaat nooit een echte sms. Op de
  kluslus-test Vercel-omgeving staan alle variabelen als type "sensitive", waardoor
  noch Reinier noch Claude kan nalezen wat er staat. Volgens het lokale `.env.preview`
  hoort sms daar echt naar Reinier te gaan, maar dat is langs die weg niet te
  bevestigen.
- **Gevolg:** "tests groen" bewijst niet dat de keten werkt, want twee schakels worden
  niet echt geraakt. Reinier heeft elk stuk ooit los zien werken, maar nooit als één
  doorlopende keten en nooit na alle aanpassingen samen. Dat voedt regressie-angst.

## Afgewogen en verworpen

- **Vierde database** (de openstaande todo om CI en handmatige keuring te ontvlechten):
  lost het echte probleem niet op (dat is inbound + sms-config, geen data-botsing) en
  verergert de grootste pijn, schema-drift, met een vierde plek om migraties in de pas
  te houden.
- **Aftakking op de demo-omgeving** (voorkeur die Reinier opperde): de demo is nu het
  completest qua kanalen, maar draait in nepmodus (`DEMO_MODE=1`), stuurt naar iedereen
  (geen allowlist) en draait de productie-code (master), niet de aanpassingen die je
  vóór live wilt keuren. Als testbasis dus de verkeerde keuze.

## Besluit

De bestaande test-omgeving (kluslus-test, eigen test-DB, echt product met
`DEMO_MODE=0`, allowlist = alleen Reinier) compleet maken. Geen vierde locatie. Dat
geeft de compleetheid van de demo plus echtheid plus veiligheid, op een plek die er al
is en die juist de feature-branch draait.

## Doelen

- Eén veilige omgeving (kluslus-test) waar de hele keten echt loopt, met mail en sms
  alleen naar Reinier.
- Zowel **automatisch** (een keten-test die na elke wijziging draait, zodat groen weer
  betekent "de hele keten werkt nog") als **handmatig** (Reinier loopt het zelf na om de
  flow te voelen en bij te sturen). Beide expliciet gewenst.

## Scope

### 1. Inbound mail echt op de test-omgeving instellen

Reinier kiest bewust voor echt instellen, niet voor een naspeel-schermpje.

- Een eigen inbound-subdomein, bijvoorbeeld `klus-test.kluslus.nl`, met een MX-record
  (bij Vimexx) naar Resend Receiving. Het subdomein zelf is gratis.
- `INBOUND_DOMAIN` op kluslus-test zetten naar dat subdomein, zodat de ontvangstadressen
  daar `klus-<token>@klus-test.kluslus.nl` worden en de tokens naar de test-DB wijzen.
- `RESEND_WEBHOOK_SECRET` op de test-omgeving zetten zodat de webhook geverifieerd is.
- Resultaat: een echte mail (met of zonder order-PDF) naar het test-ontvangstadres landt
  in de test-app en wordt via dezelfde verwerking (Claude leest de PDF, klus-voorstel
  ontstaat) een klus in de test-DB.

**Kosten/plan (uitgezocht 2026-06-27):** Resend's gratis plan staat maar 1 domein toe;
meerdere domeinen vereisen een betaald plan (Pro, ~$20/maand, tot 10 domeinen). Inbound
telt mee in de mailquota (elke ontvangen mail = 1). De app gebruikt al een verzend-domein
(`kluslus.nl`) en een ontvang-domein (`klus.kluslus.nl`), dus het account zit vrijwel
zeker al op een betaald plan en een derde (test-)domein past daar gratis bij.
**Bevestigd door Reinier (2026-06-27): account zit op Resend Pro,** dus het test-domein
past gratis binnen de 10 toegestane domeinen. Productie-inbound (`klus.kluslus.nl`)
blijft ongemoeid; het test-subdomein staat er los van.

### 2. SMS echt naar Reinier op de test-omgeving, en bevestigd

- Zorgen dat op kluslus-test geldt: `SMS_DRY_RUN=0`, `SMS_ALLOWLIST=+31631665814`, en een
  geldig `CM_PRODUCT_TOKEN`. Omdat de waarden "sensitive" zijn en niet leesbaar, zetten
  we ze opnieuw expliciet in plaats van aan te nemen dat ze goed staan.
- Verifiëren met een echte doorloop op kluslus-test: een actie die een sms hoort te
  sturen, en controleren dat er echt een sms op Reiniers telefoon komt, terwijl Claude
  de live runtime-logs van de omgeving meeleest (via een kortlevend Vercel-token).

### 3. Eén automatische "hele keten"-test

- Eén e2e die de volledige loop in één doorloop dekt: inbound (de `/api/inbound`-route
  rechtstreeks aangeroepen met een test-payload, zodat we niet op echte mailaflevering
  hoeven wachten) tot en met klus, plannen, bevestigen, en de uitgaande mail en sms.
- Voor de massale CI-runs blijven de kanalen op dry-run met een inhoudscontrole (juiste
  ontvanger, juiste inhoud), zodat runs geen sms-spam of mailkosten geven. De
  echt-verzendende doorloop is de handmatige keuring op kluslus-test (punt 2).
- De handmatige variant: Reinier stuurt een echte mail naar het test-adres (punt 1) en
  loopt de keten met de hand na.

### 4. Beheer-opschoning van de test-instellingen

- De onschuldige variabelen op kluslus-test (`MAIL_DRY_RUN`, `SMS_DRY_RUN`,
  `MAIL_ALLOWLIST`, `SMS_ALLOWLIST`, `DEMO_MODE`, `TEST_LOGIN`) uit type "sensitive"
  halen, zodat Reinier ze voortaan in de Vercel-schermen kan nalezen en controleren.
  Echte geheimen (API-keys, tokens, DB-keys) blijven sensitive.

### 5. Data-isolatie tussen automatische tests en handmatige keuring

Het oorspronkelijke pijnpunt: CI/e2e en Reiniers handmatige keuring delen de test-DB,
waardoor een testrun zijn keuringsdata kan raken. Geen vierde database; de
tenant-scoping (opdrachtgever-kolom + RLS) ligt er al. Wel afmaken:

- Reiniers handmatige keuring een eigen vaste opdrachtgever (keuring-zaak) geven plus
  eigen vaste keuring-accounts, die de e2e nooit aanraakt.
- De drie bekende lekken dichten:
  1. de e2e gebruikt nu Reiniers echte mailadressen als vaste testaccounts (zijn profiel
     wordt per run ge-upsert) — eigen test-accounts in een eigen namespace gebruiken;
  2. de wegwerp-opdrachtgever wordt na elke run verwijderd met cascade-risico — scheiden
     van alles wat Reinier handmatig invoert;
  3. naam-botsing met de e2e-prefixen — de keuring-zaak buiten die prefixen houden.
- Resultaat: CI-runs en handmatige keuring delen veilig dezelfde test-DB zonder elkaar
  te raken, zodat ik niet meer hoef te wachten met tests terwijl Reinier keurt.

### 6. App-versie automatisch ophogen

De service-worker-versie (`VERSION` in `public/sw.js`) wordt nu handmatig per deploy
opgehoogd; vergeten betekent dat de "nieuwe versie"-balk niet verschijnt en iemand op
oude code blijft. Dit automatisch genereren uit een build-waarde (git-commit of
build-id), zodat elke deploy de cache vanzelf vernieuwt en de update-balk op alle
omgevingen automatisch werkt. Daarmee is Reiniers eis "de versie waar je in werkt is
altijd de laatste" structureel geborgd.

## Werkwijze

Conform de projectregels: feature-branch in een eigen worktree, test-first, langs
`omgeving-test` naar de test-omgeving, Reinier keurt de hele keten met beide rollen, en
pas na zijn expliciete akkoord naar master.
