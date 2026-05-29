# DESIGN Sessie 2A.7 - Melding-flow herontwerp + kleur-staat-taal

Datum: 2026-05-29
Status: goedgekeurd in gesprek (Rein), klaar voor plan + bouw
Basis: live-test-feedback na 2A.6. Vervangt de rood/geel-urgentiekeuze.

## Aanleiding (feedback Rein)
De rood/geel-keuze (DIRECT/ACHTERAF) en "spoedmelding" waren vaag en te prominent. Werkelijkheid:
de monteur zet tijdens de klus meldingen klaar en levert 's avonds op (alles in één rapport + mail).
Sommige monteurs willen niet meteen versturen omdat versturen "ik ben klaar" signaleert. Spoed is
de uitzondering.

## Model (kern)
- Elke melding wordt standaard **klaargezet in de opdracht** (wachtrij). Geen urgentiekeuze meer.
- Aan het eind lever je een **opdracht** op: alle meldingen samen in één opleverrapport + mail.
- Meerdere klussen op een dag = meerdere opdrachten die je 's avonds één voor één oplevert. Geen
  aparte "alles tegelijk"-knop nu.
- De melding-status "concept/in rapport" vervalt. Een melding is gewoon "klaargezet". De echte
  staat zit op de **opdracht** (open / opgeleverd) plus de **spoed**-vlag per melding.

## Spoed (uitzondering)
- In het melding-scherm een **Spoed-schakelaar** (standaard uit) met een **"?"** dat kort uitlegt:
  "Spoed = nu meteen los naar kantoor, buiten de oplevering om. Alleen als het niet kan wachten."
  (Tap-to-expand inline tekst, geen hover-tooltip, want mobiel.)
- Staat Spoed aan, dan wordt de hoofdknop **"Nu als spoed versturen"** (rood). Bij indrukken eerst
  een **bevestigings-popup**. Twee bewuste handelingen (schakelaar aan + bevestigen) voorkomen
  per-ongeluk versturen.
- Bij versturen gaat er **meteen een spoed-mail** de deur uit (in de demo naar het eigen adres,
  via de bestaande Resend). Geen PDF, wel klant/ref + de meldingtekst + foto-links.
- Een als-spoed-verstuurde melding blijft in de opdracht en komt 's avonds **ook in het
  opleverrapport**, met label **"al als spoed verstuurd op [tijd]"**. Rapport blijft compleet.
- Mislukt de spoed-mail: de melding is wél opgeslagen, maar niet als verstuurd gemarkeerd; er komt
  een "spoed opnieuw versturen"-mogelijkheid (zelfde endpoint).

## Melding-scherm volgorde
1. **Foto maken (bovenaan)** 2. tekst typen/inspreken 3. Spoed-schakelaar (+"?") 4. knop.
(Foto eerst is de natuurlijke volgorde tijdens het werk.)

## Kleur-staat-taal (overal consistent, kleur + icoon + label)
| Kleur | Token | Betekenis | Toepassing |
|---|---|---|---|
| Rood | `urgent-rood` | spoed / let op | spoed-knop, "Spoed verstuurd"-label, spoed-melding |
| Amber | `urgent-geel` | open, wacht op oplevering | "X open meldingen" op kaart, melding in wachtrij |
| Groen | `success` | opgeleverd / klaar | opgeleverde opdracht, "opgeleverd op…" |
| Blauw | `primary` | neutrale hoofdactie | "Toevoegen aan rapport", "Melding toevoegen" |

Nooit kleur alleen: altijd kleur + Lucide-icoon + tekstlabel (toegankelijk, leesbaar in fel licht).

## Werkbak (opdracht-overzicht)
- Open opdracht met meldingen: **amber "X open meldingen"** op de kaart.
- Opdracht met minstens één spoed-melding: **rode spoed-markering** op de kaart.
- Opgeleverde opdracht: **groen "Opgeleverd"** (staat al in history).

## Datamodel
Migratie `schema-2a7-spoed.sql`:
- `meldingen.spoed boolean not null default false`
- `meldingen.spoed_verzonden_at timestamptz` (tijdstip van de solo spoed-mail; null = nog niet)
- `urgentie` (rood/geel) blijft als kolom bestaan voor oude rijen, maar wordt in de nieuwe UI/logica
  niet meer gebruikt (geen destructieve migratie).

## Componenten / interfaces
- **db**: `MonteurMeldingInput`/`UpdateMeldingInput` gebruiken `spoed: boolean` i.p.v. `urgentie`.
  Nieuw: `markeerSpoedVerzonden(id)`. Nieuw: `getMeldingTellingen()` -> per opdracht_id
  `{ aantal, heeftSpoed }`. `Melding`-type krijgt `spoed`, `spoed_verzonden_at`.
- **lib/mail**: nieuw `verstuurSpoedMelding({ naar, opdracht, melding })` (tekst-mail, geen PDF).
- **lib/rapport**: per melding spoed-label tonen + "al als spoed verstuurd op [tijd]".
- **API**: `POST /api/meldingen` en `PATCH /api/meldingen/[id]` accepteren `spoed` i.p.v. urgentie.
  Nieuw: `POST /api/meldingen/[id]/spoed-versturen` (haalt melding + opdracht, mailt, markeert;
  404 onbekend, 502 bij mailfout zonder markeren). Dient ook als retry.
- **UI**: `MeldingForm` (foto boven, Spoed-schakelaar + "?", knop-gedrag + bevestiging, flow
  create -> (indien spoed) spoed-versturen). `OpdrachtCard` (amber open-teller, rode spoed-markering).
  `opdracht/[id]` melding-weergave met kleur-staat. Nieuw klein badge-config voor staat-kleuren.

## Flow spoed (scenario Rein)
1. Monteur ziet schade -> melding maken: foto + tekst -> "Toevoegen aan rapport" (amber, in wachtrij).
2. Volgende is spoed -> Spoed aan -> knop wordt rood "Nu als spoed versturen" -> bevestigen ->
   melding opgeslagen + spoed-mail meteen verstuurd (spoed_verzonden_at gezet).
3. Nog een normale melding -> wachtrij.
4. 's Avonds opdracht opleveren -> opleverrapport met ALLE meldingen; de spoed-melding staat ertussen
   met "al als spoed verstuurd op [tijd]". Opdracht wordt groen/opgeleverd.

## Edge cases
- Spoed-mail mislukt -> melding bestaat, niet gemarkeerd, retry mogelijk; geen stille fout.
- Opdracht opleveren met 0 meldingen -> bestaande waarschuwing blijft.
- Migratie nog niet gedraaid -> nieuwe kolommen ontbreken; Rein draait `schema-2a7-spoed.sql` eerst.
- Oude meldingen met urgentie rood/geel -> tonen als normale/open melding (urgentie wordt genegeerd).
