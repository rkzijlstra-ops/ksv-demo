# Voorstel: afgesloten demo/sandbox-omgeving van Kluslus

Datum: 2026-06-18. Aanleiding: Rein wil een veilige speeltuin waar Ed + compagnon (en later prospects)
vrij kunnen rommelen, opdrachten invoeren, plannen, annuleren, aanpassen, opleveren, en de statussen aan
BEIDE kanten (kantoor-dashboard + monteur-app) zien veranderen. Geïsoleerd van productie, makkelijk te
resetten, herbruikbaar voor toekomstige klanten. Onderbouwd met een debat (4 persona's, 2 rondes).

---

## Debat-rapport

**Kwestie:** beste opzet van een afgesloten demo-omgeving. Opties A (los demo-project + deploy +
seed/reset), B (demo-modus in productie), C (test-project hergebruiken), D (sandbox-per-prospect).
**Deelnemers:** Pragmatist, Strateeg, Contrarian, Klantadvocaat. **Rondes:** 2.

### Waar iedereen het over eens is
1. **Optie A wint.** Een eigen, geïsoleerde demo is de enige aanpak die de hoofd-eis (isolatie) haalt.
2. **B valt af:** demo-data in productie = datalek-risico via één RLS-misser, en een reset-actie die per
   ongeluk echte klantdata raakt. Te gevaarlijk.
3. **Zuiver C valt af:** het test-project dient CI en wil een schone, deterministische staat; een demo
   wil juist een blijvende, gevulde, rommelbare staat. Die botsen, en je hebt al schema-drift-pijn gehad.
4. **D (per prospect) is de horizon, niet het startpunt:** niet bouwen voor klanten die er nog niet zijn.
5. **Uitgaande SMS/mail is het grootste praktische risico** en moet sowieso eerst dicht.

### Kernargumenten (verscherpt in ronde 2)
- **Strateeg + Contrarian (de sterkste technische les):** zet SMS/mail niet uit via een runtime-vlag
  (`DEMO_MODE`), maar via **afwezigheid**: de demo-deploy krijgt simpelweg geen geldige CM.com- en
  Resend-sleutels. Geen sleutel, geen lek, ongeacht welke vlag waar staat. "Kan niet aan" i.p.v. "staat uit".
- **Contrarian (stilste risico, door niemand anders genoemd):** een extra Vercel-deploy die per ongeluk
  de PRODUCTIE-env (DB-URL/Supabase-project) erft en demo-rommel of een reset in je echte klantdata
  schrijft. Afdwingen: een EIGEN Vercel-project met eigen env-scope + een opstart-check die hard faalt
  als de DB-URL naar het prod-project wijst.
- **Strateeg + Contrarian:** migraties moeten in één commando over prod + test + demo lopen, anders
  herhaal je de schema-drift op een derde project. Dit is een voorwaarde om A te mogen kiezen, geen later-punt.
- **Klantadvocaat:** het hart voor de gebruiker is de angst wegnemen ("ik kan niks slopen") en meteen de
  kernhandeling kunnen doen (klus binnenkrijgen + afmelden) met een voor-ingerichte voorbeeldklus.
- **Pragmatist + Strateeg:** 80% bestaat al in het test-project (schema-bootstrap, account-script,
  fake-PDF-generator, migrate). Hergebruik die als bouwstenen, maar in een eigen demo-project.

### Echte meningsverschillen (dit zijn jouw keuzes, zie onderaan)
- **Reset-knop in beeld** (Klantadvocaat: stelt de twijfelaar gerust) **vs CLI-only reset** (Contrarian +
  Pragmatist: een zichtbare "leeg alles"-knop midden in een demo is een ongeluk dat wacht).
- **Deelbare één-tik-link** (Klantadvocaat: prospect kan zelf op afstand) **vs voor-ingelogde sessies op
  je eigen scherm** (Contrarian: een magic link lekt en blijft eindeloos leven).
- **Nu klein bouwen** (Strateeg: het is het verkoopinstrument dat je toch nodig hebt) **vs wachten tot Ed
  echt zelf wil rommelen** (Contrarian: anders bouw je voor nul klanten; een geleide demo kan volstaan).

### Verrassende inzichten uit ronde 2
- Veiligheid hoort op infrastructuurniveau (geen credentials, eigen project), niet in een if-statement.
- De duurste post is niet de opzet maar het derde project dat eeuwig meeloopt bij elke migratie.
- "D-light" is geen bouwwerk maar copy: de prospect-naam in de seed en de header. Een tekstveld.

### Conclusie na debat
Bouw **optie A, bewust klein, met veiligheid via afwezigheid.** Een eigen demo-Supabase-project + een
eigen Vercel-demo-project zonder SMS/mail-sleutels en met een opstart-check tegen de prod-DB. Seed en
reset als CLI-commando's die de bestaande test-assets hergebruiken, met één voor-ingerichte voorbeeldklus
en een kantoor- + monteur-account. Migraties via het bestaande migrate-mechanisme uitgebreid naar demo.
Niets bouwen dat naar een multi-klant-platform ruikt tot een tweede prospect het rechtvaardigt.

---

## Mijn aanbeveling (concreet)

**Fase 1, het minimale dat Ed iets echts laat zien (een halve tot een dag werk):**
1. **Eigen demo-Supabase-project** (gratis tier), apart van prod én van het CI/test-project. Schema via
   de bestaande `test-schema.sql` + alle migratie-blokken.
2. **Eigen Vercel-demo-project** (eigen env-scope; niet alleen een branch binnen het prod-project), met:
   - GEEN geldige CM.com/Resend-sleutels (versturen is fysiek onmogelijk).
   - Een opstart-/health-check die hard faalt als de Supabase-URL het prod-project bevat.
3. **`seed:demo`-script** (hergebruik `setup-test-users.ts` + fake-PDF-generator): zet een schone,
   gevulde staat neer: kantoor-account (Ed) + monteur-account, en een paar voorbeeldklussen verspreid
   over de statussen, waarvan één klaar om af te melden zodat de twee-kanten-magie meteen zichtbaar is.
4. **`reset:demo`** = opnieuw seeden (één commando vóór een afspraak).
5. **Migratie-uitbreiding:** één commando draait een blok tegen test én demo, zodat de derde omgeving
   niet wegdrijft.

**Fase 2, pas als Ed/een tweede prospect erom vraagt:**
- Reset-knop in de UI (als je voor zichtbaar-geruststellen kiest, zie keuze 1).
- `demo.config.ts` met prospect-naam/branding (D-light), zodat een tweede demo een kwartier kopieerwerk is.
- Echte sandbox-per-prospect (D).

**Waarom niet anders:** B zet productie-integriteit op het spel voor een demo (afgeraden door alle vier).
Zuiver C botst met CI en je schema-drift-historie. D nu is over-engineering zonder klanten.

---

## Open keuzes voor jou (geen haast, hoef je niet nu te beslissen)

1. **Reset: zichtbare knop of CLI-only?** Mijn advies: begin **CLI-only** (`npm run reset:demo` vóór een
   afspraak), veilig en simpel. Een zichtbare "speel opnieuw"-knop is sterk voor zelf-rommelen door een
   prospect, maar bouw die pas als je de demo onbeheerd uit handen geeft.
2. **Toegang: deelbare link of voor-ingelogd op je eigen scherm?** Mijn advies: voor Ed naast je aan
   tafel volstaan **voor-ingelogde sessies** (laptop = kantoor, telefoon = monteur). Een deelbare
   demo-link bouw je pas als prospects op afstand zelf moeten kunnen inloggen, en dan met verlopende toegang.
3. **Demo-database: eigen project of voorlopig test-project?** Mijn advies: **eigen demo-project**. Iets
   meer opzet, maar het voorkomt dat een CI-run je demo onderuit haalt op het slechtste moment.
4. **Nu bouwen of eerst geleide demo?** Mijn advies: bouw fase 1 **nu klein**. Je hebt sowieso een
   afgesloten toon-omgeving nodig voor elke prospect, en 80% bestaat al. Maar als je Ed eerst gewoon wilt
   laten meekijken terwijl jij klikt, kan dat zonder enige bouw, op de bestaande app met een testklus.
5. **Zelf rommelen of meekijken?** Bepaalt keuze 1 en 2. Meekijken = uitleggen wat het doet; zelf doen =
   het gevoel "kan ik dit zelf". Voor een aankoopbeslissing is dat tweede vaak nodig op precies de
   kernhandeling (klus binnen + afmelden).

Zeg morgen wat je wilt, dan maak ik er een concreet PLAN van (test-first) en bouw ik fase 1.
