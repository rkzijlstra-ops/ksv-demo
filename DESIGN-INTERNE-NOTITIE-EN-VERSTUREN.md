# Ontwerp: interne notitie + ontkoppelde verzending (klant / zaak)

Datum: 2026-06-11. Status: goedgekeurd ontwerp (Rein), bouw in uitvoering.
Bouwt voort op commit `0a0d921` (herontwerp rapport-PDF). Raakt die commit niet aan.

## Aanleiding

Bij de oplevering staat nu één opmerkingveld dat in het rapport komt, plus één knop
"Rapport maken & versturen" die in één klap het rapport maakt, naar één ontvanger mailt en
de opdracht op `opgeleverd` zet. In de praktijk wil de monteur:

1. Een **interne notitie** kwijt die de klant nooit ziet, naast de openbare opmerking.
2. Het rapport **los in tijd** versturen: de klant meteen (die wil het ter plekke), de zaak
   eventueel later op de dag.
3. **Regie houden over het oplevermoment.** Ed mag niet live op zijn dashboard zien hoe laat
   er precies opgeleverd is. Hij hoort pas iets als de monteur zelf de zaak inlicht.

Onderzoek bracht twee dingen aan het licht:
- Het klant-mailadres staat al in de bron-PDF (kop "Email-adres"), maar wordt nu bij het
  inschieten weggegooid (de uitlezer pakt naam/adres/telefoon, niet de mail).
- Het dashboard van Ed toont het oplever-blok onvoorwaardelijk zodra er een oplevering-record
  bestaat. Dat record ontstaat al bij de eerste tussenopslag. Ed ziet dus nu al live mee terwijl
  de monteur bezig is. Dat is precies het lek dat punt 3 wil dichten.

## Kernbegrippen

- **Openbare opmerking** (`opmerking`): komt in het rapport, zichtbaar voor iedereen. Bestond al.
- **Interne notitie** (`interne_opmerking`, NIEUW): alleen voor de zaak, nooit in de klant-versie.
- **Klant-versie** van het rapport: schoon, zonder interne notitie.
- **Zaak-versie** van het rapport: volledig, mét interne notitie.

De garantie dat de klant-versie de interne notitie niet bevat is structureel: de klant-versie
wordt gebouwd door dezelfde generator die `interne_opmerking` niet in handen krijgt. Geen vinkje,
maar een ontwerp-eigenschap. Een test borgt dit (interne tekst mag nooit in de klant-PDF voorkomen).

## Datamodel (nieuwe velden)

Tabel `opleveringen`:
- `interne_opmerking text` — de interne notitie. Default null.
- `klant_rapport_email text` — adres waar de klant-versie heen ging (los van `rapport_email` = zaak).
- `klant_rapport_verzonden_at timestamptz` — wanneer de klant-versie verstuurd is (null = nog niet).
- `zaak_rapport_verzonden_at timestamptz` — wanneer de zaak-versie verstuurd is (null = nog niet).

`rapport_email` blijft de ontvanger voor de **zaak**-versie (bestaand gedrag, hernoemd in betekenis).
`rapport_url` blijft de zaak-PDF (zoals nu). De klant-PDF bewaren we als `klant_rapport_url text` (NIEUW)
zodat hij terugvindbaar is.

Tabel `meldingen` (opdracht):
- `klant_email text` — uit de PDF, voorinvulwaarde voor de klant-verzending. Default null, aanpasbaar.

Alle nieuwe kolommen zijn nullable / hebben een default; bestaande data blijft geldig.

## Verzend-flow (de kern van de verbouwing)

Eén gecombineerde "opleveren"-actie wordt gesplitst in drie losse dingen:

1. **Oplevering vastleggen** (foto's, video, controle, openbare opmerking, interne notitie, handtekening).
   Dit blijft tussenopslag in `opleveringen`. Verandert GEEN dashboard-status. Privé voor de monteur.
2. **Versturen naar de klant** (schone versie). Losse knop. Genereert de klant-PDF, mailt naar
   `klant_rapport_email`, zet `klant_rapport_verzonden_at` + `klant_rapport_url`. Raakt Ed niet.
3. **Versturen naar de zaak** (volledige versie). Losse knop. Genereert de zaak-PDF, mailt naar
   `rapport_email`, zet `zaak_rapport_verzonden_at` + `rapport_url`, en zet PAS DAN de opdracht op
   `opgeleverd`. Is de klant-versie al weg (`klant_rapport_verzonden_at` gezet), dan vermeldt de
   zaak-mail dat de klant het rapport ook heeft ontvangen (datum + adres).

Gevolg voor de toestandsmachine: "opgeleverd" hangt voortaan aan de **zaak**-verzending, niet aan
het tekenmoment. Tussen tekenen en zaak-mail is de opdracht voor de monteur "afgerond, zaak nog te
versturen" (privé-markering in de werkpool), en voor Ed onveranderd (hij ziet nog niets).

### Privacy-fix dashboard

Het oplever-blok op de opdracht-detailpagina van Ed toont pas iets als de zaak-versie verstuurd is.
Concreet: tonen op voorwaarde `zaak_rapport_verzonden_at != null` (equivalent: `rapport_url` gezet),
in plaats van "zodra er een oplevering-record is". Dicht het bestaande lek.

## Toestandsmatrix (nieuwe/gewijzigde overgangen)

| Overgang | Data | Kantoor-UI (Ed) | Monteur-UI | Bericht |
|---|---|---|---|---|
| oplevering vastleggen (tussenopslag) | oplevering-record bijgewerkt | **niets zichtbaar** (privacy-fix) | flow met ingevulde velden | geen |
| versturen naar klant | klant-PDF, `klant_rapport_verzonden_at`, `klant_rapport_url` | niets | "klant: verzonden ✓" | mail naar klant (schone versie) |
| versturen naar zaak | zaak-PDF, `zaak_rapport_verzonden_at`, `rapport_url`, opdracht → opgeleverd | opleverrapport verschijnt nu pas, status groen | "zaak: verzonden ✓", klus naar history | mail naar zaak (volledige versie, meldt of klant het ook kreeg) |
| afgerond maar zaak nog niet verstuurd | oplevering vastgelegd, `zaak_rapport_verzonden_at` null | **niets** (geen tijdstip, geen blok) | werkpool: "afgerond, rapport naar zaak nog versturen" (alleen monteur) | geen |

Gaten die we bewust dichten of accepteren:
- **Klant eerst, dan zaak:** zaak-mail meldt de klant-ontvangst. ✓
- **Zaak eerst, dan (eventueel) klant:** zaak-mail kan de klant-ontvangst nog niet melden (klopt,
  dat is op dat moment nog niet zo). De verzendkaarten tonen elke kant zijn status, zodat de monteur
  bewust de volgorde kiest. Geen dwang.
- **Wel klant, nooit zaak:** opdracht blijft voor Ed onveranderd; de monteur houdt de privé-geheugensteun.
  Acceptabel: de monteur is eigenaar van het oplevermoment.

## UI (OpleverFlow)

Volgorde op het scherm:
1. Eindresultaat vastleggen (foto/video) — ongewijzigd.
2. Controle bij oplevering — Akkoord/Niet akkoord + **openbare opmerking** ("Opmerking · zichtbaar
   voor iedereen") + spraak. Knoppen Akkoord/Niet akkoord gelijk uitgelijnd: icoon vast vooraan,
   tekst op één regel, niet centreren-en-wrappen.
   Daaronder de **interne notitie**: amber balk met slotje, dichtgeklapt, label "Interne notitie ·
   alleen voor de zaak", met spraak. Voor of na het tekenen invulbaar (tekenen is een modal, dus de
   klant ziet de notitie niet tijdens het tekenmoment).
3. Handtekening — ongewijzigd.
4. **Versturen** (vervangt het losse "Rapport naar" + één knop). Twee kaartjes:
   - "Naar de klant": mailadres voorinvuld uit `klant_email`, aanpasbaar; knop "Stuur naar klant";
     statusbolletje (verzonden/nog niet).
   - "Naar de zaak": bestaande ontvanger-keuze (keukenzaken/adresboek/zelf typen); knop "Stuur naar
     zaak"; statusbolletje; toont "klant heeft 't ook" zodra de klant-versie weg is.

Het adresbeheer (adres bewaren/aanpassen) dat nu prominent in "Rapport naar" staat, gaat in het
zaak-kaartje achter een klein "ander adres"-knopje, want het is een randgeval.

Mock-up: `mockups/oplevering-versturen.html`.

## Rapport (twee versies, één bron)

`rapportSamenvatting()` blijft de openbare opmerking trekken. Voor de zaak-versie komt er een aparte
weg waarlangs `interne_opmerking` als extra blok onderaan wordt toegevoegd. De PDF-generator krijgt
een expliciete `bedoeldVoor: "klant" | "zaak"` of een aparte intern-parameter. De klant-tak raakt
`interne_opmerking` nooit aan. Een test (`rapport.test.ts`) controleert dat de interne tekst niet in
de klant-PDF-tekst voorkomt en wel in de zaak-versie.

## Testlagen

- **Unit:** db-mappers (nieuwe velden), rapportSamenvatting/rapport-generatie (interne notitie wel/niet),
  parser-schema (klant_email), de "klant heeft 't ook"-mailregel.
- **Integratie:** insert/ophalen oplevering met nieuwe velden; PDF-parse levert klant_email.
- **E2e (Rein draait morgen in PowerShell):** opleveren.spec aanpassen aan de twee verzendknoppen;
  privacy (Ed ziet niets tot zaak-mail); klant-verzending; volgorde klant→zaak met de melding.

## Fasering (zie ook PLAN-…)

1. Datalaag: kolommen + migraties + db-mappers + types. Unit/integratie.
2. PDF-parse: klant_email door parser-schema, prompt, insert. Unit/integratie.
3. Rapport: twee versies + lek-test. Unit.
4. Verzending: split klant/zaak in API + mail-tekst "klant heeft 't ook" + status pas bij zaak.
5. Dashboard privacy-fix.
6. OpleverFlow UI-herinrichting + knop-fix + mailadres voorinvullen.
7. Werkpool-geheugensteun.
8. Testdocumenten (TESTDEKKING, TOESTANDEN) + logboek + e2e-specs aanpassen.

Niet pushen; Rein draait de e2e en geeft akkoord, daarna de gezamenlijke push (neemt 0a0d921 mee).
