# 2026-06-19 Demo-omgeving: zelf-aanmelding, isolatie op eigen zaak, demo-e2e in CI

## Context

De demo-omgeving (`kluslus-demo.vercel.app`) is onderweg gekanteld van "wegwerp-demo" naar het **uitstalraam van een af product** dat vanaf de eerste klant naadloos moet werken. Een haperende eerste indruk breekt direct het vertrouwen. Die lat is vastgelegd in de project-`CLAUDE.md` ("Opleverlat: ga alles na vóór je 'klaar' zegt").

De demo draait van dezelfde `master` als productie; het verschil zit alleen in env-vars (`DEMO_MODE=1`) en een eigen Supabase-project. Alle demo-gedrag is gegrendeld op `DEMO_MODE`, dus in productie inert.

## Wat er is gebouwd/gewijzigd deze sessie

### Aanmeld-model (zelfbediening)
- **Beheerder meldt zich bij de start aan**: `/demo/word-beheerder` (naam + 06 + e-mail) → kantoor-account + ingelogd op het dashboard. Opnieuw aanmelden overschrijft (geen dubbel account).
- **Monteurs via de QR** op het dashboard → `/demo/word-monteur` (naam + 06 + e-mail) → ter plekke een echte monteur, ingelogd op zijn telefoon, zichtbaar op het planbord. Meerdere monteurs kunnen zo elk meedoen.
- **Voorbeeld-monteurs (Mees, Tim) erven het beheerder-contact**: een klus aan hen komt bij de demo-draaier binnen. Zelf-aangemelde monteurs krijgen hun eigen contact.

### Notificaties uit één bron
- SMS én mail lezen het contact nu uit het **profiel** (telefoon + `contact_email`), met terugval op het account-adres en `RAPPORT_EMAIL`. Loste de mail-bounce voor zelf-aangemelde monteurs op; productie blijft werken via de terugval.

### Versturen
- De demo verstuurt **echt** (geen allowlist-filter meer; `ontvangerToegestaan` vereenvoudigd). `SMS_AFZENDER=Kluslus`; demo-mail van `planning@kluslus.nl`, rapport/reply naar `bkmkeukenmontage@gmail.com`. Allowlists in `.env.demo-vercel` zijn leeg.

### Twee resets
- **"Speel opnieuw"** houdt de huidige beheerder ingelogd (klussen vers, zelf-aangemelde monteurs weg).
- **"Helemaal opnieuw"** zet ook de beheerder leeg → terug naar het aanmeldscherm.
- Beide ruimen de zelf-aangemelde monteurs op (profielen + auth-users, namespace-scoped).

### Isolatie op een eigen zaak (bugfix)
- De demo-DB had **twee zaken** (bootstrap "Keukenstudio Voorschoten" + "Demo Keukenstudio"); de oude seed pakte met `limit 1` de verkeerde → **wees-klussen**.
- `seedDemo` gebruikt nu de zaak **op naam** ("Demo Keukenstudio"); het meldingen-wissen is scoped op die zaak en het account-opruimen op de namespace `@voorbeeld.kluslus.test`. Zo raakt de demo nooit andere data in dezelfde DB (belangrijk voor de gedeelde test-DB) en lost het de wees-klussen op.
- Live demo-DB opgeschoond: alles onder "Demo Keukenstudio" (6 klussen, 3 accounts), bootstrap-zaak leeg.

### Demo-e2e + CI
- Nieuwe `playwright.demo.config.ts` + `e2e-demo/`: eigen `DEMO_MODE`-server (poort 3002), eigen `global-setup` die de demo seedt onder de eigen zaak. Vier specs dekken de reis: beheerder-aanmelding → dashboard, monteur via QR → werkpool, planbord toont voorbeeld-monteurs, "Speel opnieuw" houdt de beheerder ingelogd.
- Draait mee in **CI** (`npm run test:e2e:demo`, na de gewone e2e). Lokaal 4/4 groen, CI groen.

## Geverifieerd (opleverlat)
- Demo-e2e lokaal 4/4 + CI groen.
- Live reis end-to-end nagelopen (aanmelden, contact-overerving, reset schoon).
- Demo-DB-eindstaat gecontroleerd (één zaak, geen wees-data).
- Deploy live (demo-pagina's 200).

## Toegang
- App: `https://kluslus-demo.vercel.app`
- Start als beheerder (kantoor): `https://kluslus-demo.vercel.app/demo/word-beheerder`
- Monteurs: scan de QR op het dashboard (of `/demo/word-monteur`).
- Vaste fallback-login indien nodig: `demo-kantoor@voorbeeld.kluslus.test` / `Demo-Kluslus-2026!` via `/login`.

## Open / vervolg
- Reinier doet morgen de live-test van de demo.
- Eénmalig controleren in de Vercel demo-env: `APP_URL=https://kluslus-demo.vercel.app` (de QR werkt sowieso via de request-host; APP_URL telt voor links in demo-mails).
- Fase 2 (uitgesteld): inbound mail op de demo, eigen demo.kluslus.nl-domein, eventueel een dag-limiet op verzendingen als de demo ooit openbaar gedeeld wordt.
