# Ontwerp: herinrichting opleveren + snel afsluiten

Datum: 2026-06-23
Branch: `oplever-herinrichting`
Visuele companion: `docs/mockups/oplever-mockups.html` (open via Edge)

## Doel en context

De monteur-app heeft twee afrond-flows: **opleveren** (volledig rapport) en **snel afsluiten** (snelle variant). Snel afsluiten klopt niet:

- Het stuurt geen rapport, maar een kort tekstmailtje naar één vast adres (`RAPPORT_EMAIL`), ongeacht de opdrachtgever.
- De klus gaat niet op "opgeleverd" maar blijft "open"; toch oogt hij afgerond. Verwarrend.
- Geen keuze naar wie het gaat, en niet "later versturen": of meteen weg, of de klus blijft openstaan.

Doel: snel afsluiten een schone, uitgeklede opleveren maken, en het opleverscherm zo herinrichten dat een monteur bij eerste gebruik meteen begrijpt wat zijn opties zijn. Eén consistente kleur-staat-taal en een eenduidig "nu of later versturen".

## Kernbeslissingen (samenvatting)

1. **Eén rapport als basis.** Je legt de oplevering vast (foto, video, notitie). Dat is wat de klant zou zien.
2. **"Ook aan de klant" is een optie, geen modus.** Beschikbaar als de opdrachtgever het toestaat, of altijd bij een eigen klus. Staat-ie uit, dan is er geen klant in beeld en geen splitsing.
3. **Interne melding verschijnt alleen bij klant-levering.** Een "Voor de opdrachtgever"-blok (foto, video én tekst) dat buiten de klant-versie blijft. Alleen nodig wanneer er een klant-versie bestaat.
4. **Snel afsluiten = opleveren minus handtekening, voorvertoon-stap en (bij KSV) klant-kant.** Levert een verkorte PDF, geen tekstmailtje meer.
5. **Versturen via de bestaande ActieKaart-kleur-staat-taal.** Oranje "nog te versturen" = de kluspool-oranje. Plus een expliciete "Later versturen"-kaart.
6. **`werkpool` wordt app-breed `kluspool`.**
7. **Slimme standaard-ontvanger op basis van bron** (opdrachtgever-klus vs eigen klus).

## Kleur-staat-taal (hergebruik, niet nieuw)

Uit `src/components/ActieKaart.tsx` + `design-system.md`:

- **grijs** (`ink-muted`) = optioneel/secundair
- **oranje** (`accent`) = nog te doen
- **groen** (`success`) = gedaan/verzonden
- **rood** (`urgent-rood`) = afwijkende keuze

Elke verstuur-actie is een ActieKaart: gekleurde balk links, icoon-cirkel, status-subtekst, pijl of vinkje rechts. Een kaart "Naar de opdrachtgever" is oranje "Nog te versturen" en wordt groen "Verzonden · datum" met vinkje. Dit bestaat al; we trekken snel afsluiten en de nieuwe onderdelen erin.

## Het opleverscherm (nieuw)

Volgorde op het scherm:

### 1. De oplevering (basis, altijd)
Foto (Camera / Galerij), video (Opnemen / Galerij), notitie. Wordt als concept opgeslagen tijdens het invullen (bestaand gedrag). Dit is wat de klant zou zien.

### 2. Ook aan de klant opleveren (keuzekaart)
- Een keuzekaart in de kaart-stijl (personen-icoon, vinkvakje rechts).
- **Beschikbaar** als: opdrachtgever-klus waarvan de opdrachtgever klant-levering toestaat, OF eigen klus (bron = monteur).
- **Niet beschikbaar** (KSV-standaard): grijs/uitgevinkt met korte uitleg "deze opdrachtgever levert zelf aan de klant".
- Staat-ie aan, dan verschijnt blok 3 en de klant-verstuurkaart.

### 3. Voor de opdrachtgever (alleen bij klant-levering aan)
- Geel blok met label "klant ziet dit niet".
- Volledige functionaliteit: foto (Camera/Galerij), video (Opnemen/Galerij) én tekst.
- Gaat naar de opdrachtgever, blijft uit de klant-versie. Dit vervangt de huidige tekst-only "interne notitie".

### 4. Handtekening (inklapbaar, optioneel)
- Kaart-kop (potlood-cirkel, "Handtekening", subtekst "optioneel · klant tekent voor akkoord"), dichtgeklapt voor rust.
- Open: compacte **Akkoord / Niet akkoord** (akkoord = groen, niet akkoord = rood) plus het tekenvlak.
- Hoort bij opleveren, niet bij snel afsluiten.

### 5. Versturen (ActieKaarten)
- **Rapport voorvertonen** (grijs, oog) — read-only voorvertoning.
- **Naar de opdrachtgever** (oranje "Nog te versturen" → groen "Verzonden · datum").
- **Naar de klant** (alleen bij klant-levering aan; oranje "via voorvertoning").
- **Later versturen** (grijs, klok, "zet klaar in je kluspool").

### 6. Voorvertoning vóór de klant
Zodra je "Naar de klant" kiest: een "Dit ziet de klant"-scherm met exact de klant-versie (zonder de interne/voor-opdrachtgever-inhoud) en de bevestigknop. Voorkomt dat de interne versie per ongeluk naar de klant gaat.

## Snel afsluiten (nieuw)

Hetzelfde scherm als opleveren, met weggelaten:
- Handtekening-kaart
- Voorvertoon-stap
- Bij KSV (klant-levering uit): de hele klant-kant

Resultaat = een **verkorte oplever-PDF** (zelfde PDF als opleveren, zonder de weggelaten onderdelen) in plaats van het huidige tekstmailtje. Versturen, ontvangerkeuze, voorvertoning-bij-klant en kluspool-gedrag identiek aan opleveren. Bij KSV blijft dus over: oplevering vastleggen → versturen naar opdrachtgever (of later in kluspool).

## Klant-levering: gating

- **Opdrachtgever-klus (bron = pdf):** klant-knop alleen zichtbaar als die opdrachtgever klant-levering aan heeft. Instelling hangt aan de opdrachtgever (te zetten in het dashboard). KSV: uit.
- **Eigen klus (bron = monteur):** klant-knop altijd beschikbaar; jij beslist per klus.

## Slimme standaard-ontvanger (op basis van bron)

- **Opdrachtgever-klus:** standaard naar de opdrachtgever; klant-mailadres blijft voorgevuld door de parser (behouden).
- **Eigen klus:** naar je vaste contacten (zelfde adresboek als opleveren) of ter plekke een adres intikken, eventueel opslaan.

## Status- en kluspool-semantiek

- Niets gaat automatisch de deur uit. Een verstuur-kaart die oranje "nog te versturen" blijft staan = de klus staat oranje in de **kluspool**. "Nu of later" zit dus in de kleur; "Later versturen" is de expliciete kaart die hetzelfde verwoordt.
- Een klus telt als afgerond/opgeleverd zodra het rapport naar de opdrachtgever verstuurd is (consistent met de huidige status-overgang bij "naar de zaak"). Tot die tijd: oranje in de kluspool.
- (Toestandsmatrix wordt in `TOESTANDEN.md` uitgewerkt als onderdeel van het plan.)

## `werkpool` → `kluspool` (app-breed)

Hernoem alle UI-teksten van "werkpool" naar "kluspool". Codenamen mogen mee als het schoon kan; UI is leidend. Aparte, op zichzelf staande taak zodat het in één keer overal gelijk gaat (geen half-hernoeming).

## Code-impact (hoog niveau, uit te werken in het plan)

- **DB/schema:** instelling klant-levering per opdrachtgever; velden voor "voor de opdrachtgever"-media (foto/video/tekst); herziening van wat snel afsluiten opslaat. Migratie op alle drie de DB's (prod handmatig, test+demo via `migrate:test`).
- **Snel afsluiten:** `src/app/api/opdrachten/[id]/afgerond/route.ts`, `src/components/AfgerondMeldenScherm.tsx`, `src/lib/afgerond-mail.ts` → verschuiven naar de oplever-machinerie + verkorte PDF.
- **Opleveren:** `src/components/OpleverFlow.tsx` (interne notitie → "voor de opdrachtgever" met media; akkoord/handtekening inklap; klant-kant conditioneel), `src/lib/rapport.ts` (verkorte PDF-variant).
- **Rapport/mail:** `src/app/api/opdrachten/[id]/rapport/route.ts`, `src/lib/oplever-mail.ts`.
- **Gating + bron-defaults:** opdrachtgever-instelling lezen; bron (`meldingen.bron`) sturen de defaults.
- **kluspool-rename:** brede zoektocht op "werkpool".

## Open punten / out of scope

- Exacte DB-kolomnamen en of de verkorte PDF een eigen template krijgt of een variant-vlag op de bestaande template: bepalen in het plan.
- Dashboard-kant van de opdrachtgever-instelling (klant-levering aan/uit) loopt deels samen met het lopende dashboard-werk; coördineren.
- Geen nieuwe randgevallen vooruitbouwen die niet redelijk te voorzien zijn (geen over-engineering).

## Mockup

`docs/mockups/oplever-mockups.html` (4 frames: alleen opdrachtgever, klant aan, klant-voorvertoning, verstuur-statussen). Open via Edge.
