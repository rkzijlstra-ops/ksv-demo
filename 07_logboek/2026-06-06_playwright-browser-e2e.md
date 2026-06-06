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

## Monteur-PWA-flows (toegevoegd)

`monteur-pwa.spec.ts` (monteur-sessie):
- **Melding met foto**: een echte foto wordt client-side gecomprimeerd en naar Supabase Storage
  geupload, de melding komt als kind-rij bij de opdracht. Geen mail.
- **Oplevering vastleggen**: eindstaat-foto + handtekening (op het canvas getekend), met
  DB-bevestiging dat de concept-oplevering de foto en handtekening-URL heeft. De test stopt bij het
  concept en klikt NIET op "Versturen", dus er wordt geen rapport gemaild.

Praktisch geleerd: de service-worker uitschakelen in e2e (anders onderschept hij fetches), en een
geldige test-PNG genereren met zlib (een willekeurige base64 werd niet gedecodeerd door
createImageBitmap). Storage-objecten van de test-foto's blijven staan (throwaway, pre-Ed).

Totaal nu **9 e2e-tests groen** (2 smoke + 2 planbord + 3 monteur + 2 monteur-PWA).

## Mail end-to-end (toegevoegd)

`mail.spec.ts` draait tegen **productie** (Vercel, waar planning@kluslus.nl is ingesteld): de monteur
levert een opdracht op en verstuurt het rapport naar een leesbaar test-adres
(bkmkeukenmontage+kluslus@gmail.com). Daarna in de BKM-mailbox (via Gmail-MCP) geverifieerd:
- afzender planning@kluslus.nl, onderwerp "Opleverrapport <klant> (ref ...)";
- PDF-bijlage `opleverrapport-<ref>.pdf` aanwezig;
- inhoud + afsluiter "Keukenstudio Voorschoten" kloppen;
- **routing**: belandt in de map Kluslus/Klanten/Keukenstudio Voorschoten (het Gmail-filter pakt ook
  de uitgaande app-mails via het +kluslus-adres). Staat ook in de inbox (filter slaat de inbox niet over).

**Alle vijf mail-flows end-to-end geverifieerd** (achter `E2E_MAIL=1`, tegen productie, met
self-cleanup; in de BKM-mailbox via Gmail-MCP gecontroleerd, alle vanaf planning@kluslus.nl):
1. **Opleverrapport**: PDF-bijlage, juiste inhoud, landt in map Kluslus/Klanten/Keukenstudio Voorschoten.
2. **Monteur-opdracht-mail** (mail-opdracht.spec): mét de eerdere-rapporten-historie ("Deze keuken is
   eerder bezocht ... rapport: <link>"), correcte opdrachtgegevens en afsluiter.
3. **Spoedmelding** (mail-flows.spec): "SPOED - <klant>" naar kantoor (RAPPORT_EMAIL), met de meldingtekst.
4. **Uitnodiging**: "Je bent toegevoegd aan de planning-app" met de login-URL.
5. **Afmelding**: "Je bent afgemeld bij de planning-app".

Na de runs: database schoon (0 opdrachten, alleen de 2 echte accounts, geen achtergebleven
testaccounts). Lokale dev kon niet voor de mail-tests: next dev staat maar één server per project toe
en die van een parallelle chat draaide al (met de Resend-testafzender). Daarom tegen productie, met
een beheerder- en monteur-productie-sessie (cookies voor de vercel-host) in global-setup.

## Opdrachtgever-rol (toegevoegd)

`opdrachtgever.spec.ts`: een tijdelijke test-opdrachtgever (gekoppeld aan de standaard-zaak; door
global-setup aangemaakt en global-teardown opgeruimd) controleert in de browser:
- op het dashboard alleen de opdrachten van zijn **eigen zaak**, niet ad-hoc klussen en niet die van
  een **andere zaak** (zaak-scheiding + RLS in de praktijk, inclusief cross-zaak-afscherming);
- hij mag bij het planbord; en wordt van de monteur-werkpool weggestuurd naar zijn dashboard.

Bug onderweg gevonden en gefixt: per account twee keer inloggen (één voor localhost, één voor de
vercel-sessie) maakte de eerste sessie ongeldig, waardoor de beheerder/monteur-tests faalden. Nu
één login per account, weggeschreven voor beide domeinen.

Stand: **12 localhost-e2e + 5 mail-e2e** (achter E2E_MAIL=1). Na elke run database schoon (alleen de
twee echte accounts).

## Niet gedekt (smaak/optioneel)

- "Inbox overslaan" voor de Kluslus-map (nu staan de app-mails ook nog in de inbox).

Hiermee is de browser-kant, inclusief het echte slepen, nu geautomatiseerd te testen.
