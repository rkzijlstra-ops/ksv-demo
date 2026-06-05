# Playwright browser-e2e opgezet (incl. echt slepen)

Datum: 2026-06-06
Project: KSV demo-app (Kluslus)
Aanleiding: na de data-laag-integratietests de browser-kant dekken (de blinde vlek): het echte
slepen op het planbord en de afgeschermde schermen.

## Wat er staat

- `@playwright/test` + Chromium geïnstalleerd. `playwright.config.ts` draait tegen een lokale
  `next dev` (reuseExistingServer, poort via `PW_PORT`, standaard 3001 omdat daar vaak al een
  dev-server draait).
- **Login-horde opgelost (programmatisch).** Een robot kan niet door Google/magic-link. `global-setup`
  zet eenmalig een test-wachtwoord op het beheerder-account (via admin), logt server-side in en laat
  @supabase/ssr zélf de auth-cookies maken; die worden als Playwright-storageState weggeschreven
  (gitignored). Elke test start ingelogd als beheerder. De magic-link/Google-login blijft gewoon werken.
- **4 e2e-tests groen:**
  - smoke: dashboard en planbord laden ingelogd (niet doorgestuurd naar /login).
  - planbord: een opdracht inplannen via het pool-formulier, met DB-bevestiging.
  - planbord: een opdracht inplannen door **echt te slepen** (dnd-kit, pool -> cel), met DB-bevestiging
    op monteur en datum.
- Elke planbord-test seedt zijn eigen opdracht (uniek) en ruimt die op, zodat de gedeelde
  test-database schoon blijft.
- Cellen kregen een `data-testid` zodat het sleepdoel aanwijsbaar is (kleine testbaarheids-toevoeging).
- Scripts: `npm run test:e2e` (browser) en `npm run test:int` (data-laag-harnas).

## Beslissingen

- **Tegen een lokale dev-server**, die dezelfde Supabase als productie gebruikt (één project). Tests
  seeden/ruimen hun eigen data; pre-Ed is dat veilig. Apart test-project pas nodig als Ed live is.
- **Beheerder-account hergebruikt** voor de sessie (test-wachtwoord erop). Geen aparte testaccounts
  aangemaakt; benigne, en de echte login blijft werken.
- **Geen mail** geraakt (de e2e raakt de planning-flow, niet de Resend-routes).

## Monteur-rol (toegevoegd)

Tweede ingelogde sessie (testmonteur rk) in global-setup. `monteur.spec.ts` controleert in de browser:
- de monteur ziet in de werkpool **alleen zijn eigen toegewezen klus**, niet die van een ander
  (dat is de afscherming/RLS in de praktijk, nu sessie-gebaseerd geverifieerd);
- hij wordt van `/dashboard` en `/planbord` weggestuurd naar zijn werkpool.

Totaal nu 7 e2e-tests groen (2 smoke + 2 planbord + 3 monteur).

## Niet gedekt (vervolg)

- Opdrachtgever-rol e2e (Ed: alleen eigen zaak).
- De monteur-PWA-flows (melding maken, opleveren met foto's) in de browser.
- Echte mail-verzending in een e2e (bewust buiten gehouden).

Hiermee is de browser-kant, inclusief het echte slepen, nu geautomatiseerd te testen.
