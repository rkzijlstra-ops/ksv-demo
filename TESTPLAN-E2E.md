# Testplan: geautomatiseerd end-to-end testen

Datum: 2026-06-05
Status: plan, nog niks gebouwd
Doel: zodra de eerste versie staat, kan een testrobot (Claude + Playwright) de hele keten zelf doorlopen en controleren, zodat Rein niet steeds uren handmatig klikt.

## Uitgangspunt: wie doet wat

- **De robot doet:** inloggen, opdracht inschieten, plannen op het planbord, versturen, monteur-app doorlopen, opleveren, rapport laten genereren en versturen, nieuwe klus op zelfde referentie. Bij elke stap een screenshot plus een controle op de database en de mail.
- **Rein blijft doen:** oordelen op smaak ("voelt dit goed voor Ed en de monteurs"), beslissen wat een echte bug is en wat acceptabel, en eindbaas op wat naar buiten gaat.
- **De robot is geen mens in jouw browser.** Het is een script dat een echte browser aanstuurt, zichzelf controleert, en rood/groen teruggeeft met bewijs (screenshot, database-rij, mail).

## Drie testlagen

1. **API / unit (vitest, bestaat al).** 20 testbestanden dekken de meeste API-routes. Hier vullen we alleen gaten. Snel, goedkoop, geen browser nodig.
2. **End-to-end browser (Playwright, nieuw).** De echte klik-flows: login, planbord-drag-drop, monteur-PWA, oplevering. Maakt screenshots die Claude leest en beoordeelt.
3. **Data- en dienst-verificatie.** Na elke flow controleren we de bron, niet alleen het scherm: de juiste rij in Supabase, de juiste status, de mail in de Resend-testinbox.

## Login: de eerste horde (eerlijk)

De app gebruikt Supabase-auth met Google-OAuth en magic-link. Een robot kan **niet** door het echte Google-inlogscherm; Google blokkeert geautomatiseerd inloggen. Oplossing, in volgorde van voorkeur:

1. **Programmatische sessie via de Supabase secret key.** De test maakt server-side een sessie voor een vast testaccount aan en zet de auth-cookie direct in de browser. Geen Google-scherm nodig. Dit is de standaardmanier om Supabase-apps e2e te testen.
2. Drie vaste testaccounts, één per rol: `test-monteur@`, `test-opdrachtgever@`, `test-beheerder@`, elk met een `profielen`-rij en de juiste `opdrachtgever_id`.
3. Magic-link als terugval: alleen als de programmatische route niet lukt, en dan moet de testmail opgevangen kunnen worden.

Actie vooraf: testaccounts aanmaken en een testhelper schrijven die een sessie zet. Dit is eenmalig.

## Externe diensten in de test

- **Eigen agenda = het planbord in Supabase.** Niet Google Calendar. "In de agenda plaatsen" controleren we op de velden `startdatum`, `starttijd`, `duur_dagen`, `toegewezen_aan`, `monteur_naam` en de status, plus een screenshot van het planbord. Geen Google-tools.
- **Mail = Resend, testmodus.** Stuurt alleen naar je eigen accountmail (`RAPPORT_EMAIL`). De robot stuurt dus nooit per ongeluk naar Ed of een klant. We controleren dat de mail is verzonden en wat erin staat, tegen dat ene testadres. Optie later: een eigen verzenddomein, dan kan ook naar een testvariant.
- **PDF-parsing = Claude API, kost tokens.** We gebruiken een paar vaste test-PDF's uit `test-pdfs/`, niet steeds nieuwe. Zo blijven de kosten laag en de uitkomst voorspelbaar (we weten welke klant, ref en meldingen eruit horen te komen).
- **Whisper (spraak) en foto-upload:** vaste testbestanden, niet live opnemen.

## Testscenario's (de happy path uit DESIGN-COMPLEET-SYSTEEM, flow 1 tot 9)

Elk scenario: stappen die de robot doet, daarna de checks. Een scenario is groen als alle checks kloppen.

### S1. Inschieten (opdrachtgever)
- Stappen: log in als opdrachtgever, sleep/upload één vaste test-PDF in het dashboard.
- Checks: nieuwe `meldingen`-rij met `bron='pdf'`, `dashboard_status='binnen'`; klant, adres en referentienummer kloppen met de bekende test-PDF; `documenten`-rij met `is_primair`; screenshot dashboard toont de opdracht met status binnen.

### S2. Inschieten meerdere PDF's, groepering op referentie
- Stappen: upload twee PDF's met dezelfde ref en één met een andere ref.
- Checks: zelfde ref wordt één opdracht met twee documenten; andere ref wordt een aparte opdracht; bij ontbrekende ref een attentiepunt. (Eerlijk: controleer eerst of de groepering-review-stap echt gebouwd is; de verkenning noemde dit als mogelijk half af.)

### S3. Dossier-check op referentie
- Stappen: schiet een service in op een ref waar al een eerdere klus op staat.
- Checks: de eerdere klus(sen) op die ref worden gekoppeld/zichtbaar; geen ref geeft attentiepunt "laat controleren".

### S4. Plannen op het planbord (drag-drop)
- Stappen: log in als opdrachtgever, sleep een opdracht uit de pool naar een dag en een monteur; test ook een variant met starttijd (service) en zonder (montage, dagblok); test verplaatsen en ontplannen.
- Checks: `startdatum`, `starttijd` (leeg vs gevuld), `duur_dagen`, `monteur_naam`, `toegewezen_aan` kloppen; status `concept_gepland`; screenshot planbord toont de kaart op de juiste dag/monteur; na ontplannen weer `binnen`.

### S5. Versturen naar monteurs (verstuur-poort)
- Stappen: druk op "Verstuur naar monteurs".
- Checks: status springt naar `gepland`; één gebundelde mail per monteur in de Resend-testinbox (niet één per opdracht); de teller op de knop klopte vooraf; opdracht staat in de werkpool van de monteur.

### S6. Monteur bekijkt klus in de PWA
- Stappen: log in als monteur, open de werkpool en de opdracht-detail.
- Checks: monteur ziet alleen zijn eigen toegewezen klussen (RLS); klantgegevens, documenten, artikelen en meldingen tonen; de sectie "deze keuken eerder" toont historie op dezelfde ref; bevestig-knop werkt en zet status op `bevestigd` (blauw).

### S7. Melding toevoegen (monteur), incl. spoed
- Stappen: voeg een melding met foto toe; markeer er één als spoed en verstuur die.
- Checks: nieuwe melding met `bron='monteur'`, versienummer; spoed-mail naar kantoor in de testinbox; foto in storage.

### S8. Oplevering met bewijs en handtekening
- Stappen: open opleveren, upload eindstaat-foto's, vul uitkomst en opmerking, zet een handtekening op het canvas, kies rapport-mail.
- Checks: `opleveringen`-concept opgeslagen met foto-urls en handtekening-url; rapport-preview toont briefhoofd, klant, foto's, meldingen en handtekening.

### S9. Rapport genereren en versturen (finalisering)
- Stappen: druk op opleveren/versturen.
- Checks: PDF gegenereerd en in storage; mail met PDF-bijlage in de testinbox; `opdracht_status='opgeleverd'`, `opgeleverd_at` gezet, `rapport_url` ingevuld; dashboard toont de opdracht groen met rapport eronder.

### S10. Nieuwe klus op zelfde referentie
- Stappen: schiet een nieuwe service in op de ref van een al opgeleverde klus.
- Checks: nieuwe opdracht hangt aan dezelfde ref; de monteur ziet bij die nieuwe klus de volledige historie van die keuken (vorige monteur, datum, rapport), nieuwste eerst.

### S11. Zijtak: wijziging na versturen
- Stappen: pas een al verstuurde opdracht aan (datum/tijd/monteur).
- Checks: markering "gewijzigd, nog te versturen" (gestreept), telt mee in de verstuur-knop en het "Te doen"-overzicht; bij volgende verstuur-actie gaat de wijziging gebundeld mee; monteur herbevestigt; status weer blauw.

### S12. Gebruikersbeheer en toegang (beheerder + RLS)
- Stappen: log in als beheerder, wijzig een rol, nodig iemand uit; probeer als monteur een klus van een ander te openen.
- Checks: rolwijziging werkt; uitnodigingsmail in testinbox; monteur krijgt géén toegang tot niet-toegewezen klussen (RLS doet zijn werk). Dit is ook de beveiligingscheck.

## Hoe agents dit slim maken

- **Parallel testen.** Meerdere agents tegelijk, elk een blok scenario's: één agent S1 tot S3 (inschieten), één S4 en S5 (plannen/versturen), één S6 tot S9 (monteur en oplevering), één S10 tot S12 (historie, zijtak, toegang). Ze rapporteren samen terug. Dat scheelt de meeste tijd.
- **Finetune-lus.** De robot draait, vindt wat niet klopt, ik pas aan, draai opnieuw, tot alles groen is. Jij krijgt per ronde een kort rapport: dit werkt, dit faalde, hier is de screenshot, dit heb ik gefixt.
- **Eén testdatabase, schoon vooraf.** Elke run begint van een bekende staat (testaccounts plus een paar vaste test-PDF's), zodat uitkomsten herhaalbaar zijn en de echte data van Ed nooit geraakt wordt.

## Wat de robot níet kan (jouw oordeel blijft nodig)

- Of het op de telefoon van een monteur prettig werkt (smaak, gevoel, snelheid in de hand).
- Of de teksten in de mails kloppen qua toon voor Ed en de klant.
- Of een gevonden afwijking een echte bug is of acceptabel gedrag.
- Echte Google-login en echte klant-mail (bewust buiten de test gehouden).

## Eenmalige setup voordat dit kan (de investering)

1. App draait ergens stabiel: lokaal (`npm run dev`) of online.
2. Playwright toevoegen aan het project (devDependency) plus een basisconfig.
3. Drie testaccounts plus een testhelper die programmatisch een sessie zet (de login-horde).
4. Een aparte testdatabase of een schoon-script, zodat tests de echte data niet raken.
5. Vaste test-PDF's controleren/aanvullen in `test-pdfs/` met bekende verwachte uitkomsten.
6. Resend in testmodus bevestigen (stuurt naar je eigen adres), of een testontvanger regelen.

## Volgorde van aanpak

1. Eerst de setup (punten 1 tot 6 hierboven). Zonder login-helper en schone testdata werkt niets herhaalbaar.
2. Dan de happy path als één lange e2e-test (S1, S4, S5, S6, S8, S9): inschieten tot opgeleverd. Dat is de ruggengraat.
3. Daarna de losse scenario's en de zijtak (S2, S3, S7, S10, S11, S12).
4. Daarna pas parallel en de finetune-lus, als de losse scenario's stabiel zijn.

Niet alles tegelijk bouwen. Eerst één flow groen krijgen, dan uitbreiden.
