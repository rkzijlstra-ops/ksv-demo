@AGENTS.md

## Omgevingen, databases en deploys (lees dit vóór je test, migreert of deployt)

Er zijn DRIE losse Supabase-databases (productie / test-CI / demo) en twee Vercel-deploys van dezelfde `master`. Welke aan wat hangt, hoe je veilig test/migreert/deployt, en de valkuilen (o.a. lokale `next dev` draait op de PRODUCTIE-database) staan in de naslag hieronder. Haal de omgevingen nooit door elkaar.

@docs/OMGEVINGEN.md

## Opleverlat: ga alles na vóór je "klaar" of "werkt" zegt

Kluslus is een af product, geen demo. Het moet vanaf de eerste klant naadloos draaien; een haperende eerste ervaring breekt direct het vertrouwen. Deze lat is niet onderhandelbaar en geldt voor elke wijziging:

1. **Verifieer de héle reis, live, end-to-end** voor je iets klaar noemt. Beide rollen (kantoor én monteur), niet alleen de happy path. "Endpoint geeft 200" is GEEN bewijs dat het werkt: controleer dat de actie echt het juiste resultaat oplevert (data landt in de DB, het bericht komt aan, het scherm klopt, de status gaat over).
2. **Dek in één keer alles in wat redelijkerwijs te voorzien is** (de hele levenscyclus en de tegenhangers, alle statusovergangen, beide kanten). Laat Reinier er niet drie keer op terugkomen; doe de toestand-/keten-check vóór je bouwt en leid de controles daaruit af.
3. **Onderscheid bewust:** een haperend basispad fix je nu; tweaken-naar-smaak of -omstandigheden mag later, maar benoem dat expliciet (bij de demo kun je zeggen dat het kan).
4. **Geen over-engineering:** speculatieve randgevallen niet vooruitbouwen, foreseeable-noodzakelijke wél.

Kort: niet "het zou moeten werken", maar "ik heb de hele keten nagelopen en gezien dat het werkt".

## Vaste werkwijze: branch → preview → akkoord → merge

Elke wijziging loopt deze weg; nooit direct op master bouwen. Veiligheid zit in de infrastructuur, niet in onthouden.

1. Werk op een feature-branch in een eigen worktree (zie `docs/OMGEVINGEN.md`). Bouw test-first.
2. Werk in dezelfde commit `TESTDEKKING.md` en `TOESTANDEN.md` bij; loop de afrond-check (skill projectstart-discipline) langs vóór je iets "klaar" noemt.
3. Push. De pre-push hook draait unit + typecheck (blokkeert bij rood). Daarna draait CI in de cloud de volle suite; master is branch-protected, dus mergen kan alleen als de CI-check `test` groen is.
4. Het aparte test-project **kluslus-test** (eigen Vercel-project, tegen de TEST-DB, allowlist = alleen Reinier, beveiligd met Vercel Authentication) bouwt de branch. Inloggen zonder Google/magic-link via `/test-login` (aan door `TEST_LOGIN=1`). Reinier keurt daar in de browser, beide rollen.
5. Akkoord? Merge de branch naar master. Prod-Vercel én demo-Vercel deployen automatisch dezelfde code.

De poorten: pre-push + branch-protected CI, het losse kluslus-test-project op de test-DB, en de verzend-grendel (allowlist + `MAIL_DRY_RUN`/`SMS_DRY_RUN`). Zie `docs/OMGEVINGEN.md` (sectie test-omgeving) en `PLAN-TEST-OMGEVING.md` voor de opzet.

## Logboek

Het logboek van dit project staat in `07_logboek/` in deze projectmap, niet in het Mainframe-logboek. Schrijf hier alle verslagen over de bouw, het ontwerp en de beslissingen van dit project (`YYYY-MM-DD_korte-beschrijving.md`, projectnaam niet nodig in de bestandsnaam). Alleen Mainframe-brede zaken (skills, MCP, backup, omgeving, overkoepelende strategie) gaan naar het Mainframe-`07_logboek/`. Zie de Mainframe-CLAUDE.md, sectie "Logboek-structuur".
