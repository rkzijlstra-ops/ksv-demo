# Testdekking (levend register)

Per feature/flow welke testlagen en welk(e) testbestand(en) hem dekken. Werk dit bij in dezelfde
commit als elke nieuwe feature of wijziging (afrond-check uit de skill projectstart-discipline).
Dit is het overzicht; de testbestanden zelf zijn de uitvoering. Laatst bijgewerkt: 2026-06-26.

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
| Vervolg-bezoek: "Eerder op deze referentie" op monteur- én kantoor-detailpagina + "meerdere bezoeken"-hint in de kluspool | E | (visueel/RLS; nog door Rein e2e te dekken) | grotendeels |
| Planbord drag-drop: plannen, verplaatsen, week schuiven | E | planbord.spec, planbord-extra.spec | groen |
| Planbord koppelt klussen op account-id (toegewezen_aan), nooit onzichtbaar bij naam-mismatch + vangnet-rij; pool-inplanknop kiest geen monteur voor | E | planbord.spec (rendering + inplannen) | groen |
| Planbord resize: rechterrand van een montage slepen wijzigt de duur (1 kolom = 1 werkdag), kapt visueel op vrijdag, telt door over de weekgrens, ondergrens 1 zichtbare kolom, max 20 | U | planbord.test (nieuweDuurNaResize) | groen |
| Planbord resize end-to-end: rand naar rechts verlengt (duur 1→3, "3 dagen"); voorbij vrijdag laat de klus in de volgende week doorlopen | E | planbord.spec (resize binnen week + over de weekgrens) | groen |
| Resize/verplaatsen van een al verstuurde klus met andere duur markeert opnieuw "te versturen" (monteur moet de nieuwe duur weten) | U | opdracht-status.test (moetOpnieuwVersturenNa), db.test (wijzigOpdracht resize) | groen |
| Planbord -/+ dagknoppen op een montage: één klik = één werkdag erbij/eraf (min 1, max 20), loopt door over de weekgrens (intuïtiever dan de rand-sleep) | U, E | planbord.test (duurNaStap), planbord.spec ("+ knop maakt een dag langer") | groen |
| Naar volgende/vorige week slepen (rand-strook) landt op de MAANDAG van de doelweek, niet op dezelfde weekdag | U | planbord.test (weekschuifNaarMaandag) | groen |
| Weekend aan/uit op het planbord (knop): toont/verbergt za+zo als extra kolommen (7 i.p.v. 5), voorkeur onthouden (localStorage, hydratie-veilig via useSyncExternalStore) | U, E | planbord.test (weekDagen metWeekend), planbord.spec ("weekend-knop toont za/zo") | groen |
| Klus die op za/zo START loopt op kalenderdagen door (weekend-klus blijft in het weekend i.p.v. naar maandag); werkdag-klus slaat het weekend over | U, E | planbord.test (werkdagenVanaf weekend), planbord.spec ("klus op zaterdag blijft zichtbaar"/"naar zaterdag slepen") | groen (drag e2e via CI) |
| Een week met een klus op za/zo toont het weekend altijd, ook als de knop uit staat (klus nooit onzichtbaar) | U, E | planbord.test (weekHeeftWeekendKlus), planbord.spec ("klus op zaterdag maakt weekend zichtbaar") | groen |
| Week verschuiven via de rand: volgende week → maandag; vorige week → vrijdag (weekend uit) of zondag (weekend aan) | U, E | planbord.test (weekschuifLanding), planbord.spec ("naar vorige week landt op vrijdag") | groen |
| Maandoverzicht (optie C, weekstroken): Week/Maand-toggle, alle monteurs + klussen per week-strook, vorige/volgende maand, klikbaar naar detail | U, E | planbord.test (maandWeken, verschuifMaand), planbord.spec ("maandweergave toont klus + navigatie") | groen |
| e2e-opruim van planbord-extra ruimt alleen eigen testdata op (PBX-tag), niet alles per account: handmatige testdata op de gedeelde test-DB overleeft een CI-run | E | planbord-extra.spec (groen) + handmatig geverifieerd | groen |
| Test-login self-provisioning (zoekt account op e-mail, maakt aan met profiel-rol; werkt op elke test-DB) | U | test-login/route.test | groen |
| E2e ruimt eigen test-klussen + demo-klussen op (gedeelde test-DB schoon) | infra | global-teardown, e2e-demo/global-teardown | n.v.t. |
| Ontplannen (terug naar pool) + mail bij verstuurd/bevestigd | U, M | ontplannen/route.test, ontplan-mail.test, mail-flows.spec | groen |
| Ontplannen: bevestigingsdialoog op het planbord (drag-naar-pool, Nee/Ja) | E | planbord-ontplannen.spec | groen |
| Versturen naar monteurs (verstuur-poort, gebundeld) | U, M | monteur-mail.test, mail-opdracht.spec | groen |
| Verzend-grendel mail: MAIL_DRY_RUN (=1 → niets versturen) + MAIL_ALLOWLIST (gevuld = beperkt; leeg = geen beperking), symmetrisch met SMS_DRY_RUN/SMS_ALLOWLIST | U | mail.test (MAIL_DRY_RUN + MAIL_ALLOWLIST), sms.test, demo.test (ontvangerToegestaan) | groen |
| Test-wachtwoordlogin (preview/test): `/test-login` + `/api/test-login?rol=` logt als vast test-account op de test-DB in; aan via TEST_LOGIN=1 of niet-productie (VERCEL_ENV); op echte prod/demo 404; `/test-login` vrijgesteld in de auth-middleware | U | demo.test (isTestLoginActief incl. TEST_LOGIN), test-login/route.test (gating + kantoor/monteur + foutpad) | groen (middleware-uitzondering live bevestigd) |
| Verstuur-keten: nieuw / verzet (zelfde monteur, andere datum) / wissel (oude monteur → annulering) | U, M | opdracht-status.test (klassificeerVerzending), verstuur-notificatie.test (meldVerstuurd), monteur-mail.test + sms-teksten.test (verzet-toon), versturen/route.test, mail-monteur/route.test, mail-flows.spec (verzet/wissel), verzet-wissel.spec (monteur-UI na opnieuw versturen) | U+E groen; M handmatig (E2E_MAIL) |
| Nieuw document → mail + SMS naar monteur (bij verstuurd) | U | document-mail.test, notificaties.test (mail+SMS), documenten/route.test | U groen; M nog handmatig |
| Bevestig-herinnering → mail + SMS (cron, gebundeld, idempotent) | U, I | herinnering-mail.test, notificaties.test (mail+SMS), herinnering.int.test (selectie/idempotentie), cron/bevestig-herinneringen/route.test (auth + bundeling + markeren) | groen; M nog handmatig |
| Annuleren + mail naar monteur bij verstuurd | U, E, M | annuleren/route.test, annuleren.spec, mail-flows.spec | groen |
| Gebruikersbeheer, rollen, uitnodigen/afmelden | U, M | mail-flows.spec (uitnodiging/afmelding) | grotendeels |
| RLS-afscherming (data-laag): documenten/oplevering/mutatie/profielen per rol | E | afscherming.spec (rol-clients, negatieve tests) | groen |
| Rol-gates per pagina (dashboard/planbord/kluspool/gebruikers) | E | monteur.spec, opdrachtgever.spec | groen |
| Documentbeheer: bijvoegen + verwijderen (kantoor, rol-check, storage-opruiming) | U, E | opdrachten/[id]/documenten/route.test, documenten/[id]/route.test, documentbeheer.spec | groen |
| Documenten-blok (gedeeld monteur/kantoor): soort-label + voorbeeld + groepering, in-app PDF-viewer (overlay, geen nieuw tabblad), offline-laadknop (alleen monteur) | U, E | document-weergave.test (soort/meta/groep), pdf-documenten.spec (groepering + viewer-dialoog + offline aan/afwezig + verwijderen) | groen |
| Verwijderen met eigendom-slot (monteur alleen eigen ingeschoten klus) | U | opdrachten/[id]/route.test | groen |
| Terugmelden aan kantoor (reden + toelichting, uit pool naar history, mail, logboek) | U, E | terugmeld-mail.test, terugmelden/route.test, kluspool.test, terugmelden.spec | groen |
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
| Kluspool: alleen eigen klussen (RLS), toegang afgeschermd | E | monteur.spec | groen |
| Kluspool-zichtbaarheid bij kantoor-statuswijziging (geannuleerd/concept verborgen, afspraak + monteur vasthouden) | U, E | kluspool.test, opdracht-status.test, kluspool-zichtbaarheid.spec | groen |
| Bevestigen op de detailpagina | E | bevestigen.spec | groen |
| Bevestigen vanaf de kluspool-kaart (badge + snelknop, geen navigatie) | U, E | urgentie.test (bevestigBadgeConfig), bevestigen.spec | groen |
| Zelf-invoer klus (gecombineerd: PDF voorvullen + handmatig, niets verplicht) | U, E | opdrachten/route.test, zelf-invoer.spec | groen |
| Werk-omschrijving (typen + spraak): invoeren, tonen op detail, bewerken (eigen klus + kantoor), puur intern (niet in rapport) | U, E | db.test (createOpdracht/updateWerkomschrijving), opdrachten/route.test, opdrachten/[id]/werkomschrijving/route.test, zelf-invoer.spec | groen (E door Rein) |
| Melding toevoegen (incl. spoed, incl. video) + spoed-mail | U, E, M | mail-flows.spec (spoed), melding-flow.spec (video-invoer + round-trip), meldingen/route.test + meldingen/[id]/route.test (video_url) | grotendeels |
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
| Reply-To op de oplever-mail = de monteur die opleverde (profiel contact_email), vangnet RESEND_REPLY_TO; afzender blijft RESEND_FROM | U | email.test (geldigEmail), reply-to.test (bepaalReplyTo), mail.test (monteur-mail wint, vangnet erachter) | groen |
| Eerste-verzending-waarschuwing per domein op de klus (monteur + kantoor): inklapbaar blok, kopieerbare WhatsApp-tekst, "Opnieuw versturen" met adres-correctie | U, E | verzend-domein.test (domein + eerste-contact), oplever-mail.test (bouwWhatsappTekst), rapport/route.test (naar-override); E op omgeving-test | U groen; E door Rein |
| Onboarding-gate: monteur met onvolledig profiel → /welkom (afzendergegevens verplicht bij eerste gebruik); niet in demo; welkom-stap met handleiding-knop | U, E | profiel.test (profielVolledig), toegang.test (onvolledig→/welkom, volledig door, demo uit, skipOnboarding, beheerder vrij); E op omgeving-test | U groen; E door Rein |
| Naam beheren: monteur corrigeert eigen naam, beheerder hernoemt in lijst | U, E | mijn-gegevens/route.test, gebruikers/[id]/route.test (hernoemen), mijn-gegevens.spec | groen |
| PWA / offline-gedrag | E | monteur-pwa.spec | groen |

## Oplever-herinrichting + snel afsluiten (2026-06-24)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Klant-levering per opdrachtgever (eigen klus altijd; opdrachtgever-klus volgt de vlag) | U | klant-levering.test (magKlantLeveren) | groen |
| Dashboard-schakelaar klant-levering aan/uit (beheerder, PATCH + persist) | E | opdrachtgever-instelling.spec | groen |
| Opleveren: klant-kant gegate (keuzekaart "ook aan de klant"), "voor de opdrachtgever"-blok met foto/video/tekst, "Later versturen"-kaart | E | opleveren.spec, verzending.spec (klant-kant aanzetten) | groen |
| Interne media (foto/video) voor de opdrachtgever: alleen in de zaak-versie, nooit klant | U | rapport.test (interneFotosVoorRapport/interneVideoVoorRapport) | groen |
| Verkorte rapport-variant (snel afsluiten): zonder handtekening + controle; volledige PDF onveranderd | U | rapport.test (toonHandtekening/toonControleInRapport + verkorte PDF rendert) | groen |
| Snel afsluiten = verkorte oplevering (verkorte PDF i.p.v. tekstmail); geen handtekening/voorvertoon | E | afgerond.spec (UI-smoke verkorte flow) | groen |
| Vervolg-keten: verkorte PDF naar opdrachtgever, NIET opgeleverd, terug naar kantoor + "Vervolg plannen"-label; ad-hoc blijft bij monteur | E | afgerond.spec (db-keten registreerVerkortRapportVervolg + ontplan) | groen |
| kluspool → kluspool app-breed (UI + codenamen), legacy ?kluspool=1 blijft werken | U, E | kluspool.test, kluspool-zichtbaarheid.spec + 11 specs | groen |

## Melding-flow herinrichting (2026-06-26)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Video op een melding (API accepteert+bewaart `video_url`, db-laag, formulier, rapport-PDF videolink) | U, E | meldingen/route.test (POST video_url), meldingen/[id]/route.test (PATCH video_url), db.test (create/updateMelding video_url), rapport.test (melding-videolink-annotatie), melding-flow.spec (video-invoer aanwezig + opgeslagen video terug in bewerk-formulier) | groen |
| Spoed-only label: alleen spoed krijgt een badge, gewone melding zonder label (oude "Open"/"Achteraf" geschrapt) | U, E | urgentie.test (meldingStaatConfig → null bij niet-spoed), melding-flow.spec (één spoed-badge, geen Open/Achteraf) | groen |
| Detailpagina-herinrichting: koppen "Meldingen tijdens de klus" + "Aan het einde van de klus"-blok, knop "Beschadiging of manco melden", afsluiten als blok → /afronden, onderbalk alleen "Terug naar kluspool" | E | melding-flow.spec (koppen + afsluit-blok navigeert + onderbalk) | groen |
| Meldingen-media-telling (read-only overzicht "Dit gaat mee in het rapport") | U, E | melding-overzicht.test (meldingMediaTelling: enkelvoud/meervoud/video/leeg), melding-flow.spec (overzicht toont de meldingen) | groen |
| Snel afsluiten ontdubbeld: geen media-invoer, compact meldingen-overzicht (thumbnails + tekst + telling) + begeleidend bericht (= hergebruikt `opmerking`), bestaand versturen-blok ongewijzigd, ontsnap-knop "Liever uitgebreid opleveren?" bovenaan → /opleveren; geen "geen foto/video"-waarschuwing in verkort | E | melding-flow.spec (layout: geen "De oplevering", begeleidend bericht, versturen-knop, ontsnap-link bovenaan) | groen |
| Snel afsluiten klant-levering: GEEN "Ook aan de klant"-schakelaar (die opende het hier-verwijderde interne blok); klant-levering is in verkort een directe verstuur-optie ("Naar de klant" → adresveld) als de klus het toestaat | E | melding-flow.spec (schakelaar afwezig in snel; "Naar de klant" opent klant-adresveld op een eigen klus) | groen |
| Melding-concept-vangnet: invoer (tekst/spoed/foto's/video) automatisch lokaal bewaard, hersteld na weg-navigeren (ook de telefoon-terugknop) of app sluiten; gewist bij opslaan en bij bewust weggooien. Opslaan-knop blijft leidend | U, E | melding-concept.test (sleutel/leeg/round-trip/corrupt), melding-flow.spec (invoer blijft bewaard na weg en terug) | groen |
| Snel afsluiten met 0 meldingen: lege overzicht-staat + bevestiging "Versturen zonder melding?" vóór versturen | E | melding-flow.spec (lege staat + dialog-bevestiging, annuleren blijft op de pagina) | groen |
| Verkorte PDF bevat de meldingen incl. melding-videolink + het begeleidend bericht (opmerking, onvoorwaardelijk) | U | rapport.test (verkorte variant: meldingen-videolink-annotatie) | groen |

Video-UPLOAD via de UI zelf (VideoMaken) is gedekt door oplever-upload.spec (zelfde component); de melding-flow-e2e seedt de video via de db en checkt de create→opslag→lezen→formulier-keten (geen flaky upload-dubbeling). Video offline: bewust NIET in de offline-queue (VideoMaken is online-only), gedocumenteerd in MeldingForm.

## Invoer-unificatie Part 2 (backend-fundament, blok 0/1/3.3/6)

| Feature / flow | Lagen | Testbestand(en) | Status |
|---|---|---|---|
| Parser leest order uit PDF **én** foto (Claude vision; mediaType-bewust) | U | claude-client.test (buildOrderContent + image-block), opdrachten/route.test (foto = order-foto, 200) | groen |
| Samenvoegen geparste order met bestaand blok (vul leeg, met rust bij gelijk, botsing bij verschil, nooit stil overschrijven) | U | order-samenvoegen.test | groen |
| Andere-referentie-waarschuwing (bijgevoegde PDF hoort bij andere keuken) | U | order-samenvoegen.test | groen |
| Rol-bewuste invoer-bestemming (monteur → eigen kluspool; kantoor → zaak/te plannen) | U | invoer-bestemming.test | groen |
| Kantoor-correctie uitgebreide velden (e-mail/adviseur/leverweek/werkomschrijving), alleen als meegestuurd | U | opdrachten/[id]/route.test | groen |
| Gat A: gegevens wijzigen ná versturen zet "gewijzigd, opnieuw versturen"-markering | U | opdrachten/[id]/route.test (gepland=markeren, binnen=niet) | groen |
| Gat B: opgeleverde/geannuleerde klus niet meer bewerkbaar (409) | U | opdrachten/[id]/route.test | groen |
| Rol-bewuste create in `/api/opdrachten` (monteur → kluspool; kantoor → zaak/te plannen) | U | opdrachten/route.test (monteur/opdrachtgever/beheerder) | groen |
| **Robuuste klus-invoer: meerdere/grote PDF's per klus, één orderbon leidend** (ref/telefoon uit de orderbon ook met tekeningen erbij) | U | order-groep.test (refKern 166/SP166, naamKern, union-find, voegOrderSamen), order-inlezen.test (per-bestand eerste pagina + groeperen, orderbon wint) | groen |
| Client-upload buiten de 413-grens (signed upload-URL) + validatie | U | upload-validatie.test (aantal/type/grootte); storage.signDocumentUpload/downloadDocument | U groen; live door Rein |
| Inlezen-route (paden → groepen) + aanmaken-route (per groep een klus + documenten, rol-bewust) | U | opdrachten/inlezen/route.test (groep-passthrough), opdrachten/aanmaken/route.test (2 klussen, juiste docs/primair, 401/400) | groen |
| Twee-klussen-keuze in `KlusInvoer` (voorgegroepeerd, invoerder wijst per bestand toe) | E | (live door Rein: vereist echt parsen, niet in CI met dummy-keys) | open (handmatig pad via zelf-invoer/dashboard-nieuwe-klus groen) |
| Werkomschrijving uit mail opgeschoond (handtekening/citaat/disclaimer eraf), PDF-order laat 'm leeg; doorgestuurde mail zonder eigen notitie -> body onder de doorstuur-kop als werkomschrijving | U | mail-schoon.test (incl. forwarded-cases), inbound/route.test (mailtekst in werk-veld) | groen |
| Verkort rapport (snel afsluiten) zonder volledige-oplever-termen + mail noemt alleen aanwezige foto's/video (telt ook melding-media) + rapport-label "Opdrachtgever"; melding-video zichtbaar in overzicht; geen klant-levering in snel afsluiten | U, E | oplever-mail.test (heeftFotos/heeftVideo), rapport/route.test, melding-flow.spec (geen klant-optie); verkort-rapport-opmaak + melding-video visueel door Rein | U+E groen; visueel door Rein |
| Al opgeleverd rapport opnieuw openen (trigger = status opgeleverd): eigen klus = waarschuwing-dialoog, opdrachtgever-klus = read-only weergave + afsluit-hub "Rapport bekijken"; heropende klus weer bewerkbaar; de opleveraar kan "Toch aanpassen" (alleen wie zelf opleverde) | U, E | oplever-toegang.test (opgeleverd-trigger), oplever-readonly.spec (read-only, Toch aanpassen, geen 404, eigen waarschuwing) | groen |
| Vervolg ("klus is niet af") = opgeleverd + label "Vervolg nodig" (niet meer terug-naar-pool); heropenen zet de oplevering schoon, rapporten blijven in de geschiedenis | U, E | afgerond.spec (vervolg = opgeleverd, blijft toegewezen); heropen-reset visueel door Rein | groen |
| Dashboard verwerk-status: opgeleverd = "Te verwerken" tot akkoord = "Verwerkt" (+ teller + "Vervolg nodig"-label); markeer-verwerkt-knop voor alle opgeleverde klussen | U, E | afrond-status.test (verwerkStatus); dashboard-badges + teller visueel door Rein | groen |
| Detailpagina per ronde: meldingen inklapbaar + alleen huidige ronde; "Vorige ronde" alleen-lezen (vorige meldingen + vorig rapport); "Eerder op deze referentie" geschrapt; "Opnieuw versturen" alleen bij in deze ronde opgeleverde klus | E | melding-flow.spec (inklap + huidige ronde), afgerond-zaak.spec (verwerken/heropenen); detail-opmaak visueel door Rein | groen |
| Duplicaat-waarschuwing bij inschieten: bestaat het referentienummer al, dan bevestiging vóór aanmaken (voorkomt dubbele orders) | E | zelf-invoer.spec (bestaande ref -> waarschuwing -> annuleren, niet aangemaakt); endpoint /api/opdrachten/ref-bestaat | groen |
| Eerste pagina van een PDF (kosten/snelheid bij inlezen), valt terug op origineel | U | pdf-eerste-pagina.test | groen |
| KlusInvoer handmatige invoer via nieuwe aanmaken-flow (monteur kluspool, kantoor dashboard) | E | zelf-invoer.spec, dashboard-nieuwe-klus.spec (POST /aanmaken, klus verschijnt) | groen (lokaal bevestigd) |
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
- **❌ NOG OPEN: kluspool-geheugensteun "rapport naar zaak nog versturen"** (privé voor de monteur) is nog
  niet gebouwd. Dit is een nieuwe UI-feature met ontwerpkeuzes, geen test; bewust niet 's nachts gebouwd.
  De twee verzendkaarten tonen de status al per kant op het oplever-scherm zelf. Aanbevolen volgende stap.
- Component-test-laag (jsdom/RTL) bestaat niet; UI-gedrag hoort daarom in de Playwright-e2e.

## Hoe draaien

- `npm test` — alle unit/route (laag U), snel, geen browser.
- `npm run test:e2e` — Playwright (laag E), tegen de test-DB via `.env.test`.
- `npm run test:mail` — e2e-mail (laag M), verstuurt echt naar de test-mailbox.
- `npm run test:all` — U + I + E in één keer.
