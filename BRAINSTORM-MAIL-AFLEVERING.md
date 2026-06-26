# Brainstorm: betrouwbare oplever-mail + monteur-onboarding

Datum: 2026-06-26
Status: design, wacht op akkoord Rein voor plan

## Aanleiding

Klus 192945 (Keukensale.com Katwijk, familie Schaddé): de oplever-mail naar
`servicemonteur@keukensale.com` is op 24 juni 16:22 verstuurd en door Resend als
**Delivered** gemeld (de mailserver van keukensale.com accepteerde hem). Toch zegt
de keukensale niks te hebben ontvangen.

Onderzoek wees uit: geen storing, de mailmigratie naar Google Workspace heeft niets
gebroken. Verzendkant is gezond (Ed/KSV ontvangt normaal, Gmail-inbox ontvangt,
DNS/SPF/DKIM kloppen, Resend-domein geverifieerd). Het was de **eerste mail ooit**
vanaf `planning@kluslus.nl` naar het domein `keukensale.com`. Eerste contact van een
onbekende afzender belandt vaak in spam, of het adres wordt niet gelezen.

Twee structurele verbeteringen volgen hieruit, plus een onboarding-stap die we
meteen goed neerzetten omdat er nog geen monteur-accounts zijn.

## Scope (wat we bouwen)

1. **Reply-To per monteur** op de oplever-mail. Afzender blijft `planning@kluslus.nl`
   (goede aflevering), maar een antwoord van de keukenzaak gaat naar de monteur die
   de klus deed (`profiel.contact_email`). Vangnet: `antwoord@kluslus.nl`.
2. **Eerste-verzending-waarschuwing per domein.** Is dit de eerste oplever-mail ooit
   naar dat e-maildomein, dan toont de klus een **blijvend blokje** (bij monteur én
   kantoor) met: de waarschuwing, het adres + datum, een knop **Kopieer bericht**
   (één korte WhatsApp-tekst) en een knop **Opnieuw versturen** (met adres-correctie).
   Het blokje is **inklapbaar**: altijd een compacte regel zichtbaar ("verstuurd naar X
   op datum") met een pijltje; uitgeklapt verschijnt de waarschuwingstekst + knoppen.
   Direct na het versturen staat het automatisch uitgeklapt; bij later openen ingeklapt.
3. **Afzendergegevens verplicht bij eerste gebruik.** Een nieuwe monteur moet eerst
   naam, bedrijfsnaam, telefoon en contact-mail invullen voor hij de app gebruikt.
   Daarna een welkom-stap met een knop naar de handleiding (overslaan mag).

## Niet in scope (bewust later of nooit)

- Versturen vanuit de eigen mailbox van de monteur (maakt aflevering juist slechter).
- Automatische leesbevestiging / open-tracking (onbetrouwbaar).
- Herinnering/bevestigings-lus na versturen (Rein: overkill, de zaak vraagt er wel om).
- Domein-warmup / reputatie-tooling (lost zich vanzelf op naarmate je meer mailt).
- De snel-afsluiten herinrichting (hoort in een andere sessie/chat).

## Gebruikers

- **Monteur**: telefoon, PWA, niet-technisch. Levert op, kopieert de WhatsApp-tekst.
- **Kantoor (Rein)**: dashboard op laptop. Doet vaak het klantcontact, moet bij een
  telefoontje het blokje terug kunnen vinden op de klus.

## Eindresultaat (concreet, observeerbaar)

- Een antwoord op een opleverrapport komt bij de betreffende monteur, niet bij Rein.
- Bij de eerste mail naar een nieuw domein staat op de klus (monteur + kantoor) een
  blijvend blokje met waarschuwing, kopieerbare tekst, en Opnieuw versturen met
  adres-correctie.
- Een nieuwe monteur kan pas door nadat hij de vier afzendergegevens heeft ingevuld,
  en krijgt daarna de handleiding aangeboden.

## Happy path

1. Monteur logt voor het eerst in. Profiel onvolledig, dus de app stuurt hem naar het
   onboarding-scherm. Hij vult naam, bedrijfsnaam, telefoon, contact-mail in en slaat op.
2. Welkom-stap: knop "Bekijk de handleiding" (overslaan mag). Daarna de werkpool.
3. Monteur levert een klus op en verstuurt het rapport naar de keukenzaak.
4. Mail gaat via Resend, afzender `planning@kluslus.nl`, Reply-To = mail van de monteur.
5. Eerste mail ooit naar dat domein? Dan verschijnt op de klus (monteur + kantoor) het
   blokje: "Eerste keer naar dit adres, kan in hun spam staan", met Kopieer bericht en
   Opnieuw versturen.
6. Monteur tikt Kopieer bericht en stuurt de WhatsApp-tekst naar zijn contact.
7. Belt de zaak 3 dagen later "niks ontvangen": monteur of kantoor opent de klus, ziet
   adres + datum, corrigeert eventueel het adres en klikt Opnieuw versturen.

## Edge cases

- **Geen internet bij versturen**: bestaande foutafhandeling van de rapport-route. Het
  blokje verschijnt pas na een geslaagde verzending (er is dan een `rapport_verzendingen`-rij).
- **Monteur zonder contact_email** (zou niet kunnen door de gate, maar voor de zekerheid):
  Reply-To valt terug op `antwoord@kluslus.nl`. Mail loopt nooit vast door een leeg veld.
- **Ongeldig mailadres in onboarding**: formaat valideren, niet opslaan tot het klopt.
- **Adres-correctie bij Opnieuw versturen**: na correctie naar een ander domein toont het
  blokje het nieuw gebruikte adres; de "eerste keer"-status hangt aan het domein.
- **Tweede mail naar hetzelfde domein**: geen waarschuwing meer (blokje toont dan neutraal
  "verstuurd naar X op datum", zonder eerste-keer-tekst).
- **Wie krijgt de gate**: rollen die opleveren. Standaard de monteur.

## Volledigheids-check (tegenhangers en levenscyclus)

- **Profielgegevens**: tonen + wijzigen bestaat al (Mijn gegevens). Aanmaken = onboarding.
  Verwijderen n.v.t. (account-verwijdering is een andere flow).
- **Reply-To**: tegenhanger = "antwoord komt echt aan bij de monteur" (test via header).
- **Waarschuwing-blok**: tegenhanger = verdwijnt bij de tweede verzending naar dat domein.
  **Opnieuw versturen** is de tegenhanger/vervolgactie van versturen.
- **Lege/foutstaat**: onboarding vangt het lege profiel; het blokje verschijnt alleen bij
  een eerste verzending.
- **Rechten**: monteur ziet/bedient het blokje op zijn eigen klus; kantoor op de
  dashboard-klus. Opnieuw versturen mag door beide.

## Toestandsmatrix: oplever-verzending naar de opdrachtgever (per domein)

| Overgang | Data | Kantoor-UI | Monteur-UI | Bericht |
|---|---|---|---|---|
| nog niet verzonden | geen `rapport_verzendingen`-rij voor domein | klus zonder verzend-blok | klus zonder verzend-blok | - |
| eerste verzending naar nieuw domein | nieuwe rij (naar, datum, doelgroep) | blok: waarschuwing + adres/datum + Kopieer + Opnieuw | zelfde blok | mail naar zaak, Reply-To = monteur |
| opnieuw versturen (zelfde adres) | extra rij | blok blijft, datum bijgewerkt | idem | mail opnieuw |
| opnieuw versturen (gecorrigeerd adres) | extra rij naar nieuw adres | blok toont nieuw adres; eerste-keer als domein nieuw is | idem | mail naar nieuw adres |
| latere verzending naar bekend domein | extra rij | blok zonder eerste-keer-waarschuwing | idem | mail naar zaak |

Mini-toestand Reply-To: monteur heeft contact_email -> Reply-To = monteur; geen mail ->
Reply-To = `antwoord@kluslus.nl`.

## Test-strategie

- **Unit**: `isEersteVerzendingNaarDomein(naar, eerdereVerzendingen)`, `bepaalReplyTo(profiel)`,
  mailformaat-validatie, opbouw WhatsApp-tekst.
- **Integratie (test-DB)**: rapport-route schrijft `rapport_verzendingen`; Opnieuw versturen
  met gecorrigeerd adres; detectie eerste-vs-bekend domein.
- **Browser-e2e (Playwright)**: onboarding-gate (nieuw account -> geforceerd scherm -> invullen
  -> door); blokje bij eerste verzending; Opnieuw versturen met adres-correctie; blokje zonder
  waarschuwing bij tweede verzending; zowel monteur- als kantoor-UI.
- **E2e-mail (achter vlag)**: echte mail, Reply-To = monteur, header uitlezen.
- Eén commando: bestaande `npm run test:*` / `test:all`.
- Registers bijwerken in dezelfde commit: `TESTDEKKING.md` en `TOESTANDEN.md`.

## Bekende open punten (bewust later)

- Reply-To op de snel-afsluiten kantoor-mail (consistentie, niet nu).
- Domein-warmup/reputatie.
- Leesbevestiging.
