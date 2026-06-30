# 2026-06-27 — Oplever/dashboard/detail-herontwerp + bugfixes uit live gebruik

Lange sessie, voortgekomen uit Reinier die live testte op de test-omgeving. Begon met losse bugjes,
groeide uit tot een herontwerp van de oplever-levenscyclus, de zaak-kant op het dashboard en de
monteur-detailpagina. Alles op `fix-oplever-bugs`, gekeurd op kluslus-test, PR #29 naar master.

## Bugfixes (uit echt gebruik)
- **Inbound doorgestuurde mail**: `schoonOmschrijving` kapte een forward kapot (hield alleen
  "---------- Forwarded message ---------" over). Nu: bij een forward de doorstuur-kop overslaan en de
  body eronder als werkomschrijving nemen. (`src/lib/mail-schoon.ts`)
- **Melding-video** stond niet in het meldingen-overzicht op de detailpagina (alleen foto's). Toegevoegd
  op monteur + kantoor.
- **Mailtekst** noemde altijd "de foto's", ook zonder foto's. Nu conditioneel (foto's en/of video, telt
  ook melding-media). Rapport-label "Keukenzaak" -> "Opdrachtgever".
- **Snel afsluiten "Later versturen"** ging naar de detailpagina (404 bij een teruggegeven klus); nu naar
  de kluspool.
- **404 na snel afsluiten + vervolg**: de oude vervolg ontplande de klus (toegewezen_aan = null), waarna
  de monteur hem niet meer mocht lezen -> notFound. Opgelost door het vervolg-herontwerp (zie onder).

## Oplever-levenscyclus (herontwerp)
- **Vervolg = opgeleverd.** "Klus is niet af" levert nu gewoon OP (groen) met label **"Vervolg nodig"**;
  niet meer automatisch terug naar de pool. De zaak beslist zelf: verwerken of heropenen.
- **Read-only/waarschuwing op status "opgeleverd"** (niet meer op "een keer verstuurd"), zodat een
  heropende klus weer bewerkbaar is. Logica in `src/lib/oplever-toegang.ts`.
- **"Toch aanpassen"**: de monteur die zelf opleverde (oplevering.user_id) mag een read-only
  opdrachtgever-klus alsnog bijwerken (`?aanpassen=1` -> bewerkbare flow met waarschuwing). Een ander niet.
- **Heropenen** zet de oplevering schoon (nieuwe ronde); verstuurde rapporten blijven als read-only
  historie in de verzendgeschiedenis. (`db.heropenen` reset de oplevering-velden.)

## Dashboard (zaak-kant)
- Opgeleverde klus = **"Te verwerken"** (blauw) tot de zaak hem afhandelt -> **"Verwerkt"** (groen).
  Helper `verwerkStatus` (`afrond-status.ts`); badges op `OpdrachtDashboardCard`; teller "X te verwerken"
  op het dashboard; **"Markeer als verwerkt"** (`VerwerktKnop`) voor elke opgeleverde klus.

## Monteur-detailpagina
- Meldingen **inklapbaar** (dicht als standaard, `MeldingRegel`), en de lijst toont alleen de **huidige
  ronde** (na het laatste `heropend_at`).
- **"Vorige ronde"**-blok: eerdere meldingen + vorig rapport **alleen-lezen**.
- **"Eerder op deze referentie" geschrapt** (verwarrend; ving vooral dubbel-ingeschoten orders;
  terugkomers lopen via heropenen).
- **"Oplevering verstuurd / Opnieuw versturen"** alleen bij een in DEZE ronde opgeleverde klus.

## Rapport (PDF)
- **Omlijnde video-knop** (play-vak + label + "openen") i.p.v. onderstreepte tekst, gedeeld door alle
  videolinks. Verkort rapport zonder volledige-oplever-termen; "Video"-samenvatting telt melding-video.

## Inschieten
- **Duplicaat-waarschuwing**: bestaat het referentienummer al, dan bevestiging vóór aanmaken
  (`/api/opdrachten/ref-bestaat`). Lost de bron van dubbele orders op. Bewust niet bij inbound (mail is
  niet-interactief; een dubbele zie je als extra voorstel/klus en gooi je weg).

## Hulpmiddel
- **Screenshot-tool** voor Reinier (kon geen plaatje in de chat plakken): bureaublad-snelkoppeling
  "Screenshot naar Claude" -> `C:\Users\rkzij\Mainframe\_screenshots\laatste.png`; bij "kijk" leest Claude
  dat bestand.

## Verificatie
Volledige unit-suite (902) + e2e groen; `TESTDEKKING.md` en `TOESTANDEN.md` per wijziging bijgewerkt.
Service-worker bij elke deploy gebumpt (t/m ksv-v19) voor de PWA-verversing.
