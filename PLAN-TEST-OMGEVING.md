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
- **`.env.example`** documenteert `MAIL_DRY_RUN` + `MAIL_ALLOWLIST`.
- **`TESTDEKKING.md`** bijgewerkt.
- Verificatie: 727 unit-tests + 19 mail-tests groen, `tsc --noEmit` schoon.

Nog NIET gepusht: een push triggert een preview, en die moet eerst veilig naar de test-DB wijzen (jouw
Vercel-stap hieronder). Anders bouwt de preview mogelijk nog tegen prod.

## Jouw stappen in Vercel (eenmalig, ~10 min, volledig voorgekauwd)

Ik heb een kant-en-klaar bestand klaargezet: **`.env.preview`** in de projectmap (naast `.env.demo-vercel`).
Daarin staan alle waarden al ingevuld (test-DB + jouw allowlist + de hergebruikte sleutels).

1. Ga naar https://vercel.com en open het project **`keukenstudio-voorschoten-demo`** (je live-app, niet
   het demo-project).
2. Klik bovenin **Settings** → links **Environment Variables**.
3. Klik op het knopje om meerdere tegelijk te plakken (de "..."-knop of het tekstvak voor bulk-invoer).
4. Open `.env.preview` in de projectmap, **kopieer het hele blok** en plak het in dat veld.
5. BELANGRIJK: zet bij Environment **alleen "Preview"** aan (haal "Production" en "Development" eraf).
   Hierdoor raakt dit je live-app NIET; het geldt alleen voor branch-previews.
6. Klik **Save**.

Dat is alles. Vanaf de volgende push naar een branch krijg je een preview-URL die tegen de test-DB draait
en alleen naar jou stuurt.

### Optioneel (niet nodig nu)
- Het losse **demo-project** bouwt misschien ook previews. Onschadelijk (die draaien tegen de demo-DB,
  niet prod). Alleen als de dubbele preview-URL verwarrend is, kun je in dat project previews uitzetten.
- **GitHub branch-protection**: master alleen laten mergen als CI groen is. Eén instelling, maakt de flow
  waterdicht. Aanrader, maar geen blokkade om te beginnen.

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

Toevoeging om het écht "vanzelf" te maken: ik leg deze vaste flow vast in de **project-`CLAUDE.md`**, zodat
elke toekomstige sessie hem automatisch volgt (branch → preview → akkoord → merge; test-first; registers
bij; afrond-check). Dat doe ik pas na jouw akkoord op dit plan, zodat we niet te ver vooruit lopen.

## Praktisch: inloggen op de preview

Om in de preview echt rond te klikken heb je een account op de **test-DB** nodig. De e2e gebruikt
programmatische sessies (geen wachtwoord), dus dat werkt niet voor handmatig inloggen. Bij het opleveren
zet ik daarom één bekend test-account klaar (beheerder + monteur, met wachtwoord) op de test-DB, en geef ik
je de inloggegevens. Dan kun je in de preview inloggen als kantoor én als monteur. Kleine klus, doe ik op
"ga".

## Open beslissingen voor jou (klein)

1. **`DEMO_MODE` in de preview: uit (aanrader) of aan?** Uit = je test het echte product tegen testdata
   (geen demo-banner). Ik heb `.env.preview` op `DEMO_MODE=0` gezet. Wil je liever de demo-beleving in de
   preview, dan zet ik 'm op 1.
2. **Branch-protection nu aanzetten of later?** (zie optioneel hierboven).
3. **Mag ik de vaste flow in de project-CLAUDE.md vastleggen?** (de "vanzelf"-stap).

Zeg "ga" + je keuzes, dan push ik de branch, werk ik de CLAUDE.md/OMGEVINGEN.md bij en lever ik het af.
