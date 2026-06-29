# Toestandsmatrix: de opdracht-levenscyclus (levend document)

Doel: de gaten zichtbaar maken die ontstaan in de OVERGANGEN tussen statussen en tussen ROLLEN, niet
in losse features. Per overgang vier kolommen invullen. Een lege of onvolledige cel is een gat. Tests
leiden we hieruit af: elke cel die gedrag beschrijft krijgt een test, cross-rol-overgangen een e2e die
beide kanten checkt. Zie de skill projectstart-discipline (toestandsmatrix). Laatst bijgewerkt: 2026-06-16
(volledige levenscyclus-keten + verzet/wissel nu e2e gedekt; cron-herinnering route-getest; zie
07_logboek/2026-06-16_keten-e2e-levenscyclus.md). Eerder 2026-06-10: mail/SMS-keten gat-vrij gemaakt
(mail voor document + herinnering, verzet-toon, bericht aan oude monteur bij wissel;
07_logboek/2026-06-10_mail-sms-keten-gaten-dicht.md).

## Statussen van een opdracht (`dashboard_status`)

`binnen` → `concept_gepland` → `gepland` → `bevestigd` → `opgeleverd`, met zijtakken `geannuleerd`
(en verwijderd via de prullenbak). Daarnaast: `gewijzigd_te_versturen` (markering, geen status),
`opdracht_status: opgeleverd`, en de monteur ziet zijn toegewezen klussen via `getKluspoolVoor`
(filtert op `toegewezen_aan`, NIET op status).

## Matrix

| Overgang | Data | Kantoor-UI | Monteur-UI | Bericht/notificatie |
|---|---|---|---|---|
| inschieten → binnen | melding + documenten, status binnen | dashboard "Binnen" | n.v.t. (niet toegewezen) | geen | 
| plannen (pool→bord) → concept_gepland | toewijzing + datum + status | planbord (oranje-gestreept), dashboard "concept" | verborgen tot verstuurd ✓ (kluspool-filter) | geen (bewust) |
| versturen → gepland | status gepland, verzonden_* + verzonden_at gezet | dashboard/planbord geel | kluspool "Te bevestigen" (geel) | mail + SMS (werk-kritiek) naar monteur ✓ |
| bevestigen → bevestigd | status bevestigd | dashboard/planbord blauw | badge "Bevestigd" | **kantoor krijgt geen actieve melding, alleen status-verandering** ⚠️ |
| wijzigen/verplaatsen na versturen (datum) | nieuwe planning + gewijzigd-marker | "gewijzigd, te versturen" | houdt afgesproken (verzonden) datum vast ✓ | geen tot opnieuw verstuurd (bewust) ✓ |
| resize: duur wijzigen (rechterrand slepen) | alleen `duur_dagen` aangepast (zelfde monteur/dag/tijd); over de weekgrens loopt de balk in de volgende week door | live-voorbeeld tijdens slepen, balk breder/smaller, dagteller telt door | concept gaat mee in de eerste verstuur-ronde; al verstuurd: monteur ziet de nieuwe duur pas na opnieuw versturen ✓ | al verstuurd → "gewijzigd, te versturen" (duur telt mee in `moetOpnieuwVersturenNa`), anders geen ✓ |
| wijzigen naar andere monteur na versturen | toewijzing naar B + gewijzigd-marker | kaart bij B op het bord | oude monteur houdt de klus tot opnieuw verstuurd, B ziet hem pas dan ✓ | geen tot opnieuw verstuurd (bewust) ✓ |
| opnieuw versturen, zelfde monteur (datum/tijd verzet) | status gepland, verzonden_* + verzonden_at bij, herinnering gereset | terug naar "gepland" | terug naar "Te bevestigen", herbevestigen | mail + SMS met **verzet-toon** ("is verzet naar …"), niet "nieuwe klus" ✓ (unit) |
| opnieuw versturen, andere monteur (wissel) | status gepland, verzonden_* bij | kaart definitief bij B | B ziet de klus nu; A niet meer | nieuwe monteur B: nieuwe klus ✓; **oude monteur A: annulering-melding** ("is geannuleerd", geen reden/overname) (mail + SMS, werk-kritiek) ✓ (unit) |
| ontplannen (bord→pool) → binnen | toewijzing + planning + verzonden_* gewist | dialoog (verstuurd), kaart naar pool | verdwijnt uit kluspool ✓ | mail + SMS (werk-kritiek) bij verstuurd/bevestigd ✓ |
| annuleren → geannuleerd | status geannuleerd, toewijzing blijft (dossier) | dashboard "geannuleerd" (inklapbaar) | uit de kluspool ✓ (kluspool-filter) | mail + SMS (werk-kritiek) bij verstuurd ✓ |
| terugmelden (monteur) → binnen | `teruggemeld_at/_reden/_toelichting` gezet (transiënt), status → binnen, planning leeg, `toegewezen_aan` blijft; poging-regel in `terugmeld_pogingen` (snapshot) ✓ | terug in de pool "nog te plannen" met "Teruggemeld"-markering + reden (pool + kaart + filter-tab) ✓; logboek + reden op detailpagina ✓ | klus uit actieve kluspool, in geschiedenis (teruggemeld_at) ✓; blijft in geschiedenis via poging-regel ook na herplannen ✓ | best-effort mail naar kantoor mét reden ✓ |
| opnieuw uitsturen na terugmelden (markeerVerzonden) | transiënte `teruggemeld_*` GEWIST, status → gepland, verzonden_* bij; poging-historie blijft ✓ | klus weer normaal op het bord (geen teruggemeld-markering meer) ✓ | klus actief in kluspool van de (zelfde of andere) ontvangende monteur ✓ | mail + SMS naar ontvangende monteur (verzet of nieuwe klus, bestaand) ✓ |
| heropenen van een opgeleverde klus (kantoor; klant belt, toch nog iets) | opdracht_status → "open", opgeleverd_at/rapport_url (op melding) gewist, dashboard_status → "binnen", planning leeg, `heropend_at` gezet, optionele instructie → werkomschrijving; oplevering-record + verzendgeschiedenis blijven historie ✓ | knop "Heropenen" + instructie-venster op de detailpagina; klus terug in de pool met "Heropend"-badge (accent) + instructie ✓ | klus terug in actieve kluspool met "Heropend"-badge; eerdere oplevering blijft op de detailpagina ✓ | geen (kantoor-actie; plant daarna opnieuw in → bestaande verstuur-mail/SMS) |
| vervolg-bezoek zelfde referentie | losse opdracht-rij per bezoek, gekoppeld via referentienummer (geen parent-id) | "Eerder op deze referentie"-blok op de detailpagina ✓ | "Eerder op deze referentie"-blok op de monteur-detailpagina + "meerdere bezoeken"-hint op de kluspool-kaart ✓ (RLS: monteur ziet eigen bezoeken) | n.v.t. |
| opleveren na terugmelden (registreerZaakRapport) | `opdracht_status=opgeleverd`, transiënte `teruggemeld_*` GEWIST, status uit "binnen" → "opgeleverd" (uit de pool) ✓ | klus uit de te-plannen-pool, in "Opgeleverd" (geen dubbel-inplan) ✓; poging-historie blijft zichtbaar | klus opgeleverd, in geschiedenis ✓ | mail naar zaak (bestaand) ✓ |
| document toevoegen na versturen | document erbij, geen status/herbevestiging | "nieuw document" zichtbaar | "nieuw"-badge in de app | **mail + SMS (overig)** bij verstuurd ✓ (mail was een lege stub, nu echt) |
| bevestiging blijft uit (na HERINNERING_NA_UUR) | herinnering_verzonden_at gezet (idempotent) | "niet bevestigd"-teller in Te-doen | herinnering binnen | **mail + SMS (overig)** via cron ✓ (mail was een lege stub, nu echt) |
| oplevering vastleggen (tussenopslag) | oplevering-record (foto/handtekening/opmerking/interne notitie); foto's per stuk gecommit, verwijderde/vervangen foto/video uit storage opgeruimd (mits nog niet verstuurd) | **niets zichtbaar** (privacy-fix) ⚠️E | flow met ingevulde velden; foto's per stuk geüpload met teller + per-item opnieuw, upload-verlies-bestendig bij navigeren/fout, foto en video serieel (zie DESIGN-OPLEVER-UPLOAD-ROBUUST.md) | geen |
| versturen naar klant (schone versie) | klant-PDF, klant_rapport_verzonden_at/_email/_url | niets | "klant: verzonden ✓" | mail naar klant, zonder interne notitie (U) |
| versturen naar zaak → opgeleverd | zaak-PDF, zaak_rapport_verzonden_at, rapport_url, opdracht_status én **dashboard_status → opgeleverd** (was eerder alleen opdracht_status; lijst/badge/planbord bleven "Bevestigd" — gat gedicht 2026-06-18) | oplever-blok + groen op de detailpagina, in het vak "Opgeleverd" op de lijst, en blijft als **groene "opgeleverd"-kaart op zijn dag op het planbord** staan (niet meer sleepbaar; telt niet als dubbele boeking); valt vanzelf weg na ARCHIEF_DAGEN (nu 30) ✓ | "zaak: verzonden ✓", naar history | mail naar zaak, mét interne notitie; meldt of klant het ook kreeg (U) |
| versturen naar zaak: eerste mail ooit naar dat domein | rapport_verzendingen-rij; domein nog niet eerder gemaild (alleen deze klus) | inklapbaar verzendblok met **waarschuwing** (kans op spam) + Kopieer bericht + Opnieuw versturen (adres-correctie) ✓ | zelfde verzendblok op de monteur-klus ✓ | Reply-To = monteur (vangnet antwoord@); WhatsApp-copy voor de zaak (U) |
| opnieuw versturen met gecorrigeerd adres | extra rapport_verzendingen-rij naar nieuw adres; blok toont nieuw adres | blok bijgewerkt; waarschuwing als domein nog nieuw is | idem | mail naar het gecorrigeerde adres (U: route naar-override) |
| afgerond, zaak nog niet verstuurd | oplevering vastgelegd, zaak_rapport_verzonden_at null | **niets** (geen tijdstip) | kluspool-geheugensteun ❌ (nog te bouwen) | geen |
| verwijderen (prullenbak) | verwijderd_at gezet | uit lijst, in prullenbak | verdwijnt uit kluspool ✓ | geen |

Legenda: ✓ klopt en/of getest · ⚠️ aandachtspunt/ontwerpvraag · ❌ gat

### Werk-omschrijving (sub-attribuut, geen statusovergang)
De werk-omschrijving ("wat moet er gebeuren", typen/spraak) is een vrij-tekstveld op de opdracht, geen
status. Levenscyclus: aanmaken (zelf-invoer) → tonen (detailpagina) → wijzigen (inline op detail, eigen
klus + kantoor) → leeg. Puur intern, komt bewust NIET in het opleverrapport (zie
BRAINSTORM-INVOER-UNIFICATIE.md voor de afweging). Volledige toestandsmatrix daarvan staat in dat
brainstorm-document. Gedekt: db.test, opdrachten/route.test, werkomschrijving/route.test, zelf-invoer.spec.

### Monteur-onboarding (eigen levenscyclus, geen opdracht-status)
Een nieuwe monteur moet bij eerste gebruik zijn afzendergegevens invullen (naam, bedrijfsnaam, telefoon,
contact-mail) voordat hij verder kan. Overgangen: account aangemaakt (kantoor zet naam) → eerste login,
profiel onvolledig → gate stuurt naar `/welkom` → invullen → welkom-stap met handleiding-knop → werkpool.
Niet in demo-modus (scripted uitstalraam). De gate zit in `vereisRol` (alleen rol monteur, behalve
skipOnboarding op de /welkom-pagina zelf). Gedekt: profiel.test (profielVolledig), toegang.test (gate),
e2e-monteur staat compleet in global-setup; de visuele flow keurt Rein op omgeving-test.

Uitnodiging (kantoor → nieuwe gebruiker), bijgewerkt 2026-06-29. Bij toevoegen stuurt de route twee
kanalen, beide best-effort en los van elkaar (een fout op het een laat het ander en de account-aanmaak
staan): (1) **mail** met afzender "&lt;zaak&gt; via Kluslus", zaaknaam vooraan in onderwerp en opening;
(2) **SMS-vangnet** alleen als er een geldig 06 is meegegeven (genormaliseerd naar +31, ook opgeslagen op
het profiel). De SMS draagt geen inloglink (gevoelig), alleen de duw naar `/login` waar de monteur zelf
een magic link aanvraagt; die magic link blijft via Supabase lopen en komt betrouwbaar in de inbox.
Toestanden van de respons: mailVerstuurd, smsGevraagd (was er een geldig 06), smsVerstuurd. Tegenhanger
afmelding deelt de afzender "&lt;zaak&gt; via Kluslus". Gelijkgetrokken 2026-06-29: ALLE app-mails namens
de zaak (uitnodiging, afmelding, annulering, ontplanning, document, herinnering, terugmelding, afgerond,
spoed, monteur-bundel) gebruiken nu dezelfde afzender via `appAfzender`. Het opleverrapport houdt bewust
de identiteit van de monteur die opleverde (eigen From-naam + reply-to), dat is geen gat maar opzet.

### Handleiding (UI-toestanden, geen opdracht-status)
De handleiding-pagina (`/handleiding`) toont onderwerpen in vier groepen. UI-toestanden:
alles ingeklapt (begintoestand, snel scannen) → "Alles openklappen" → alles open → "Alles
inklappen" terug; daarnaast één onderwerp los open/dicht. Per onderwerp twee plaatje-toestanden:
screenshot aanwezig (telefoon-frame, bijgesneden) of ontbrekend/`nieuw` (placeholder "Schermafbeelding
volgt" + nieuw-label). Geen verborgen browser-geheugen: het gedrag is altijd hetzelfde. Gedekt:
handleiding-stappen.test (databron-structuur), handleiding.spec (toggle + los openklappen); de
visuele check op telefoonformaat keurt Rein.

## Gaten (status)

1. **✅ OPGELOST. Wijziging na versturen (datum), monteur-kant.** De monteur houdt de afgesproken
   (verzonden) datum vast tot kantoor opnieuw verstuurt (`uitvoerdatumVoorMonteur`). Geen stille
   datum-wissel meer. Gedekt: opdracht-status.test + kluspool-zichtbaarheid.spec (gat 1).
2. **✅ OPGELOST. Geannuleerde klus blijft bij de monteur.** Kluspool-filter verbergt geannuleerd
   (toewijzing blijft voor het dossier). Gedekt: kluspool.test + kluspool-zichtbaarheid.spec (gat 2).
3. **✅ OPGELOST. Concept lekt naar de monteur.** Kluspool-filter verbergt concept_gepland tot
   verstuurd; eigen klussen (binnen) blijven. Gedekt: kluspool.test + kluspool-zichtbaarheid.spec (gat 3).
4. **⚠️ Kantoor weet niet dat de monteur bevestigd heeft (laag).** Geen actieve melding, alleen een
   status-verandering die kantoor ziet bij het openen van het dashboard. Waarschijnlijk acceptabel.
5. **✅ OPGELOST. Monteur-WISSEL na versturen.** Schuift Ed een verstuurde klus naar een andere
   monteur, dan houdt de oorspronkelijke (verzonden) monteur hem in zijn kluspool tot opnieuw
   verstuurd; de nieuwe monteur ziet hem pas na versturen. Kluspool-query filtert op de effectieve
   monteur, plus uitgebreide RLS (schema-compleet-7). Gedekt: kluspool-zichtbaarheid.spec (gat 5).
6. **✅ OPGELOST (2026-06-16). De opnieuw-versturen-keten (S11) én de volledige happy-path zijn nu e2e
   gedekt.** `levenscyclus.spec` draait de hele keten in één doorloop over beide rollen (inschieten →
   plannen → versturen → bevestigen → opleveren → dashboard-opleverblok), met een status-controle bij
   elke overgang. `verzet-wissel.spec` dekt de monteur-UI na verzet (nieuwe datum → herbevestigen) en
   na wissel (klus verdwijnt uit de kluspool van de eerste monteur). De cron-herinnering-wiring is nu
   route-getest (cron/bevestig-herinneringen/route.test). De mail/SMS-acties in de keten lopen in de
   gewone e2e via de db-laag (geen echte verzending in CI); de toon/inhoud blijft unit-gedekt en de
   echte verzending zit in de M-laag (E2E_MAIL).
7. **✅ OPGELOST (2026-06-10). Mail/SMS-keten had gaten.** (a) Nieuw-document en bevestig-herinnering
   stuurden wel SMS maar de mail was een lege stub; nu echte mail via de dispatcher. (b) Opnieuw versturen
   na een datum-wijziging meldde "nieuwe klus" i.p.v. een verzetting; nu een verzet-toon in mail + SMS.
   (c) Bij een monteur-wissel kreeg de oude monteur niets; nu de annulering-melding "is geannuleerd"
   (mail + SMS, zonder reden/overname, want dat gaat hem niet aan en kan interne wrijving geven).
   Beide verstuur-paden (bulk-knop én envelopje) lopen via één gedeelde melder (`meldVerstuurd`), zodat ze
   niet meer kunnen uiteenlopen. Gedekt met unit-tests; de volledige keten is sinds 2026-06-16 ook
   e2e gedekt (levenscyclus.spec, verzet-wissel.spec).

## Oplever-herinrichting + snel afsluiten (2026-06-24)

Nieuwe/aangepaste overgangen rond opleveren, afsluiten en klant-levering:

- **Klant-levering (per opdrachtgever, default AAN).** Eigen klus → altijd aan de klant mogelijk;
  opdrachtgever-klus → volgt `opdrachtgevers.klant_levering_toegestaan` (beheerder zet aan/uit op
  `/gebruikers`). Bepaalt of de klant-kant verschijnt (keuzekaart "ook aan de klant" + het "voor de
  opdrachtgever"-blok + de klant-verzendkaart). Helper `magKlantLeveren`. ✓ klant-levering.test,
  opdrachtgever-instelling.spec.
- **Opleveren (volledig), status onveranderd.** Klant-verzending laat de status met rust; zaak-verzending
  zet op opgeleverd. Nieuw: het "voor de opdrachtgever"-blok (interne foto/video/tekst) gaat alléén in de
  zaak-versie, nooit de klant-versie; "Later versturen" laat de klus oranje "nog te versturen" in de
  kluspool staan (géén status-wijziging). ✓ opleveren.spec, verzending.spec, rapport.test.
- **Snel afsluiten = verkorte oplevering.** Zónder vervolg: verkorte PDF (geen handtekening/controle) naar
  de opdrachtgever → opgeleverd, net als opleveren. MÉT vervolg: verkorte PDF naar de opdrachtgever, maar
  status blijft OPEN (niet opgeleverd), klus terug naar kantoor (`ontplanOpdracht`) + `afgerond_vervolg_nodig`
  → badge "Vervolg plannen". Ad-hoc klus (geen kantoor): blijft bij de monteur mét de markering.
  ✓ afgerond.spec (UI-smoke + db-keten via registreerVerkortRapportVervolg).
- **Snel afsluiten: GEEN klant-levering** (2026-06-27). Klant-levering gaf hier een verwarrende
  interne-notitie-waarschuwing; nu alleen via "uitgebreid opleveren" (escape-kaart bovenaan, met uitleg
  wat daar kan: handtekening, akkoord, klant-levering, interne notitie). ✓ melding-flow.spec.
- **Verkort rapport zonder volledige-oplever-termen** (2026-06-27). Geen "eindstaat-foto's",
  "video van de oplevering", handtekening of controle in de verkorte variant; de meldingen dragen het
  bewijs (foto's + videolink per melding). Wél een eigen opsomming bovenaan met alleen wat in verkort kan
  bestaan: Meldingen, Foto's (bij meldingen), Video (bij melding). Melding-video nu ook zichtbaar in het
  meldingen-overzicht op beide detailpagina's. Visueel door Rein.
- **Snel afsluiten "Later versturen" -> kluspool** (2026-06-27). Ging naar de detailpagina; nu naar de
  monteur-home (kluspool), waar het rapport als "nog te versturen" klaarstaat. ✓ afgerond/melding-flow.spec.
- **Video-knop in het rapport** (2026-06-27). De videolink is een omlijnde knop (play-vak + label +
  "openen ›") i.p.v. onderstreepte tekst. Alle drie de videolinks (melding/oplevering/intern), verkort én
  volledig. Visueel door Rein.
- **Al verstuurd rapport opnieuw openen** (2026-06-27). "Verstuurd" = minstens één rapport-verzending
  (oplever-toegang). Eigen klus: bewerken mag, met een app-dialoog "Bestaand rapport aanpassen?"
  (Annuleren = terug naar de klus) bij het openen van de oplever-flow. Opdrachtgever-klus: read-only,
  een alleen-lezen weergave (opsomming + meldingen + "Rapport-PDF openen", geen invoer/verstuurknoppen);
  de afsluit-hub toont dan "Rapport bekijken" i.p.v. snel/volledig. ✓ oplever-toegang.test,
  oplever-readonly.spec.
- **Vervolg-herontwerp + dashboard "Te verwerken/Verwerkt"** (2026-06-27). "Klus is niet af" levert nu
  gewoon OP (groen) met label **"Vervolg nodig"** i.p.v. terug-naar-pool; de zaak beslist zelf: verwerken
  (akkoord) of **heropenen** voor het vervolg. Read-only/waarschuwing triggeren nu op status **opgeleverd**
  (niet meer op "een keer verstuurd"), zodat een heropende klus weer bewerkbaar is. **Heropenen** zet de
  oplevering schoon (nieuwe ronde); de eerdere rapporten blijven in de verzendgeschiedenis als read-only
  historie. **Dashboard:** een opgeleverde klus is **"Te verwerken"** (blauw) tot de zaak hem afhandelt
  (akkoord) = **"Verwerkt"** (groen); + teller "X te verwerken" en een "Vervolg nodig"-label. (Vervangt de
  eerdere vervolg-404-navigatie en de verzending-gebaseerde read-only.) ✓ afrond-status.test
  (verwerkStatus), oplever-toegang.test (opgeleverd-trigger), afgerond.spec (vervolg = opgeleverd),
  oplever-readonly.spec. De **opleveraar** (oplevering.user_id) kan een read-only opdrachtgever-klus toch
  bijwerken via **"Toch aanpassen"** (?aanpassen=1 -> bewerkbare flow met waarschuwing); een andere monteur
  ziet die knop niet. ✓ oplever-readonly.spec ("Toch aanpassen").
- **Detailpagina per ronde + opgeschoond** (2026-06-27). Meldingen zijn inklapbaar (dicht als standaard,
  MeldingRegel) en de lijst toont alleen de HUIDIGE ronde (gemaakt na het laatste `heropend_at`). Een
  "Vorige ronde"-blok toont de eerdere meldingen + vorig rapport **alleen-lezen** (geen bewerken/opnieuw
  versturen). "Eerder op deze referentie" is geschrapt (verwarrend, ving vooral dubbel-ingeschoten orders;
  terugkomers lopen via heropenen). "Oplevering verstuurd / Opnieuw versturen" verschijnt alleen bij een in
  DEZE ronde opgeleverde klus. ✓ melding-flow.spec, afgerond-zaak.spec; detail-opmaak visueel door Rein.
- **Duplicaat-waarschuwing bij inschieten** (2026-06-27). Bestaat het referentienummer al (niet-verwijderde
  klus), dan waarschuwt het inschiet-formulier (KlusInvoer) vóór aanmaken: "ref X bestaat al (klant ·
  status), toch aanmaken?" Voorkomt dubbele orders aan de bron. Check via `/api/opdrachten/ref-bestaat`
  (service-rechten, vindt ook dubbelen van een ander). ✓ zelf-invoer.spec.
- **Mail-tekst + inbound (2026-06-27).** De begeleidende mail noemt alleen aanwezige foto's/video (telt
  ook melding-media); rapport-label "Opdrachtgever" i.p.v. "Keukenzaak". Inbound: een doorgestuurde mail
  zonder eigen notitie levert nu de body eronder als werkomschrijving (was: alleen de "Forwarded
  message"-regel). ✓ oplever-mail.test, mail-schoon.test, rapport/route.test.
- **kluspool-hernoeming.** Puur naamgeving (werkpool → kluspool), geen statusgedrag gewijzigd; legacy
  `?werkpool=1` blijft werken (backward-compat).

## Melding-flow herinrichting (2026-06-26)

De melding is een eigen entiteit op een klus (beschadiging/manco), met een eigen levenscyclus naast de
opdracht. Matrix per overgang (kolommen: Data | Monteur-UI | Bericht; kantoor ziet meldingen via het rapport):

| Overgang | Data | Monteur-UI | Bericht/notificatie |
|---|---|---|---|
| melding aanmaken (gewoon) | rij met `spoed=false`, `ruwe_tekst`, `foto_urls`, **`video_url`** (nieuw), status concept→verzonden | detail-lijst: tekst + foto/video, **geen label** (alleen spoed labelt) ✓ | geen (gaat mee in het rapport) |
| melding aanmaken (spoed) | `spoed=true`; bij versturen `spoed_verzonden_at` | rode "Spoed"-badge + driehoek ✓ | spoed-mail meteen naar kantoor (bestaand) ✓ |
| video toevoegen aan een melding | `video_url` gezet (VideoMaken, online-only); offline-queue draagt bewust GEEN video | formulier toont VideoMaken (Opnemen/Galerij); opgeslagen video komt terug als "Video vastgelegd" ✓ | komt als videolink in de rapport-PDF (melding-sectie) ✓ |
| melding bewerken | `versie+1`, `aangepast=true`, velden incl. `video_url` bijgewerkt | "aangepast (vN)" naast de (eventuele) badge ✓ | n.v.t. |
| melding verwijderen | soft/echte verwijdering (bestaand) | uit de lijst | n.v.t. |
| melding offline aanmaken | IndexedDB-queue (foto's lokaal), **zonder video** (online-only) | "wacht op netwerk" (bestaand) | sync zodra online (bestaand) |
| melding-invoer weg-navigeren vóór opslaan (ook telefoon-terugknop) | concept-vangnet in localStorage (tekst/spoed/foto's/video); gewist bij opslaan of bewust weggooien | invoer wordt hersteld bij terugkeer naar het formulier; opslaan-knop blijft leidend ✓ | n.v.t. | melding-concept.test, melding-flow.spec |

### Detailpagina (`/opdracht/[id]`) — leesvolgorde van de klus
Documenten → "Meldingen tijdens de klus" (knop "Beschadiging of manco melden" → aparte pagina) →
"Aan het einde van de klus" (ActieKaart "Klus afsluiten" → `/afronden`). Vaste onderbalk: alléén
"Terug naar kluspool" (afsluiten is uit de balk naar het pagina-blok verhuisd). Gedekt: melding-flow.spec.

### Documenten-blok (weergave, geen statusovergang)
Gedeeld component voor monteur (`/opdracht/[id]`) én kantoor (`/dashboard/opdracht/[id]`, in
`DocumentBeheer`). De soort wordt uit de bestandsnaam afgeleid (`documentSoort`, geen DB-kolom);
documenten worden gegroepeerd (orderbon / tekeningen / overig), bron bovenaan, met soort-label en
een lui geladen mini-voorbeeld (eerste pagina via pdfjs, terugval op het soort-icoon). Openen gebeurt
IN de app via de `PdfViewer`-overlay (paginanav, zoom, onthoudt de laatste pagina), niet meer in een
nieuw tabblad. Alleen de monteur ziet "Laad alles offline" (warmt de service-worker-cache). Kantoor
houdt zijn verwijder-actie per document. De rest van de detailpagina is ongemoeid. Gedekt:
document-weergave.test, pdf-documenten.spec.

### Snel afsluiten (`/afronden/snel`) — ontdubbeld
| Situatie | Data | Monteur-UI | Bericht |
|---|---|---|---|
| openen | meldingen van de klus opgehaald (server) | bovenaan ontsnap-kaart "Liever uitgebreid opleveren? (met klant-handtekening en akkoord)" → `/opleveren`; daaronder compact "Dit gaat mee in het rapport"-overzicht (thumbnails + tekst + telling, spoed-only label) + "Begeleidend bericht" (= `opmerking`, typen/spraak); GEEN foto/video-invoer (die staat in de volledige oplevering) ✓ | n.v.t. |
| versturen met ≥1 melding | verkorte PDF (meldingen incl. videolink + begeleidend bericht), bestaand versturen-blok (klant/opdrachtgever/later) ongewijzigd | bestaand versturen-gedrag | mail naar gekozen ontvanger (bestaand) |
| versturen met 0 meldingen | idem, maar eerst bevestiging | confirm "Versturen zonder melding?"; annuleren stopt, bevestigen verstuurt ✓ | idem na bevestiging |
| "geen foto/video"-waarschuwing | n.v.t. in verkort | NIET getoond in verkort (media-invoer is daar bewust weg; de meldingen dragen het bewijs) ✓ | n.v.t. |

De **volledige oplevering** (`/opleveren`) is ongewijzigd: foto/video/handtekening + akkoord blijven daar.
Gedekt: melding-flow.spec (layout, lege staat, 0-meldingen-confirm), rapport.test (verkorte PDF).
