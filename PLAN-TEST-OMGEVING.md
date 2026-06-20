# Plan: aparte TEST-omgeving (veilig bouwen/testen in de browser)

Datum: 2026-06-20. Branch: `omgeving-test`. Volgt op `DEMO-OMGEVING-VOORSTEL.md` en het open punt
onderaan `docs/OMGEVINGEN.md` (previews wijzen nog nergens veilig heen).

## Doel (jouw 5 eisen, kort)

1. Veilig bouwen/testen in de browser tegen de **TEST-DB** (`mydwcsaalahtidzyefsq`), nooit prod/demo.
2. Mail en SMS gaan **wel echt**, maar **alleen naar jou** (allowlist: jouw mail + 06).
3. Aan/uit-knop voor versturen: `SMS_DRY_RUN` bestond al, `MAIL_DRY_RUN` nu toegevoegd (symmetrisch).
4. Branch-previews wijzen naar deze test-omgeving (test-DB + allowlist), niet naar de demo.
5. Flow: jij bouwt/test hier, na akkoord merge je naar master, prod EN demo volgen automatisch.

## Belangrijkste inzicht: de "test-omgeving" is gewoon de Preview-scope

Er is geen nieuw project nodig. Vercel kent per variabele drie scopes: **Production / Preview /
Development**. Dezelfde sleutel mag per scope een andere waarde hebben. We richten de **Preview-scope** van
je bestaande prod-project (`keukenstudio-voorschoten-demo`, mijn.kluslus.nl) op de **test-DB** met jouw
allowlist. Gevolg:

- Push een branch → Vercel bouwt automatisch een **preview-URL** die tegen de test-DB draait en alleen
  naar jou mailt/sms't.
- Merge naar master → **Production**-scope (prod-DB) deployt, en het losse demo-project (eigen DEMO-scope)
  deployt ook. Allebei ongewijzigd.

Eén plek instellen, daarna gaat het vanzelf. Dit is precies eis 4 en het open punt in `OMGEVINGEN.md`.

## Risico-check (jouw onderbuik klopte: niet te ver gaan)

Je vroeg: "is er wel risico?" Antwoord na het nakijken: **het echte risico dat CI naar vreemden stuurt is
klein.** SMS staat in `playwright.config.ts` hard op dry-run, en e2e-mail gaat alleen naar nep-adressen
(`@kluslus.test`) die bouncen. We bouwen dus geen zwaar veiligheidsapparaat. `MAIL_DRY_RUN` voegen we toe
omdat jij een nette aan/uit-knop wilde (eis 3), niet omdat er een lek was.

## Wat ik deze sessie al gebouwd heb (getest, gecommit op `omgeving-test`)

- **`MAIL_DRY_RUN`** in `mail.ts` (`=1` → alleen loggen, niets versturen), test-first gedekt in
  `mail.test.ts`, plus de tot nu toe ontbrekende `MAIL_ALLOWLIST`-test. Symmetrisch met SMS.
- **`demo.ts`-uitleg rechtgetrokken**: de comment beschreef een "lege allowlist = niets versturen"-fail-safe
  die nooit gebouwd is. Nu klopt de tekst met de code (de allowlist is de grendel; leeg = geen beperking;
  stilzetten doe je met de DRY_RUN-knop).
- **Test-login** (`/test-login` + `/api/test-login`): inloggen op de preview als vast test-account op de
  test-DB, gegrendeld op niet-productie (`VERCEL_ENV`). Test-first (route- + unit-test). Zie de inlog-sectie.
- **Vaste flow in `CLAUDE.md`** + **`docs/OMGEVINGEN.md`** (preview-opzet, open punt dicht). **Branch-protection**
  op master aangezet (mergt alleen bij groene CI).
- **`.env.example`** documenteert `MAIL_DRY_RUN` + `MAIL_ALLOWLIST`.
- **`TESTDEKKING.md`** bijgewerkt.
- Verificatie: 732 unit-tests groen, `tsc --noEmit` schoon, `next build` schoon.

Nog NIET gepusht: een push triggert een preview, en die moet eerst veilig naar de test-DB wijzen (jouw
Vercel-stap hieronder). Anders bouwt de preview mogelijk nog tegen prod.

## Jouw stappen in Vercel (eenmalig, voorgekauwd)

Het kant-en-klare blok staat in **`.env.preview`** in de projectmap. **Let op (jouw terechte observatie):**
je live-app heeft de meeste keys al, en die staan vaak op Production én Preview tegelijk. Je kunt er dan
niet zomaar een tweede Preview-waarde naast zetten ("already exists for production,preview"). Eén schone
bulk-paste werkt dus niet; dit is de echte volgorde:

1. Vercel → project **`keukenstudio-voorschoten-demo`** (je live-app, niet het demo-project) → **Settings**
   → **Environment Variables**.
2. **Zeven variabelen** moeten een eigen Preview-waarde krijgen (de rest mag gedeeld blijven):
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `MAIL_ALLOWLIST`, `SMS_ALLOWLIST`

   De vijf Supabase-keys zijn **kritiek**: zonder eigen Preview-waarde draait je preview tegen PRODUCTIE.
3. Per variabele hangt het ervan af of hij al bestaat:
   - **Bestaat al** (de 5 Supabase-keys; en `SMS_ALLOWLIST` waarschijnlijk als vangnet): klik **Edit**,
     **haal het vinkje "Preview" eraf** (laat "Production" staan), **Save**. Nu is "Preview" vrij.
   - **Bestaat nog niet** (zoals `MAIL_ALLOWLIST`, die staat niet in prod want productie mailt naar echte
     ontvangers): niets uitvinken, je voegt hem zo gewoon nieuw toe.
4. Voeg daarna de zeven toe met de waarde uit `.env.preview`, Environment **alleen "Preview"**.
5. De overige regels uit `.env.preview` (Resend/CM/AI/CRON/DEMO_MODE/DRY_RUN): zegt Vercel dat ze al
   bestaan, **sla ze over** (de bestaande waarde werkt prima in preview). Bestaan ze nog niet, voeg ze toe
   met Environment "Preview".

Vanaf de volgende push naar een branch krijg je een preview-URL tegen de test-DB die alleen naar jou stuurt.
`APP_URL` zit bewust NIET in het blok: de login gebruikt het adres van de preview zelf (window-origin), en
APP_URL telt alleen voor de link-tekst in SMS'jes (cosmetisch in een preview).

### Optioneel (niet nodig nu)
- Het losse **demo-project** bouwt misschien ook previews. Onschadelijk (die draaien tegen de demo-DB,
  niet prod). Alleen als de dubbele preview-URL verwarrend is, kun je in dat project previews uitzetten.
- **GitHub branch-protection**: ✅ al aangezet (master mergt alleen bij groene CI-check `test`).

## De robuuste werkwijze die vanzelf loopt (jouw grote wens)

Het meeste bestaat al; we zetten het aan en leggen het vast, zodat jij alleen hoeft te dirigeren:

| Stap | Wat gebeurt automatisch | Bestaat al? |
|---|---|---|
| Bouwen op een branch | test-first, discipline-skill | ja |
| `git push` | pre-push hook: unit + typecheck, blokkeert bij rood | ja (`.githooks/pre-push`) |
| Na push | CI draait de volle suite (typecheck/unit/int/build/e2e/demo-e2e) | ja (`.github/workflows/ci.yml`) |
| Na push | Vercel-preview tegen test-DB, mail/sms alleen naar jou | **na jouw Vercel-stap** |
| Jij keurt in de browser | — | — |
| Merge naar master | prod + demo deployen automatisch | ja |
| Docs/gaten | `TESTDEKKING.md` + `TOESTANDEN.md` bijgewerkt in dezelfde commit; afrond-check vóór "klaar" | ja (discipline) |

Dit is nu vastgelegd in de **project-`CLAUDE.md`** (sectie "Vaste werkwijze"), zodat elke toekomstige sessie
hem automatisch volgt (branch → preview → akkoord → merge; test-first; registers bij; afrond-check).

## Inloggen op de preview: de test-login (gebouwd)

`/login` biedt alleen Google + magic-link (geen wachtwoord), en die vragen extra Supabase-config per
preview-URL. Daarom is er nu een **test-login** die alleen buiten productie bestaat:

- Ga naar **`<preview-url>/test-login`** en kies **Inloggen als kantoor** of **Inloggen als monteur**.
- Je logt in als een vast test-account op de test-DB, zonder Google/magic-link.
- Op productie en de demo bestaat deze pagina niet (404), dus hij lekt nergens.
- Twee browservensters = beide rollen tegelijk (kantoor op de laptop, monteur op de telefoon).

Gebouwd en getest deze sessie (`/test-login` + `/api/test-login`, gegrendeld op `VERCEL_ENV`). Zie de
commits op de branch.

## Beslissingen (gemaakt 2026-06-20)

1. **`DEMO_MODE` in de preview: uit.** Je test het echte product tegen testdata. `.env.preview` staat op `DEMO_MODE=0`.
2. **Branch-protection: aan.** Gedaan (master mergt alleen bij groene CI-check `test`).
3. **Vaste flow in CLAUDE.md: ja.** Vastgelegd.
4. **Preview-login: een test-wachtwoordlogin.** Gebouwd (zie inlog-sectie).

## Wat er nog moet (na jouw Vercel-stap)

1. Jij: de Vercel Preview-scope zetten (sectie "Jouw stappen in Vercel").
2. Ik (op jouw seintje): de branch pushen → CI + eerste preview. Daarna controleren dat de preview echt
   tegen de test-DB draait (niet prod), en je de preview-URL + `/test-login` geven.
