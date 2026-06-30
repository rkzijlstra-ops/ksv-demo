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

## Vaste werkwijze: branch → TEST-omgeving → akkoord → productie

Elke wijziging loopt deze weg; nooit direct op master bouwen. **Kernregel: de test-omgeving krijgt een wijziging ALTIJD vóór productie. Master (= prod + demo) mag nooit vooruitlopen op de test-omgeving.** Veiligheid zit in de infrastructuur én in deze volgorde, niet in onthouden.

1. Werk op een feature-branch in een eigen worktree (zie `docs/OMGEVINGEN.md`). Bouw test-first. Werk in dezelfde commit `TESTDEKKING.md` en `TOESTANDEN.md` bij; loop de afrond-check (skill projectstart-discipline) langs vóór je iets "klaar" noemt.
2. Push de branch en open een PR. De pre-push hook draait unit + typecheck (blokkeert bij rood); daarna draait CI in de cloud de volle suite. Master is branch-protected: mergen kan alleen als de CI-check `test` groen is. **Groene CI is een VOORWAARDE, geen startsein om te mergen.**
3. **Eerst naar TEST, dan pas naar productie.** Het test-project **kluslus-test** (eigen Vercel-project, TEST-DB, allowlist = alleen Reinier, Vercel Authentication) bouwt van de branch **`omgeving-test`** — NIET van de feature-branch en NIET van master. Breng de feature dus naar `omgeving-test` (merge de feature-branch erin); kluslus-test deployt dat automatisch. Doe dit VÓÓR de merge naar master, anders staat het op productie terwijl test het mist (de omgekeerde wereld; gebeurd 2026-06-22 met de resize).
4. **STOP-poort (niet aan Claude alleen).** Reinier keurt op `kluslus-test` (stabiele URL, inloggen via `/test-login`, aan door `TEST_LOGIN=1`; beide rollen). Claude mergt NOOIT zelf naar master. De volgorde is hard: CI groen → op `omgeving-test` gezet → Claude stopt en vraagt Reinier de visuele check → **pas na Reins expliciete "ga maar / merge"** gaat het verder. Bij twijfel: niet mergen, vragen.
5. Na akkoord: merge naar `master`. Prod-Vercel (`mijn.kluslus.nl`) én demo-Vercel deployen dezelfde, al-op-test-gekeurde code.
6. **Herstel bij scheefstand:** lopen test en prod uit de pas (feature wel op prod, niet op test, of omgekeerd), dan is deze volgorde overgeslagen. Trek `omgeving-test` bij naar de juiste staat (meestal fast-forward naar `master`) zodat test weer minstens gelijk loopt, en houd je daarna aan de volgorde.

De poorten: pre-push + branch-protected CI, het losse kluslus-test-project op de test-DB, en de verzend-grendel (allowlist + `MAIL_DRY_RUN`/`SMS_DRY_RUN`). Zie `docs/OMGEVINGEN.md` (sectie test-omgeving) en `PLAN-TEST-OMGEVING.md` voor de opzet.

> Let op (todo, laag 2): kluslus-test en de CI-e2e delen nu nog dezelfde TEST-DB. Een CI-run kan handmatige keuringsdata van Reinier raken. Tot die DB's gesplitst zijn: geen CI triggeren (push naar master of een open PR) terwijl Reinier op kluslus-test keurt.

## Logboek

Het logboek van dit project staat in `07_logboek/` in deze projectmap, niet in het Mainframe-logboek. Schrijf hier alle verslagen over de bouw, het ontwerp en de beslissingen van dit project (`YYYY-MM-DD_korte-beschrijving.md`, projectnaam niet nodig in de bestandsnaam). Alleen Mainframe-brede zaken (skills, MCP, backup, omgeving, overkoepelende strategie) gaan naar het Mainframe-`07_logboek/`. Zie de Mainframe-CLAUDE.md, sectie "Logboek-structuur".
