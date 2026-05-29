# Keukenstudio Voorschoten - Demo

Status: in ontwikkeling (sessies 1, 2A, 2A.6 klaar; volgende: Vercel-deploy, daarna zelf-gebruik fase)
Datum opgemaakt: 2026-05-24
Doel: werkende mini-demo om bij eerste gesprek met Ed mee te brengen

## Doel van deze demo

Bewijzen dat het systeem werkt op zijn kleinste, krachtigste versie: monteur-input en PDF-input komen samen op één scherm. Geen volledig product, wel een tastbaar "wow"-moment voor Ed.

## Scope

### Wat erin zit

**Monteur-input (PWA op telefoon):**
- Foto uploaden
- Spraak inspreken OF tekst typen
- Urgentie kiezen (rood of geel)
- Verzenden

**PDF-input (via email of upload):**
- PDF met service-melding wordt ingelezen
- AI extraheert klantgegevens, referentienummer, melding
- Verschijnt als klus in dezelfde lijst

**Output (Ed's laptop):**
- Eén lijst met alle binnenkomende meldingen en klussen
- Foto's zichtbaar
- Urgentie kleur-gecodeerd
- Bron zichtbaar (monteur vs PDF)
- Tijd zichtbaar
- Live updates zonder verversen

### Wat er NIET in zit

- Login of accounts
- Status-flow (besteld / binnen / klaar)
- Planning-functie
- Klant-communicatie
- Notificaties (push, email)
- Echte productie-veiligheid
- Native iPhone/Android app
- Database met geschiedenis (voor demo mag in-memory of simpel)

## Stack en architectuur-keuzes

**Frontend en backend:** Next.js (TypeScript)
**Database, auth (later), file storage:** Supabase
**Hosting:** Vercel
**AI:** Claude API (spraak-naar-tekst, PDF-verwerking, melding-structurering)

**App-vorm: PWA (Progressive Web App)**

Een PWA is een website die zich op een telefoon gedraagt als een app. De monteur opent een link, zet hem op zijn startscherm, en gebruikt hem als een app (geen browser-balk, full-screen). Geen download uit App Store of Play Store, geen apart Apple developer-account of Google Play account nodig, updates direct beschikbaar zonder goedkeuringsproces.

**Waarom geen native app (iPhone/Android):**

Een native app zou 2-3x meer bouwtijd kosten en biedt voor onze use case weinig extra waarde. De drie redenen waarom je ooit native zou willen overwegen (look-and-feel professioneler, betere offline-werking, betrouwbaardere push op iPhone) zijn voor MKB-keukenwerk niet doorslaggevend. Mocht een toekomstige klant native echt nodig hebben, dan kan dat later naast de PWA gebouwd worden, met 60-70% van de bestaande code (backend, AI, database) hergebruikbaar.

**Waarom deze stack:**

Next.js + Supabase + Vercel is de meest populaire moderne combinatie en daarmee waar Claude Code het sterkst in is. Snelle ontwikkeling, weinig boilerplate, ingebouwde features voor wat we nodig hebben (auth, file storage, real-time updates). Toekomstbestendig voor echte versie en volgende klanten.

## Bouwtijd inschatting

Realistisch voor Rein met Claude Code: ~13-22 uur totaal (na splitsing van sessie 2 in 2A en 2B).

Verdeeld over sessies:
- ~~Sessie 1: Backend, AI-koppelingen, PDF-uitlezen werkend~~ **✓ KLAAR (2026-05-26, ~95 min, 24 tests groen)**
- ~~Sessie 2A: Monteur-flow — werkbak, opdracht-detail (nav/bel/datums), melding toevoegen binnen opdracht (foto, spraak, urgentie), bewerken met versie-nummering, PDF-upload~~ **✓ KLAAR (2026-05-28, 91 tests groen). Spraak op telefoon vereist nog HTTPS.**
- **Zelf-gebruik fase (geen bouwsessie): Rein gebruikt de PWA voor echte KSV-opdrachten en debugt wat hapert. Pas verder bouwen als Rein tevreden is over deze versie.**
- Sessie 2A.5: Authenticatie via Supabase Auth, RLS aanzetten met juiste regels, account voor collega. (zie "Volgorde na sessie 2A")
- Sessie 2B: Ed-flow + echte data — Gmail-koppeling voor mail-input, mail-output naar Ed bij nieuwe melding, eerste echte Keukenstudio-PDF testen en parser fine-tunen. (4-5u)
- Sessie 3: Lijst-weergave Ed's kant, live updates (3-5u)
- Sessie 4: Polijsten, PWA-configuratie (installeerbaar maken op startscherm), testen op echte telefoon, demo-scenario klaarzetten (2-4u)

## Volgorde na sessie 2A (vastgelegd 2026-05-28)

Bewuste volgorde, niet eerder uitvoeren:

1. **Zelf-gebruik fase.** Rein zet de PWA in voor echte KSV-opdrachten en debugt wat in de praktijk hapert. Pas door naar stap 2 als Rein tevreden is over de huidige versie.
2. **Sessie 2A.5 — authenticatie.** Supabase Auth toevoegen, RLS aanzetten met juiste policies, account voor Reins collega. Dit gebeurt PAS na de zelf-gebruik fase, op Reins signaal.
3. **Daarna pas sessie 2B (Gmail) en de rest.**

**Toekomstvast bouwen (geldt vanaf nu):** schrijf nieuwe code zo dat `user_id` (wie maakte de rij) en `toegewezen_aan` (welke monteur de opdracht krijgt) later naadloos toegevoegd kunnen worden zonder grote herschrijf. Concreet: rij-creatie via expliciete velden in de input-objecten (db-laag), zodat een extra kolom = één veld erbij; query-functies (getMeldingen e.d.) zo dat een filter op gebruiker later toe te voegen is. NU geen auth-functionaliteit toevoegen — alleen de structuur toekomstvast houden.

## Toekomstige features (sessie 3-4 of later)

Twee features die nu nog niet in scope zitten maar wel doorgedacht zijn. Wanneer ze concreet ingebouwd worden hangt af van wat data uit sessies 1 en 2 leert.

### 1. Klantgeschiedenis per referentienummer

Idee: bij een serviceklus moet de monteur zien:
- Wie de keuken oorspronkelijk monteerde
- Welke tekeningen erbij zaten
- Wat de eerste monteur had genoteerd bij oplevering (incl. open punten)
- Foto's van de eerste oplevering

KSV gebruikt unieke referentienummers per klant. Die zijn de juiste sleutel, niet het adres.

Datamodel-uitbreiding:
- Aparte tabel `klanten` met `referentienummer` als unique key
- Aparte tabel `opdrachten` (gekoppeld aan klant via referentienummer, met datum, type, monteur, PDFs, oplevering)
- Bij nieuwe opdracht: app zoekt op referentienummer of klant al bestaat

Edge case: opdracht zonder referentienummer
- Komt heel soms voor (volgens Rein)
- App detecteert ontbreken in PDF
- Melding: "Geen referentienummer gevonden, laat op kantoor controleren"
- Status: "nog te valideren"
- Na invullen door kantoor: opslaan met correct nummer
- Niet als hard fout markeren, wel als attentiepunt

Voordeel voor Ed: monteur hoeft niet meer te bellen voor context.

Plannen voor sessie 4+ wanneer:
- Werkbak werkt
- Monteurs kunnen opleveren met foto's
- Data begint te stromen

### 2. Wijzigingen en annuleringen door Ed

Scenario: Ed mailt opdracht naar app. Opdracht staat bij monteur in werkbak. Daarna verandert er iets:
- Tijdwijziging
- Extra info voor monteur
- Datum verschoven
- Andere monteur
- Annulering

Drie mogelijke oplossingen:

A) Ed mailt opnieuw met referentienummer + "WIJZIGING" of "ANNULEREN" als trigger. App matcht op ref-nr en updatet.

B) Ed werkt in eigen web-pagina/app waar hij opdrachten kan zien en aanpassen.

C) Hybride: nieuwe opdrachten via mail, wijzigingen via simpele knop in notificatie-mail die app stuurt.

Voor sessie 2: alleen nieuwe opdrachten ondersteunen.
Voor sessie 3 of 4: wijzigingsflow uitwerken op basis van hoe vaak het voorkomt.

Rein moet checken: hoe vaak komt wijziging na mail voor bij Ed?
- Bijna nooit / Regelmatig / Vaak
- Bepaalt prioriteit van deze feature

## Hergebruik voor echte versie

Geschat 70-80% van de demo-code is direct herbruikbaar voor versie 1 van het echte systeem. Specifiek:
- AI-integratie (spraak-naar-tekst, melding-structurering, PDF-uitlezen)
- Foto-upload functionaliteit
- Database-structuur basis
- Architectuur-keuzes en stack
- Persoonlijke ervaring met de tools

## Demo-scenario voor Ed

Tijdens het gesprek:

1. Open trc-platform op laptop, laat 1-2 minuten zien wat je hebt gebouwd voor het YouTube-kanaal. Bewijs dat je kunt bouwen.

2. Open de mini-demo. Geef Ed je telefoon. Laat hem zelf:
   - Foto maken van een kast of paneel in zijn buurt
   - "Front bovenkast linksdraaiend bij klant Jansen, beschadigd bij ontvangst" inspreken
   - Geel kiezen
   - Verzenden

3. Wijs naar je laptop: melding verschijnt live in de lijst met foto en samenvatting.

4. Open een van Eds eigen service-PDFs (bijvoorbeeld 6203 of 7444), laad in het systeem. Tweede regel verschijnt in dezelfde lijst.

5. "Dit is de kern van wat ik voor je zou bouwen. Niet meer en niet minder voor de eerste versie. Wat denk je?"

## Beslissingen samengevat

- Bouwen vanaf nul (geen trc-platform fork) — schone start past bij nieuwe stack
- Next.js + Supabase + Vercel
- PWA (geen native app)
- Hosting op Vercel gratis-tier voor demo
- Supabase gratis-tier voor database/storage
- API-kosten Claude voor demo: enkele euro's
- Geen tijdsdruk vanuit deadline, wel vanuit eigen momentum
- **Met Superpowers-plugin vanaf de start**: gestructureerde aanpak met brainstorm, plan, TDD. Demo dient ook als test of deze werkwijze bevalt voor versie 1.
- **Strategie bij Superpowers-vragen**: bij twijfel "kies meest waarschijnlijke" met motivatie, later eventueel bijsturen.

## Wat ontbreekt nog

- Eerste sessie plannen (wanneer bouw je sessie 1?)
- Backup-systeem voor de Mainframe (open punt uit eerdere sessie)
- Domeinnaam voor de demo (kan ook subdomein op vercel.app)

## Volgende stap

Sessie 1 plannen en uitvoeren. Niet later dan deze week beginnen om momentum vast te houden.

## Werkwijze: eigen projectstart-discipline skill

UPDATE 2026-05-25: Superpowers-installatie mislukt door installatie-bug (zie logboek). In plaats van Superpowers zelf is een eigen skill gemaakt: projectstart-discipline. Deze leeft in c:\Users\rkzij\.claude\skills\projectstart-discipline\SKILL.md en wordt door Claude Code automatisch geladen bij sessiestart.

De skill bevat de kern van Superpowers, vertaald naar Nederlandse werkwijze en Reins voorkeuren:
- Verplichte brainstorm-fase voordat code geschreven wordt
- Design-document tonen ter bevestiging
- Plan met taken van 2-5 minuten
- Test-driven development (RED-GREEN cyclus)
- Review en afronding met logboek-entry

Wat bewust niet is meegenomen vergeleken met Superpowers:
- Sub-agents (te complex voor jouw schaal)
- Git worktrees (overkill voor demo)
- Code-review tussen taken automatisch (kan handmatig)

Werkwijze in de praktijk:
1. Open nieuwe Claude Code sessie voor een bouw-sessie
2. De skill wordt automatisch geladen
3. Bij start: typ iets als "ik wil sessie 1 starten" en de skill activeert
4. Claude Code stelt brainstorm-vragen voordat hij begint
5. Bij twijfel-vragen kun je altijd in claude.ai overleg vragen

Strategie bij brainstorm-vragen: sterke voorkeur geven, bij twijfel "kies meest waarschijnlijke" met motivatie. Achteraf eventueel bijsturen.

Mogelijk later: Superpowers opnieuw proberen na overstap naar Mac of WSL-installatie.
