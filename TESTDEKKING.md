# Testdekking (levend register)

Per feature/flow welke testlagen en welk(e) testbestand(en) hem dekken. Werk dit bij in dezelfde
commit als elke nieuwe feature of wijziging (afrond-check uit de skill projectstart-discipline).
Dit is het overzicht; de testbestanden zelf zijn de uitvoering. Laatst bijgewerkt: 2026-06-14.

Lagen: **U** = unit (vitest, gemockt), **I** = integratie (test-DB), **E** = browser-e2e (Playwright),
**M** = e2e-mail (echt versturen achter `E2E_MAIL=1`).

## Kern-flows (opdrachtgever / kantoor)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Inschieten PDF, parsing, groepering op referentie | U, E | parser-schema.test, claude-client.test, opdrachtgever.spec | groen |
| Dashboard + "Te doen"-overzicht + statusfilter | U | te-doen.test, dashboard-scope.test, dashboard-lijst | groen |
| Planbord plaatsing/lanes/dubbele boeking | U | planbord.test | groen |
| Planbord drag-drop: plannen, verplaatsen, week schuiven | E | planbord.spec, planbord-extra.spec | groen |
| Ontplannen (terug naar pool) + mail bij verstuurd/bevestigd | U, M | ontplannen/route.test, ontplan-mail.test, mail-flows.spec | groen |
| Ontplannen: bevestigingsdialoog op het planbord (drag-naar-pool, Nee/Ja) | E | planbord-ontplannen.spec | groen |
| Versturen naar monteurs (verstuur-poort, gebundeld) | U, M | monteur-mail.test, mail-opdracht.spec | groen |
| Verstuur-keten: nieuw / verzet (zelfde monteur, andere datum) / wissel (oude monteur → annulering) | U, M | opdracht-status.test (klassificeerVerzending), verstuur-notificatie.test (meldVerstuurd), monteur-mail.test + sms-teksten.test (verzet-toon), versturen/route.test, mail-monteur/route.test, mail-flows.spec (verzet/wissel) | U groen; M handmatig (E2E_MAIL) |
| Nieuw document → mail + SMS naar monteur (bij verstuurd) | U | document-mail.test, notificaties.test (mail+SMS), documenten/route.test | U groen; M nog handmatig |
| Bevestig-herinnering → mail + SMS (cron, gebundeld, idempotent) | U, I | herinnering-mail.test, notificaties.test (mail+SMS), herinnering.int.test (selectie/idempotentie) | groen; M nog handmatig |
| Annuleren + mail naar monteur bij verstuurd | U, E, M | annuleren/route.test, annuleren.spec, mail-flows.spec | groen |
| Gebruikersbeheer, rollen, uitnodigen/afmelden | U, M | mail-flows.spec (uitnodiging/afmelding) | grotendeels |
| RLS-afscherming (data-laag): documenten/oplevering/mutatie/profielen per rol | E | afscherming.spec (rol-clients, negatieve tests) | groen |
| Rol-gates per pagina (dashboard/planbord/werkpool/gebruikers) | E | monteur.spec, opdrachtgever.spec | groen |
| Documentbeheer: bijvoegen + verwijderen (kantoor, rol-check, storage-opruiming) | U, E | opdrachten/[id]/documenten/route.test, documenten/[id]/route.test, documentbeheer.spec | groen |
| Verwijderen met eigendom-slot (monteur alleen eigen ingeschoten klus) | U | opdrachten/[id]/route.test | groen |
| Terugmelden aan kantoor (reden + toelichting, uit pool naar history, mail, logboek) | U, E | terugmeld-mail.test, terugmelden/route.test, werkpool.test, terugmelden.spec | groen |
| Logboek (audit-trail): wie deed wat, weergave op detailpagina | U, E | opdrachten/[id]/route.test (log bij verwijderen), terugmelden.spec | groen |
| Geannuleerde opdrachten inklapbaar op het dashboard | E | dashboard-geannuleerd.spec | groen |
| Terugknop volgt herkomst (planbord vs dashboard) | E | terug-navigatie.spec | groen |
| Status-kleurtaal (geel = niet bevestigd) op dashboard/planbord | visueel | build (styling, geen zinvolle assertie) | groen |
| Inplan-tijd: kies-of-typ selector (datalist, per 5 min) | U, E | tijd.test (tijdOpties), planbord.spec (inplan-formulier) | groen |
| Planbord-styling: dikke gekleurde omlijsting, adres in blok, ruimte tussen monteurs, geen kartelrand | visueel | build + screenshots.spec | groen |
| Navigatie dashboard<->planbord (gelijke knop, boven en onder) | E | terug-navigatie.spec | groen |

## Kern-flows (monteur / PWA)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Werkpool: alleen eigen klussen (RLS), toegang afgeschermd | E | monteur.spec | groen |
| Werkpool-zichtbaarheid bij kantoor-statuswijziging (geannuleerd/concept verborgen, afspraak + monteur vasthouden) | U, E | werkpool.test, opdracht-status.test, werkpool-zichtbaarheid.spec | groen |
| Bevestigen op de detailpagina | E | bevestigen.spec | groen |
| Bevestigen vanaf de werkpool-kaart (badge + snelknop, geen navigatie) | U, E | urgentie.test (bevestigBadgeConfig), bevestigen.spec | groen |
| Zelf-invoer klus (gecombineerd: PDF voorvullen + handmatig, niets verplicht) | U, E | opdrachten/route.test, zelf-invoer.spec | groen |
| Werk-omschrijving (typen + spraak): invoeren, tonen op detail, bewerken (eigen klus + kantoor), puur intern (niet in rapport) | U, E | db.test (createOpdracht/updateWerkomschrijving), opdrachten/route.test, opdrachten/[id]/werkomschrijving/route.test, zelf-invoer.spec | groen (E door Rein) |
| Melding toevoegen (incl. spoed) + spoed-mail | U, M | mail-flows.spec (spoed) | grotendeels |
| Oplevering: foto-upload + handtekening-canvas + opmerking als concept (saves geserialiseerd) | U, E | rapport.test, opleveren.spec | groen |
| Controle-checklist bij oplevering (akkoord/niet akkoord, opgeslagen met tekst, in rapport boven de handtekening) | U, E | oplevering/route.test (controle door + ongemoeid), rapport.test (controle render), opleveren.spec (Akkoord aanvinken → in concept) | groen (E draait Rein mee) |
| Rapport genereren + mailen, status opgeleverd | U, M | oplever-mail.test (begeleidende tekst, geen rauwe link/opmerking), mail.test, rapport/route.test, mail.spec | groen (E door Rein) |
| Interne notitie: alleen in de zaak-versie, nooit in de klant-versie | U | rapport.test (interneNotitieVoorRapport: zaak wel, klant nooit, leeg→null) | groen |
| Ontkoppelde verzending klant/zaak (los in tijd; zaak zet pas opgeleverd; "klant heeft 't ook"-regel) | U | rapport/route.test (9: doelgroep, ontvanger, status, klantOok, foutpaden), oplever-mail.test (klant-ook-regel + niet in klant-mail) | groen (E door Rein) |
| Klant-mailadres uit de PDF (voorinvulwaarde, aanpasbaar) | U | claude-client.test (komt door de keten), parser-schema.test | groen |
| Privacy: kantoor ziet de oplevering pas na de zaak-versie | E | (nog te dekken, zie gaten) | open |
| Afzender-gegevens monteur (eigen profiel; op rapport, mail-ondertekening én From-naam i.p.v. keukenzaak/hardcoded BKM) | U, E | afzender→rapport.test (rapportAfzenderWeergave), oplever-mail.test (ondertekening + afzenderHeader), mijn-gegevens/route.test, mijn-gegevens.spec | groen |
| Naam beheren: monteur corrigeert eigen naam, beheerder hernoemt in lijst | U, E | mijn-gegevens/route.test, gebruikers/[id]/route.test (hernoemen), mijn-gegevens.spec | groen |
| PWA / offline-gedrag | E | monteur-pwa.spec | groen |

## Bekende gaten (eerlijk, nog te dekken)

- **E2e voor de nieuwe verzend-flow (klant/zaak) staat nog open.** De backend is unit-gedekt
  (rapport/route.test, oplever-mail.test, rapport.test) en de mail-e2e is bijgewerkt naar de
  "Stuur naar zaak"-knop. Nog te doen (door Rein, e2e): (1) klant-verzending zet de status NIET op
  opgeleverd; (2) zaak-verzending zet 'm wél; (3) het kantoor-dashboard toont de oplevering pas na de
  zaak-versie (privacy); (4) interne notitie verschijnt wel in de zaak-PDF, niet in de klant-PDF.
- **Werkpool-geheugensteun "rapport naar zaak nog versturen"** (privé voor de monteur) is nog niet
  gebouwd; de twee verzendkaarten tonen de status al per kant op het oplever-scherm zelf.
- Component-test-laag (jsdom/RTL) bestaat niet; UI-gedrag hoort daarom in de Playwright-e2e.

## Hoe draaien

- `npm test` — alle unit/route (laag U), snel, geen browser.
- `npm run test:e2e` — Playwright (laag E), tegen de test-DB via `.env.test`.
- `npm run test:mail` — e2e-mail (laag M), verstuurt echt naar de test-mailbox.
- `npm run test:all` — U + I + E in één keer.
