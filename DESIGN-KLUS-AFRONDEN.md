# DESIGN - "Klus afronden" flow (afgerond melden, eindoordeel zaak, opschoning)

Datum: 2026-06-13
Status: ontwerp akkoord in brainstorm (flow akkoord via mockup), klaar voor review en daarna implementatieplan
Mockup: `MOCKUP-afronden-flow.html` (schets van de flow; de echte bouw gebruikt de bestaande app-onderdelen, dus de uiteindelijke look = de app zelf).

## Aanleiding

Een monteur kan een klus nu alleen "klaar" krijgen via een volledige oplevering (rapport + handtekening) of via terugmelden (niet doorgegaan). Voor een service-klus is dat te zwaar: in de praktijk mailt de monteur dan los "dit en dat gedaan, klaar", als hij het niet vergeet. De zaak heeft daardoor geen zekerheid of een klus af is. Daarnaast staan er straks meerdere "klaar"-knoppen los naast elkaar (overwhelm) en is de "naar wie versturen"-sectie onnodig rommelig.

## Kernbeslissingen uit de brainstorm

1. **Eén knop "Klus afronden"** op het opdracht-scherm, die een keuzescherm opent met drie heldere wegen, in plaats van losse knoppen die om aandacht vechten:
   - **Klaar, snel** (afgerond) - voor service / kleine klus.
   - **Klaar + rapport** (volledig opleveren) - bestaande flow, voor keuken/montage of als de opdrachtgever het vraagt.
   - **Niet doorgegaan** (terugmelden) - bestaande flow.
2. **"Afgerond melden" is de lichte, snelle weg.** Opdracht aanklikken, optioneel foto/video en/of notitie, of helemaal niks, en melden. Geeft de zaak zekerheid, vervangt het vergeten mailtje.
3. **Eén subtiel vervolg-vinkje** in het afgerond-scherm: "Er komt nog een vervolg (bijv. onderdelen die later binnenkomen)". Standaard uit.
   - Uit = helemaal klaar.
   - Aan = werk gedaan, maar er moet nog iets gebeuren; de klus gaat naar het dashboard als "nog te plannen" (kan bij een andere monteur landen), met alle info bewaard.
4. **De zaak heeft het eindoordeel.** Bij een afgeronde klus ziet de zaak op het dashboard twee acties: **Akkoord, klaar** (definitief afgehandeld) of **Toch nog open** (heropenen -> nog te plannen). De zaak weet soms iets wat de monteur niet weet.
5. **"Afgerond" en "Opleveren" zijn twee aparte keuzes**, geen route ertussen. Wie afgerond kiest, levert niet ook nog op. Wie het netjes wil (handtekening, rapport) kiest opleveren.
6. **Eén onderliggend concept "terug naar te plannen"**, gevoed door drie dingen: het vervolg-vinkje, een terugmelding die opnieuw gepland moet worden, en heropenen achteraf. Eén mechanisme, niet drie losse.
7. **Versturen opgeschoond:** de twee blokken "naar de zaak / naar de klant" in de oplever-flow worden één knop "Versturen" die de keuzes opent (zelfde principe als de afrond-knop).
8. **Bouwen met de bestaande onderdelen.** Echte header, echte knoppen (antraciet met oranje streepje voor primair, groen/rood omrand voor akkoord/afwijzen), echte Lucide-iconen, echt lettertype. De mockup is alleen een flow-schets.

## De levensloop van een opdracht (met de nieuwe statussen)

| Status | Hoe je er komt (actie, wie) | Waar zichtbaar |
|---|---|---|
| Binnen | aangemaakt of ingeschoten (kantoor of monteur) | dashboard + werkpool |
| Gepland | op het planbord gezet (kantoor) | dashboard + werkpool |
| Bevestigd | monteur bevestigt ontvangst | dashboard + werkpool |
| **Afgerond** (nieuw) | monteur kiest "Klaar, snel"; vervolg-vinkje UIT | dashboard (status "Afgerond"), monteur-geschiedenis |
| **Afgerond + vervolg** (nieuw) | monteur kiest "Klaar, snel"; vervolg-vinkje AAN | dashboard als "nog te plannen", info bewaard |
| Opgeleverd | volledige oplevering + rapport naar zaak (monteur) | dashboard (status "Opgeleverd") |
| Teruggemeld | niet doorgegaan (monteur, alleen ingeschoten klussen) | dashboard, meestal opnieuw te plannen |
| Geannuleerd | kantoor/opdrachtgever annuleert | dashboard |

**Eindoordeel zaak op een "Afgerond" klus:**
- **Akkoord, klaar** -> definitief afgehandeld (eindpunt).
- **Toch nog open** -> heropenen -> terug naar "nog te plannen" (kan andere monteur).

**Heropenen** (door zaak of monteur, achteraf) en het **vervolg-vinkje** en een **terugmelding** komen allemaal uit op dezelfde bestemming: **nog te plannen** op het dashboard, met de volledige historie (meldingen, foto's, notitie) bewaard, zodat de volgende monteur met context verder kan.

## De schermen (en welke bestaande onderdelen we hergebruiken)

1. **Opdracht-scherm monteur** (`/opdracht/[id]`): de losse eind-acties verdwijnen; onderaan één primaire knop **"Klus afronden"** (stijl: `OpleverKnop`/`BevestigOntvangstKnop` - antraciet met oranje streepje).
2. **Keuzescherm "Klus afronden"** (nieuw): drie keuzes (Klaar snel / Klaar + rapport / Niet doorgegaan), elk met een korte uitleg. "Klaar + rapport" en "Niet doorgegaan" leiden naar de bestaande flows.
3. **Afgerond melden** (nieuw): foto/video via de bestaande `FotoMaken` / `VideoOpnemen`, een optionele notitie (zoals de oplever-opmerking), en het vervolg-vinkje. Primaire knop "Afgerond melden".
4. **Versturen opgeschoond** (oplever-flow): één "Versturen"-knop die de keuzes "naar de zaak" / "ook naar de klant" opent, in plaats van twee blokken.
5. **Dashboard van de zaak** (`/dashboard`, `/dashboard/opdracht/[id]`): nieuwe status "Afgerond" op de kaart (zoals de bestaande `OpdrachtStatusBadge`), plus de twee oordeel-knoppen (Akkoord klaar = groen omrand, Toch nog open = rood omrand, in de stijl van de bestaande Akkoord/Niet-akkoord-knoppen).

## Datamodel (nieuw)

In de `meldingen`-tabel (waar een opdracht een rij is), analoog aan `teruggemeld_at`:
- `afgerond_door_monteur_at timestamptz` - wanneer de monteur "afgerond" meldde.
- `afgerond_toelichting text` - optionele notitie.
- `afgerond_vervolg_nodig boolean` - het vervolg-vinkje (true = naar "nog te plannen").
- (foto/video hergebruiken het bestaande oplevering/foto-mechanisme; precieze opslag bepalen we in het plan.)

Statusafleiding (`opdracht-status.ts`): een nieuwe getoonde status "Afgerond" wanneer `afgerond_door_monteur_at` gevuld is en de klus niet "opgeleverd"/"geannuleerd" is. Bij vervolg-vinkje AAN landt de klus in de "te plannen"-stroom in plaats van als afgeronde eindstatus.

## Acties / API (nieuw, analoog aan terugmelden)

- `POST /api/opdrachten/[id]/afgerond` - zet de afgerond-velden, logt de actie, stuurt best-effort mail naar de zaak (`RAPPORT_EMAIL`). Bij vervolg-vinkje: zet de klus in de "te plannen"-stroom.
- `POST /api/opdrachten/[id]/heropenen` - vanuit "Afgerond" terug naar "nog te plannen" (zaak of monteur), historie behouden.
- Bestaande endpoints (`/oplevering`, `/rapport`, `/terugmelden`, `/plannen`) blijven; ze worden bereikt via het nieuwe keuzescherm en de opgeschoonde versturen-knop.

## Notificaties

- **Afgerond melden** -> best-effort mail naar de zaak (`RAPPORT_EMAIL`), zoals terugmelden. Geen aparte SMS nodig in v1.
- **Heropenen** -> de klus verschijnt als "nog te plannen" op het dashboard; kantoor plant opnieuw. (Of de oorspronkelijke monteur een seintje krijgt, bepalen we in het plan; v1 mag minimaal.)

## Buiten scope (nu niet)

- Fijnslijpen van alle teksten/labels (gebeurt achteraf; voorlopige labels uit de mockup).
- SMS naar de opdrachtgever bij afgerond.
- Een aparte "afgerond"-status forceren op basis van klus-type (de app biedt alle wegen; de monteur kiest).

## Testen (volgens projectlijn)

- Unit: statusafleiding (afgerond vs opgeleverd vs te plannen), het vervolg-vinkje-effect.
- E2e: monteur meldt afgerond (zonder en met vervolg-vinkje); zaak ziet "Afgerond" + oordeelt; heropenen zet de klus terug naar "te plannen" met historie; afscherming per rol.
- Toestandsmatrix vooraf invullen (rol x status x actie) voordat we bouwen.

## Aanpak en oplevering

Bouwen met de bestaande app-onderdelen, zodat de look exact de app is. Vóór definitief: een screenshot van de echte schermen (zoals bij de handleiding) voor akkoord. Daarna test Reinier het met een paar monteurs; fijnafstelling komt uit de praktijk.
