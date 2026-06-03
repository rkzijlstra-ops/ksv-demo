# Design: Compleet systeem (versie 1)

Datum: 2026-06-01
Status: raamwerk vastgelegd, klaar voor plan-fase
Context: strategische keuze Route A (eerst het complete systeem afbouwen), zie `07_logboek\2026-06-01_debat-bouwen-of-praten.md`

## Doel

Het systeem dichttimmeren tot een gesloten, onafhankelijk geheel: opdrachtgever schiet opdrachten in, het systeem plant, stuurt naar de monteur met context, de monteur levert op met bewijs, en alles koppelt automatisch terug. Aanbieden als maandabonnement. Eerste klant: Keukenstudio Voorschoten (Ed). Gebouwd met andere winkels in het achterhoofd, maar de SaaS-laag komt pas in fase 2.

De monteur-PWA staat grotendeels al (werkpool, opdracht-detail, melding met foto/spraak, bewerken met versienummering, PDF-upload, offline, oplevering met bewijs en handtekening in de maak). Dit document beschrijft het complete systeem eromheen.

## Architectuurregels (hard)

1. **Gesloten kern, plug-in-naad voor in- en uitvoer.** De kern (opdrachten, agenda, monteur-app) staat los van hoe data binnenkomt of naar buiten gaat. Versie 1 doet handmatige PDF-upload of slepen. Koppelingen (Gmail, Outlook, externe agenda) komen later als losse plug-in, zonder herbouw van de kern.
2. **Eigen agenda als weergave op de opdracht-data, niet andersom.** De afspraken zijn de opdrachten. De agenda is een kijkvenster op de eigen database, met de eigen domeinregels. Geen Google Calendar als basis (zou de bron van waarheid splitsen en de vrijheid beperken). Geen volwaardige externe agenda nabouwen.
3. **Schone datastructuur.** Elke opdracht/afspraak als nette rij met vast ID en expliciete velden (start, duur of eindtijd, type, monteur, klant, referentie, status). Dit maakt koppeling naar externe agenda's later mogelijk zonder herbouw.
4. **Opslag bij Reinier (Supabase, EU-hosting), automatische plus eigen backup.** Juridisch blijft de data van de klant (verwerker/verantwoordelijke, AVG, verwerkersovereenkomst). Clausule dat de klant zijn data altijd kan exporteren, zodat er nooit sprake is van gijzeling bij een conflict.
5. **Kanaal als instelling.** Mail, SMS en WhatsApp omschakelbaar per situatie, zonder herbouw. Versie 1 gebruikt mail.
6. **Toekomstvast voor meerdere zaken (multi-opdrachtgever).** Gedeelde motor, dun "gezicht" per zaak. De SaaS-laag zelf (branding, rollen, onboarding, abonnement-facturatie) bouwen we niet nu, maar de structuur mag het later naadloos toelaten.

## Opdrachttypes en invoermodel

Het systeem kent twee types (montage en service), automatisch gedetecteerd zoals de bestaande flow al doet. Belangrijk: het type bepaalt de **standaardinstelling**, niet langer hard het gedrag. Invoer en beleid zijn gescheiden, zodat het toekomstvast is voor andere zaken (architectuurregel 6).

### Eén invoermodel voor alles
Bij het inplannen vult de planner altijd dezelfde drie velden:
- **Startdatum**
- **Aantal dagen** (1, 2, 3...). Bepaalt of het een meerdaags blok wordt.
- **Tijd (optioneel)**. Leeg gelaten wordt het een dagblok; ingevuld wordt het een kaartje op dat uur.

Zo zet je een montage van 2 dagen op (aantal dagen = 2, tijd leeg) en een serviceklus op tijd (aantal dagen = 1, tijd = 10:00) met exact hetzelfde scherm. Geen aparte functie per type. In de datastructuur (architectuurregel 3): `startdatum`, `starttijd` (mag leeg), `duur_dagen`. De aanwezigheid van een starttijd bepaalt dagblok versus tijdkaartje.

### Standaarden per type
- **Service**: opent standaard met de vraag om een tijdsindicatie (aantal dagen 1). De tijd is een indicatie, want een serviceklus kan mee- of tegenvallen.
- **Montage**: opent standaard zonder tijd, alleen aantal dagen. Startdatum is hard. In de opdracht naar de monteur staat "geschatte duur: X dagen" als informatie over omvang, geen opgelegde werktijd. De monteur belt zelf de klant voor de starttijd.

De planner mag de standaard overschrijven (een korte montage met tijd, een service over twee dagen). De simpele regel in versie 1: geen tijd ingevuld = dagblok, wel een tijd = kaartje op dat uur.

### Uitgesteld naar later: kloktijd-beleid per zaak
In versie 1 zit er geen aparte bewaking op of een kloktijd naar buiten gaat. Dat hoeft ook niet: bij montage vul je gewoon geen tijd in, dus er gaat ook niets de deur uit. Een expliciete instelling per zaak ("montagetijd nooit naar monteur of klant", als bescherming tegen schijnzelfstandigheid) kan later worden toegevoegd zonder herbouw, omdat invoer en beleid al gescheiden zijn. Voor nu houden we het strak en simpel.

## Functielijst versie 1

### Dashboard opdrachtgever
- Live overzicht van alle opdrachten en meldingen
- Opdracht inschieten door PDF in het dashboard te slepen (parser haalt klant, referentienummer, type en melding eruit)
- Meerdere PDF's tegelijk selecteren of slepen. Groepering op referentienummer: zelfde ref wordt één opdracht met meerdere documenten, verschillende refs worden aparte opdrachten. Bij twijfel of ontbrekende ref een korte review-stap waarin de opdrachtgever de groepering bevestigt vóór de opdrachten worden aangemaakt
- Status per opdracht (binnen, concept gepland, gepland, bevestigd, opgeleverd, geannuleerd), plus de markering "gewijzigd, nog te versturen"
- Naslagwerk: alles per opdracht en per klant terugvinden. Zoeken draait om het **referentienummer**: Ed tikt het ref in en springt direct naar de opdracht en het klantdossier. Filteren op status, monteur, datum of klant blijft daarnaast mogelijk
- **Lijst-scoping en archief.** Actief werk (binnen, concept, gepland, bevestigd) is altijd zichtbaar. Opgeleverd en geannuleerd tonen standaard de **laatste 14 dagen**; ouder gaat naar het archief, niet weg maar uit het zicht, en blijft vindbaar via het referentienummer en het klantdossier. Onder de motorkap lazy-load of paginering, zodat de lijst snel blijft ook met duizenden opdrachten (architectuurregel 3)
- **Eén "Te doen"-overzicht bovenaan.** Bundelt alles wat op de opdrachtgever wacht in klikbare tellers: te plannen (binnen), te versturen (concept plus gewijzigd), niet bevestigd (te lang open), en aandacht (bijvoorbeeld geen referentienummer). Eén plek die zegt wat er moet gebeuren; een klik springt naar de betreffende opdrachten. Vervangt het losse attentiesignaal.

### Planning (eigen agenda)
- Opdracht toewijzen aan een monteur en inplannen
- Inplannen met één invoercontrole (startdatum, aantal dagen, tijd optioneel; zie *Opdrachttypes en invoermodel*): tijd leeg = dagblok zoals montage, tijd ingevuld = kaartje op dat uur zoals service
- Inslepen en verslepen naar een andere dag of tijd, naast gewone invoer
- **Verstuur-poort (hard).** Plannen en versturen zijn losgekoppeld. De planner schuift vrij op het planbord: opdrachten krijgen een monteur, dag en tijd maar staan op "concept gepland" en gaan nog niet naar buiten. Pas bij een expliciete actie "Verstuur naar monteurs" gaat de melding eruit en springt de status naar gepland (oranje, te bevestigen). Geen automatisch versturen bij opslaan; versie 1 heeft alleen de knop.
- **Bundelen per monteur.** Eén verstuur-actie groepeert per monteur: elke monteur krijgt één mail met al zijn nieuwe of gewijzigde opdrachten van die ronde, niet één mail per opdracht.
- **Verstuur-knop met teller.** De knop toont hoeveel items te versturen zijn: nieuwe concepten plus gewijzigde opdrachten die opnieuw moeten. Zo zie je in één oogopslag of er nog iets klaarstaat.
- Wijziging of annulering van een al verstuurde opdracht krijgt de markering "gewijzigd, nog te versturen" (gestreept, net als concept) en telt mee in de verstuur-knop, zodat het niet blijft hangen. Bij de volgende verstuur-actie gaat het gebundeld mee.

### Communicatie en bevestiging
- Melding naar de monteur bij een nieuwe of gewijzigde opdracht, afgevuurd door de verstuur-poort (niet automatisch bij elke wijziging op het planbord). Versie 1: mail, plus markering in de app; later WhatsApp of SMS
- Monteur bevestigt ontvangst met één knop in de app
- Automatische herinnering als de bevestiging uitblijft
- Automatische reminder naar de klant: concept staat klaar, met één druk verstuurd, later omschakelbaar naar volautomatisch. Geen bevestig-link (Ed plant telefonisch, de mail is een herinnering van de gemaakte afspraak). Service met tijdsindicatie, montage met startdatum.

### Terugkoppeling
- Zodra de monteur op "opgeleverd" drukt, springt de status in het dashboard op opgeleverd met het rapport eronder. Ed ziet het meteen, zonder te bellen.
- Een opgeleverd item openen toont het **volledige opleverrapport als leesweergave**, in dezelfde opbouw als de PDF: (a) **Oplevering/rapportage** met eindstaat-foto's, handtekening, eventuele video en een vrije opmerking van de monteur; (b) **Meldingen** die tijdens de klus zijn gemaakt, elk met tekst en eigen foto's (spoedmeldingen gemarkeerd). Plus welke monteur, de datum, en of het rapport naar de klant is verstuurd. De tekst hoort bij een melding, niet bij een losse foto. Bewerken gebeurt in de monteur-app, niet op het dashboard.

### Context en dekking
- Automatisch eerdere rapporten en info meesturen op referentienummer
- **Context reist met het referentienummer, niet met de monteur.** Wie de klus doet maakt niet uit: zet Ed een service op ref 7398, dan krijgt de toegewezen monteur (bijvoorbeeld Piet) automatisch de keukenhistorie mee, ook als een collega (Henk) de montage deed. De monteur ziet bovenaan zijn taak (probleem, klant, adres, ref) en daaronder de historie van die keuken: de montage met monteur, datum, tekening en opmerking, plus alle eerdere service, nieuwste eerst, elk als compacte samenvatting met doorklik naar het volledige rapport. Bij een tweede of derde service groeit die keten gewoon door, zodat de monteur ziet wat al gedaan is en door wie
- **Bouwwijze: uitbreiden, niet herbouwen.** De monteur-PWA heeft al een opdracht-detail (`opdracht/[id]/page.tsx`) met header, documenten, artikelen en meldingen, plus een inklapbare `HistorySection` die opdrachten als `OpdrachtCard` toont. De keukenhistorie wordt daaraan toegevoegd in dezelfde stijl: een inklapbare sectie "Deze keuken eerder (N)" op de opdracht-detail, gevoed door een query op referentienummer (de andere opdrachten op dezelfde ref, nieuwste eerst, huidige uitgezonderd), gerenderd met de bestaande `OpdrachtCard`. Geen nieuw scherm, geen nieuwe componenten als het bestaande patroon volstaat
- **Referentienummer = per keuken.** Elke keuken krijgt een eigen ref; de service die uit die keuken volgt behoudt diezelfde ref. Een klant met meerdere keukens heeft dus meerdere referentienummers, elk met een eigen dossier.
- Dossier per referentienummer (vorige monteur, tekeningen, eerdere meldingen en opmerkingen, foto's): de montage van die keuken plus alle latere service op dezelfde keuken. Elke eerdere klus staat als aanklikbare regel met datum en monteur en opent zijn **eigen dossier met eigen documenten en rapport**: documenten worden niet in één rapport gepropt maar per bezoek gescheiden gehouden
- Handtekening bij oplevering zit in de monteur-app (niet in het dashboard)
- **Documenten vrij toevoegen, vóór én na verzending.** Voor verzending (opdracht nog binnen of concept gepland) gewoon toevoegen en verwijderen. Een document dat ná verzending wordt toegevoegd, geeft de monteur een melding "nieuw document bij opdracht X" plus een "nieuw"-badge in de app, maar dwingt geen herbevestiging af (datum en monteur veranderen immers niet). Sluit aan op de bestaande versienummering in de PWA

### Monteur-app
- Werkpool en dagoverzicht automatisch chronologisch gesorteerd (eerst datum, dan tijd; montage als dagblok bovenaan de dag, service op kloktijd). Automatisch, geen handmatig verslepen in versie 1.

### Fundament
- Accounts en login per monteur en per zaak
- Multi-opdrachtgever-opzet (gedeelde motor, dun gezicht), structuur toekomstvast
- Opslag en backup volgens architectuurregel 4

## Statuskleuren

Consistent met de monteur-PWA. Tokens vastgelegd in `design-system.md` en `src/app/globals.css`. Altijd kleur plus icoon plus label, nooit kleur alleen.

- Grijs (`surface` + `ink-muted`): binnen, nog te plannen
- Concept gepland (toegewezen op het planbord, nog niet verstuurd): oranje strip met een gestreepte rand, zodat de planner ziet dat het nog binnen is en niet naar de monteur ging. Wordt volle oranje zodra verstuurd
- Gewijzigd, nog te versturen (een al verstuurde opdracht die de planner aanpaste): dezelfde gestreepte behandeling als concept, met label "gewijzigd". Telt net als concept mee als te versturen
- Oranje (`accent` #F97316): gepland, verstuurd, nog te bevestigen
- Blauw (`bevestigd` #1D4ED8, nieuw toegevoegd): bevestigd
- Groen (`success` #16A34A): opgeleverd met verstuurd rapport (sluit aan op bestaande betekenis van groen in de app)
- Grijs met doorhaling (`ink-muted` + `line`): geannuleerd

## Flow (happy path)

1. **Inschieten.** Ed sleept één of meer PDF's in het dashboard. De parser haalt klant, referentienummer, type en melding eruit. PDF's met hetzelfde ref worden één opdracht met meerdere documenten, verschillende refs worden aparte opdrachten; bij twijfel bevestigt Ed de groepering eerst. Opdracht(en) verschijnen met status binnen.
2. **Dossier-check.** Systeem zoekt op referentienummer of deze keuken al bekend is. Zo ja (bijvoorbeeld service op een eerder geplaatste keuken), worden de eerdere rapporten van die ref gekoppeld. Geen referentienummer: attentiepunt "laat controleren".
3. **Plannen (op het planbord).** Ed belt de klant voor een moment en zet de opdracht in de agenda met één invoercontrole: monteur, startdatum, aantal dagen, tijd (optioneel). Tijd leeg = dagblok (montage), tijd ingevuld = kaartje op dat uur (service). Hij mag meerdere opdrachten over verschillende monteurs en dagen schuiven en heen en weer corrigeren; alles staat op concept gepland en er gaat nog niets naar buiten.
4. **Versturen.** Als hij klaar is drukt hij op "Verstuur naar monteurs". Het systeem bundelt per monteur: elke monteur krijgt één melding (mail plus markering in de app) met al zijn opdrachten van die ronde, de geschatte duur en de meegestuurde context van eerdere klussen. De status springt naar gepland (oranje), de opdrachten staan in de werkpool van de monteur.
5. **Bevestiging.** De monteur bevestigt ontvangst met één knop. Status wordt bevestigd (blauw), de herinnering stopt, het attentiesignaal bij Ed verdwijnt. Bij montage belt de monteur zelf de klant voor de starttijd. Blijft bevestiging uit, dan automatische herinnering plus attentiesignaal bij Ed.
6. **Reminder naar klant.** Concept staat klaar, met één druk verstuurd (later automatisch). Service met tijdsindicatie, montage met startdatum.
7. **Oplevering.** De monteur voert de klus uit en levert op in de app met foto's, bewijs en handtekening.
8. **Terugkoppeling.** Zodra de monteur op opgeleverd drukt, springt de status in het dashboard op opgeleverd (groen) met het rapport eronder.
9. **Wijziging of annulering (zijtak).** Ed past de opdracht aan in het dashboard (datum, tijd, monteur, of annuleren). De opdracht krijgt de markering "gewijzigd, nog te versturen" (gestreept, zoals concept) en telt mee in de verstuur-knop en het "Te doen"-overzicht, zodat het niet blijft hangen. Bij de volgende verstuur-actie krijgt de monteur de gemarkeerde wijziging, gebundeld met zijn andere mutaties. De monteur herbevestigt, Ed ziet dat weer als blauw. Een document dat ná verzending wordt toegevoegd is een uitzondering: de monteur krijgt een melding plus "nieuw"-badge, maar geen verplichte herbevestiging (datum en monteur blijven gelijk).

## Buiten scope versie 1 (fase 2 of later)

Bewust uitgesteld om versie 1 strak te houden.

- Terugkoppeling: "monteur onderweg" naar de klant, tevredenheidsvraag na oplevering
- Monteur-gemak: handmatig herschikbare dagvolgorde, route/navigatie, tijdregistratie, onderdelen-checklist, knop "klus niet af" (de automatische chronologische sortering zit wél in versie 1, zie functielijst Monteur-app)
- Dashboard extra: werklast per monteur, beschikbaarheid monteurs (vrije dagen, vakantie)
- Rapportage: statistiek, audit-log, export voor facturatie
- Integraties: Gmail, Outlook, agenda-sync (eenrichting naar hun agenda eerst), klantenlijst importeren
- SaaS-laag: branding per zaak, rollen en rechten, meerdere planners, onboarding nieuwe zaak, facturatie van het abonnement

## Integratie-aanpak (fase 2, vastgelegd 2026-06-03)

Uitgewerkt in gesprek; nog niet gebouwd. Bewaard zodat het denkwerk er ligt zodra fase 2 begint.

### Levering
Web-based, net als de monteur-PWA. Niks te installeren bij de klant, geen bezoek op locatie nodig. De klant krijgt een link, logt in met een eigen account, en kan de app op telefoon of tablet "toevoegen aan beginscherm" zodat het als app voelt. Draait in de cloud (Vercel + Supabase EU). Nieuwe versie online zetten = iedereen heeft hem meteen, geen update-gedoe.

### Mail in (order-mails binnenhalen)
Niet in de Gmail- of Outlook-inbox van de klant duiken. Het systeem krijgt een eigen postbus; de klant zet één doorstuurregel in zijn eigen mail (alles van de leverancier doorsturen). Het systeem leest alleen zijn eigen postbus, via een inbound-maildienst die binnenkomende mail aan de app doorgeeft.
- Provideronafhankelijk: één ontvangstkanaal, of de bron nu Gmail, Outlook of iets anders is. Mail is op transportniveau gewoon mail.
- De echte variatie zit in de inhoud (PDF-opbouw, plek van ref/klant/type), niet in de afzender. Die variatie hangt aan de opdrachtgever en wordt door de parser opgevangen, eventueel met een variant per opdrachtgever.
- Reden om weg te blijven uit de inbox: bij Google valt inbox-lezen onder de zwaarste toegang met een dure verplichte jaarlijkse beveiligingskeuring (duizenden euro's). Bij Microsoft is dat niet duur, maar de eigen-postbus-aanpak blijft beter voor privacy, onderhoud en schaalbaarheid naar meer klanten.

### Mail uit (bevestigingen)
Via een verstuurdienst, Resend (zit al in het project). Aparte dienst van het ontvangen. Met een domein-instelling kan de mail eruitzien alsof hij van de klant komt, nog steeds zonder in zijn mailbox te zitten.

### OAuth-principe (voor agenda, en eventueel lichte mail-scopes)
- De klant staat nooit zijn wachtwoord af. Hij klikt in de app op "koppelen", logt in op het scherm van Google/Microsoft zelf, en geeft toestemming. De app krijgt een sleutel met beperkte rechten, intrekbaar. Niet op locatie nodig.
- Verificatie van de app is eenmalig per app, niet per klant. Een nieuwe klant koppelt daarna met alleen zijn eigen toestemmings-klik.
- Voor agenda is verificatie gratis (agenda valt niet onder de dure keuring). Klein beginnen kan zonder volledige openbare review (testmodus of interne app); de volledige verificatie wordt pas nodig bij meerdere klanten/openbaar.

### Agenda-koppeling: eenrichting met onthouden ID
Het systeem blijft de bron van waarheid (architectuurregel 2). De koppeling schrijft alleen naar de agenda van de klant, leest die nooit.
- Bij het aanmaken van een afspraak in de agenda van de klant geeft die agenda een uniek event-ID terug. Dat ID wordt bij de eigen afspraak opgeslagen (sluit aan op architectuurregel 3: vast eigen ID plus extern agenda-ID per afspraak, en per doel-agenda als er meerdere monteurs zijn).
- Wijzigt of annuleert de klant iets in de app, dan gebruikt het systeem dat opgeslagen ID om datzelfde item in zijn agenda te wijzigen of te verwijderen. Geen doorzoeken van zijn agenda nodig, want het adres is bewaard. Blijft volledig schrijven (aanmaken/wijzigen/verwijderen), geen leestoegang.
- Grens van eenrichting: een handmatige wijziging in de eigen agenda van de klant, buiten de app om, wordt niet teruggezien. Acceptabel: de app is de baas, de persoonlijke agenda is een spiegel. Wil je ook handmatige wijzigingen terugzien, dan pas is leestoegang of een webhook nodig (meer werk, niet in deze opzet).

## Open beslispunten

- ~~**Agenda-component:** zelf bouwen versus een bestaande component (bijvoorbeeld FullCalendar) en welke leverancier.~~ **Besloten 2026-06-02: zelfbouw** (CSS-grid op basis van `agenda-planbord.html` + dnd-kit voor het slepen). Reden: resource-rijen zitten bij elke bibliotheek achter een betaalmuur, het ontwerp gebruikt bewust geen tijd-as/recurring/resize, en de mockup is al een werkend grid. Sluit aan op architectuurregel 2. Onderzoek en onderbouwing: `07_logboek/2026-06-02_agenda-component-onderzoek.md`.
- Fijnafstemming statuskleuren kan in de review nog wijzigen.

## Verdienpotentieel-context (uit eerder)

Voor het echte systeem bij Ed (uit SAMENVATTING-VOOR-CLAUDEAI.md): inrichtingsfee 2.500 tot 3.500 eenmalig, maandbedrag 150 tot 250, uitbreidingen 75 tot 100 per uur. Open actie: informeel prijsgesprek met Ed, anker = wat de huidige rommel hem nu kost (geld, tijd, frequentie). Gesprek vindt plaats tijdens de bouw, niet ervoor.
