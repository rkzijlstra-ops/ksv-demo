# Test-omgeving kluslus-test opgezet (veilig bouwen/testen in de browser)

Datum: 2026-06-20. Branch: `omgeving-test`.

## Doel

Een aparte omgeving waarin Reinier veilig kan bouwen en testen in de browser: tegen de TEST-DB (nooit
prod/demo), met mail/sms die wel echt verstuurd worden maar alleen naar hemzelf, en een vaste flow waarbij
na akkoord een merge naar master prod én demo automatisch meeneemt.

## Wat er gebeurd is

- **`MAIL_DRY_RUN`** toegevoegd in `mail.ts`, symmetrisch met `SMS_DRY_RUN` (=1 → alleen loggen). Test-first
  gedekt, plus de tot dan ontbrekende `MAIL_ALLOWLIST`-test.
- **`demo.ts`-uitleg rechtgetrokken**: de comment beschreef een "lege allowlist = niets versturen"-fail-safe
  die nooit gebouwd is. Nu klopt de tekst met de code (allowlist is de grendel; leeg = geen beperking).
- **Test-login** (`/test-login` + `/api/test-login`): inloggen als vast test-account op de test-DB, zonder
  Google/magic-link. Gegrendeld op `TEST_LOGIN=1` of niet-productie (`VERCEL_ENV`); op echte prod/demo 404.
  `/test-login` vrijgesteld in de auth-middleware. Test-first (unit + route).
- **Aanpak gekanteld:** eerst de Preview-scope van het prod-project geprobeerd, maar bestaande variabelen
  claimen Production én Preview tegelijk → conflicten. Opgelost met een **eigen Vercel-project
  `kluslus-test`** (vers project, hele `.env.preview` in één keer, geen scope-gepuzzel). Production Branch =
  `omgeving-test`, beveiligd met Vercel Authentication (gratis op Pro), zodat alleen Reinier erin kan.
- **Test-account-wachtwoorden** op de test-DB gezet (`Testbeheerder1!` / `Testmonteur1!`) zodat `/test-login`
  werkt. CI raakt dit niet (CI logt via programmatische sessies in, niet met wachtwoord).
- **Branch-protection** op master aangezet (mergt alleen bij groene CI-check `test`). Vaste flow vastgelegd
  in `CLAUDE.md`; `docs/OMGEVINGEN.md` bijgewerkt met de test-omgeving.
- **SMS-misinformatie** rechtgetrokken in het geheugen (SMS werkt live sinds 2026-06-10, geen open
  token-actie).

## Status

Live en werkend: `https://kluslus-test.vercel.app/test-login`, tegen de test-DB, mail/sms alleen naar
Reinier, beveiligd. Verificatie: 732 unit-tests groen, `tsc` + `next build` schoon.

## Let op / vervolg

- De test-DB is gedeeld met CI; niet zomaar leeggooien (fixtures). De aanwezige data is opgebouwde
  e2e-testdata, geen echte klantgegevens.
- Steady state: na deze merge kan de Production Branch van kluslus-test op `master` (stabiele test-mirror);
  feature-branches test je via hun kluslus-test-deploy.
