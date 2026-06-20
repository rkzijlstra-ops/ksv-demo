# Testdekking (levend register)

Per feature/flow welke testlagen en welk(e) testbestand(en) hem dekken. Werk dit bij in dezelfde
commit als elke nieuwe feature of wijziging (afrond-check uit de skill projectstart-discipline).
Dit is het overzicht; de testbestanden zelf zijn de uitvoering. Laatst bijgewerkt: 2026-06-16.

Lagen: **U** = unit (vitest, gemockt), **I** = integratie (test-DB), **E** = browser-e2e (Playwright),
**M** = e2e-mail (echt versturen achter `E2E_MAIL=1`).

## Kern-flows (opdrachtgever / kantoor)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| **Volledige levenscyclus-keten** (inschieten→plannen→versturen→bevestigen→opleveren→dashboard), cross-rol, één doorloop, status-check per overgang | E | levenscyclus.spec | groen |
| Inschieten PDF, parsing, groepering op referentie | U, E | parser-schema.test, claude-client.test, opdrachtgever.spec | groen |
| Dashboard + "Te doen"-overzicht + statusfilter | U | te-doen.test, dashboard-scope.test, dashboard-lijst | groen |
| Planbord plaatsing/lanes/dubbele boeking | U | planbord.test | groen |
| Opgeleverde klus blijft groen op zijn dag op het planbord (geplaatst, niet als dubbele boeking, niet sleepbaar) | U | planbord.test (plaats + vindDubbeleBoekingen opgeleverd) | groen |
| Archief-venster dashboard/planbord = 30 dagen (ARCHIEF_DAGEN, één bron) | U | dashboard-scope.test, db.test (getOpdrachtenVoorDashboard) | groen |
| Heropenen opgeleverde klus → open + te plannen, instructie → werkomschrijving, "Heropend"-markering; opnieuw opleveren wist hem | U | db.test (heropenen + registreerZaakRapport), heropenen/route (instructie) | U groen; E door Rein |
| Vervolg-bezoek: "Eerder op deze referentie" op monteur- én kantoor-detailpagina + "meerdere bezoeken"-hint in de werkpool | E | (visueel/RLS; nog door Rein e2e te dekken) | grotendeels |
| Planbord drag-drop: plannen, verplaatsen, week schuiven | E | planbord.spec, planbord-extra.spec | groen |
| Ontplannen (terug naar pool) + mail bij verstuurd/bevestigd | U, M | ontplannen/route.test, ontplan-mail.test, mail-flows.spec | groen |
| Ontplannen: bevestigingsdialoog op het planbord (drag-naar-pool, Nee/Ja) | E | planbord-ontplannen.spec | groen |
| Versturen naar monteurs (verstuur-poort, gebundeld) | U, M | monteur-mail.test, mail-opdracht.spec | groen |
| Verzend-grendel mail: MAIL_DRY_RUN (=1 → niets versturen) + MAIL_ALLOWLIST (gevuld = beperkt; leeg = geen beperking), symmetrisch met SMS_DRY_RUN/SMS_ALLOWLIST | U | mail.test (MAIL_DRY_RUN + MAIL_ALLOWLIST), sms.test, demo.test (ontvangerToegestaan) | groen |
| Test-wachtwoordlogin (preview/test): `/test-login` + `/api/test-login?rol=` logt als vast test-account op de test-DB in; gegrendeld op niet-productie (VERCEL_ENV), op prod/demo onbereikbaar | U | demo.test (isTestLoginActief), test-login/route.test (gating + kantoor/monteur + foutpad) | groen |
| Verstuur-keten: nieuw / verzet (zelfde monteur, andere datum) / wissel (oude monteur → annulering) | U, M | opdracht-status.test (klassificeerVerzending), verstuur-notificatie.test (meldVerstuurd), monteur-mail.test + sms-teksten.test (verzet-toon), versturen/route.test, mail-monteur/route.test, mail-flows.spec (verzet/wissel), verzet-wissel.spec (monteur-UI na opnieuw versturen) | U+E groen; M handmatig (E2E_MAIL) |
| Nieuw document → mail + SMS naar monteur (bij verstuurd) | U | document-mail.test, notificaties.test (mail+SMS), documenten/route.test | U groen; M nog handmatig |
| Bevestig-herinnering → mail + SMS (cron, gebundeld, idempotent) | U, I | herinnering-mail.test, notificaties.test (mail+SMS), herinnering.int.test (selectie/idempotentie), cron/bevestig-herinneringen/route.test (auth + bundeling + markeren) | groen; M nog handmatig |
| Annuleren + mail naar monteur bij verstuurd | U, E, M | annuleren/route.test, annuleren.spec, mail-flows.spec | groen |
| Gebruikersbeheer, rollen, uitnodigen/afmelden | U, M | mail-flows.spec (uitnodiging/afmelding) | grotendeels |
| RLS-afscherming (data-laag): documenten/oplevering/mutatie/profielen per rol | E | afscherming.spec (rol-clients, negatieve tests) | groen |
| Rol-gates per pagina (dashboard/planbord/werkpool/gebruikers) | E | monteur.spec, opdrachtgever.spec | groen |
| Documentbeheer: bijvoegen + verwijderen (kantoor, rol-check, storage-opruiming) | U, E | opdrachten/[id]/documenten/route.test, documenten/[id]/route.test, documentbeheer.spec | groen |
| Verwijderen met eigendom-slot (monteur alleen eigen ingeschoten klus) | U | opdrachten/[id]/route.test | groen |
| Terugmelden aan kantoor (reden + toelichting, uit pool naar history, mail, logboek) | U, E | terugmeld-mail.test, terugmelden/route.test, werkpool.test, terugmelden.spec | groen |
| Terugmelden zet de klus terug naar "te plannen" (status binnen + planning leeg) + blijvende poging-historie (blok 22, snapshot) | U, E | db.test (markeerTeruggemeld), terugmelden/route.test (snapshot), terugmelden.spec (status binnen + poging) | groen |
| Kantoor ziet de terugmelding: filter-tab "Teruggemeld" + reden op kaart en in de planbord-pool | U, E | dashboard-lijst.test (pseudo-filter), terugmelden.spec (filter-chip + reden) | groen |
| Herkansing-keten: opnieuw uitsturen wist de terugmeld-vlag → klus weer actief bij de ontvangende monteur | U, E | db.test (markeerVerzonden reset), terugmelden.spec (datalaag) | groen |
| Opleveren na terugmelden: vlag opgeruimd + klus uit de te-plannen-pool (geen dubbel-inplan) | U, E | db.test (registreerZaakRapport), terugmelden.spec (datalaag) | groen |
| Monteur-geschiedenis: teruggemelde klus blijft zichtbaar ook na herplannen naar een ander (read-only poging) | E | terugmelden.spec (poging-historie) | groen |
| Terugmeld-venster los van de klikbare kaart (portal, geen flits-navigatie) + bevestiging na terugmelden | E | terugmelden.spec (flits-fix + bevestiging) | groen |
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
| Oplever-foto-upload robuust (per foto committen, teller + thumbnails 1-voor-1, per-item fout + opnieuw, abort bij verlaten) | U, E | foto-upload-queue.test, oplever-upload.spec (1-voor-1 + concept, fout-isolatie + opnieuw) | groen |
| Verlaat-waarschuwing + in-app navigatie-bevestiging bij lopende oplever-upload | U, E | oplever-upload-status.test, oplever-upload.spec (Terug tijdens upload → bevestiging; niets loopt → geen) | groen |
| Foto en video serialiseren (niet tegelijk uploaden; video wacht op foto's en andersom) | U, E | oplever-upload-status.test, oplever-upload.spec (video wacht → start na foto's) | groen |
| Weesbestanden opruimen: verwijderde/vervangen oplever-foto/video uit storage, mits nog niet verstuurd | U, E | storage-pad.test, oplever-bestand/route.test (rol/toegang/verstuurd/bucket), oplever-upload.spec (verwijderen → opruim-route + uit concept) | groen |
| Oplever- + afsluit-pagina indeling (ActieKaart, kleur-taal, volgorde intern→opmerking→akkoord, opdrachtgever boven, rapport in flow) | E | opleveren.spec (Klant laten tekenen/Akkoord/concept), afgerond.spec (Snel afsluiten link + Niet doorgegaan button) | groen |
| Controle-checklist bij oplevering (akkoord/niet akkoord, opgeslagen met tekst, in rapport boven de handtekening) | U, E | oplevering/route.test (controle door + ongemoeid), rapport.test (controle render), opleveren.spec (Akkoord aanvinken → in concept) | groen (E draait Rein mee) |
| Rapport genereren + mailen, status opgeleverd | U, M | oplever-mail.test (begeleidende tekst, geen rauwe link/opmerking), mail.test, rapport/route.test, mail.spec | groen (E door Rein) |
| Interne notitie: alleen in de zaak-versie, nooit in de klant-versie | U | rapport.test (interneNotitieVoorRapport: zaak wel, klant nooit, leeg→null) | groen |
| Ontkoppelde verzending klant/zaak (los in tijd; zaak zet pas opgeleverd; "klant heeft 't ook"-regel) | U | rapport/route.test (9: doelgroep, ontvanger, status, klantOok, foutpaden), oplever-mail.test (klant-ook-regel + niet in klant-mail) | groen (E door Rein) |
| Klant-mailadres uit de PDF (voorinvulwaarde, aanpasbaar) | U | claude-client.test (komt door de keten), parser-schema.test | groen |
| Privacy: kantoor ziet de oplevering pas na de zaak-versie | E | (nog te dekken, zie gaten) | open |
| Afzender-gegevens monteur (eigen profiel; op rapport, mail-ondertekening én From-naam i.p.v. keukenzaak/hardcoded BKM) | U, E | afzender→rapport.test (rapportAfzenderWeergave), oplever-mail.test (ondertekening + afzenderHeader), mijn-gegevens/route.test, mijn-gegevens.spec | groen |
| Naam beheren: monteur corrigeert eigen naam, beheerder hernoemt in lijst | U, E | mijn-gegevens/route.test, gebruikers/[id]/route.test (hernoemen), mijn-gegevens.spec | groen |
| PWA / offline-gedrag | E | monteur-pwa.spec | groen |

## Invoer-unificatie Part 2 (backend-fundament, blok 0/1/3.3/6)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Parser leest order uit PDF **én** foto (Claude vision; mediaType-bewust) | U | claude-client.test (buildOrderContent + image-block), opdrachten/route.test (foto = order-foto, 200) | groen |
| Samenvoegen geparste order met bestaand blok (vul leeg, met rust bij gelijk, botsing bij verschil, nooit stil overschrijven) | U | order-samenvoegen.test | groen |
| Andere-referentie-waarschuwing (bijgevoegde PDF hoort bij andere keuken) | U | order-samenvoegen.test | groen |
| Rol-bewuste invoer-bestemming (monteur → eigen werkpool; kantoor → zaak/te plannen) | U | invoer-bestemming.test | groen |
| Kantoor-correctie uitgebreide velden (e-mail/adviseur/leverweek/werkomschrijving), alleen als meegestuurd | U | opdrachten/[id]/route.test | groen |
| Gat A: gegevens wijzigen ná versturen zet "gewijzigd, opnieuw versturen"-markering | U | opdrachten/[id]/route.test (gepland=markeren, binnen=niet) | groen |
| Gat B: opgeleverde/geannuleerde klus niet meer bewerkbaar (409) | U | opdrachten/[id]/route.test | groen |
| Rol-bewuste create in `/api/opdrachten` (monteur → werkpool; kantoor → zaak/te plannen) | U | opdrachten/route.test (monteur/opdrachtgever/beheerder) | groen |
| Gedeeld `KlusInvoer`-component, monteur-context (vervangt `OpdrachtAanmaken`, zelfde flow) | E | zelf-invoer.spec | groen (CI) |
| Dashboard "Nieuwe klus" (kantoor-context), handmatig zonder PDF → in de lijst | E | dashboard-nieuwe-klus.spec | via CI |
| Order toevoegen via "Order fotograferen" (camera op mobiel) + "Bestand kiezen" | E | zelf-invoer.spec (knop zichtbaar) | via CI |
| Subtiel kopieer-knopje bij het inbound-mailadres (Mijn gegevens) | E | mijn-gegevens.spec (Kopieer-knop zichtbaar) | via CI |
| Kantoor corrigeert uitgebreide velden op de detailpagina (e-mail/adviseur/leverweek/werk-omschrijving) | U, E | opdrachten/[id]/route.test, verplaatsen-detail.spec | via CI |
| Inbound gladgetrokken: groeperen op ref, mailtekst → werk-veld, rol-bewust (monteur → /inbox; kantoor → direct dashboard) | U | inbound/route.test | groen |
| Opdrachtgever (Ed) heeft een inbound-mailadres op Mijn gegevens | E | opdrachtgever.spec | via CI |

**Nog te bouwen (volgende PR's):** botsing-UI bij een bijgevoegde order met afwijkend veld (leunt op echt parsen, daarom live door Rein), volledige `OpdrachtBewerken` → component-samensmelting (blok 7, lage prio), opruimen `InschietZone` (blok 7). De inbound end-to-end (echte Resend-webhook + parsen) bevestigt Rein live. Zie `PLAN-INVOER-UNIFICATIE-2.md`.

## Bekende gaten (eerlijk, nog te dekken)

- **✅ Verzend-flow (klant/zaak) e2e: gedekt sinds 2026-06-16.** `verzending.spec` dekt (1) klant-
  verzending laat de status met rust, (2) zaak-verzending zet 'm op opgeleverd, (3) het kantoor-dashboard
  toont de oplevering pas na de zaak-versie (privacy). (4) interne notitie wel in de zaak-, niet in de
  klant-PDF is unit-gedekt (rapport.test). De volledige keten t/m het dashboard-opleverblok loopt nu in
  `levenscyclus.spec`.
- **❌ NOG OPEN: werkpool-geheugensteun "rapport naar zaak nog versturen"** (privé voor de monteur) is nog
  niet gebouwd. Dit is een nieuwe UI-feature met ontwerpkeuzes, geen test; bewust niet 's nachts gebouwd.
  De twee verzendkaarten tonen de status al per kant op het oplever-scherm zelf. Aanbevolen volgende stap.
- Component-test-laag (jsdom/RTL) bestaat niet; UI-gedrag hoort daarom in de Playwright-e2e.

## Hoe draaien

- `npm test` — alle unit/route (laag U), snel, geen browser.
- `npm run test:e2e` — Playwright (laag E), tegen de test-DB via `.env.test`.
- `npm run test:mail` — e2e-mail (laag M), verstuurt echt naar de test-mailbox.
- `npm run test:all` — U + I + E in één keer.
