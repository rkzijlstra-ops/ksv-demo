# Ontwerp: melding-flow herinrichting

Datum: 2026-06-26
Status: ontwerp, wacht op review Rein
Volgt op: [oplever-snelafsluiten-herinrichting](2026-06-23-oplever-snelafsluiten-herinrichting-design.md)

## Aanleiding

De huidige melding-flow voelt voor een nieuwe monteur onduidelijk, en "snel afsluiten" vraagt opnieuw om foto's en video terwijl die al in de meldingen staan. Doel: de flow schoon en vanzelfsprekend maken voor een nieuwe gebruiker, en de dubbeling bij snel afsluiten weghalen. De inhoud en het uiterlijk van bestaande blokken blijven zoveel mogelijk gelijk; er wordt hergebruikt, niet opnieuw verzonnen.

## Afgesproken begrippen

- **Melding** = een beschadiging of manco, per stuk gemeld met foto/tekst (en nieuw: video). De opdrachtgever moet er actie op nemen (bijv. opnieuw bestellen).
- **Spoed** = een melding die tijdkritisch is: de opdrachtgever kan er nog op acteren binnen de klus (kraan maandag gemist, dinsdag binnen, alsnog gemonteerd). Gaat meteen los naar kantoor.
- **Opleveren / afsluiten** = de klus afronden met rapport, en bij de volledige variant foto/video van het project en handtekening + akkoord. Iets anders dan een melding.

## Kleurtaal (bestaand, niet uitbreiden)

Volgt `design-system.md` / `globals.css`:
- Rood = spoed (driehoek-icoon + label).
- Anthraciet = primaire knop (zowel melden als afsluiten).
- Oranje = merk-accent (streep onder knoppen, header, open-staat van inklap).
- Groen = opgeleverd/verzonden (eind-status, niet voor melden gebruiken).

Geen nieuwe kleurbetekenissen.

## Wat verandert er

### 1. Detailpagina (`/opdracht/[id]`)

- Sectie-titel "Meldingen (N)" wordt **"Meldingen tijdens de klus"**, met subtekst "Iets kapot of ontbrekend? Meld het, per stuk."
- De melding-knop krijgt het label **"Beschadiging of manco melden"** (was "Melding toevoegen"). **Gedrag ongewijzigd**: navigeert naar de bestaande aparte pagina `/opdracht/[id]/melding`. (Inline-openklappen is overwogen en bewust verworpen: functioneel gelijk, een volledige invoertaak past beter op een eigen scherm, en het kost onnodige herbouw.)
- Documenten blijven boven de meldingen staan (PDF's worden het vaakst geraadpleegd). Volgorde onder elkaar, ongewijzigd.
- Afsluiten verhuist van de vaste onderbalk naar een **gelabeld blok in de pagina** onder het kopje **"Aan het einde van de klus"** (ActieKaart-stijl, pijl naar rechts, leidt naar de afsluit-keuze). Zo leest de pagina van boven naar onder het verhaal van de klus: tijdens de klus melden, aan het einde afsluiten. De vaste onderbalk houdt alleen **"Terug naar kluspool"**.
- Meldingenlijst: alleen **"Spoed"** als label (rood + driehoek). Een gewone melding krijgt geen label, alleen tekst + foto/video-telling. ("Achteraf"-label vervalt: voegde niets toe en was vaag.)

### 2. Melding-formulier (`/opdracht/[id]/melding` en `.../melding/[meldingId]`)

- **Video toevoegen** (nieuw; nu alleen foto's). Hergebruikt de bestaande `VideoMaken`-component uit de oplever-flow. Dit is het grootste onderdeel: raakt formulier, opslag/datamodel (een `video_url` per melding) en de rapport-PDF (melding-sectie moet de video-link tonen, zoals de oplevering dat al doet).
- Labels en spoed-uitleg blijven zoals nu, met de duidelijkere koppen.

### 3. Snel afsluiten (`/opdracht/[id]/afronden/snel`) — de echte herinrichting

Nu gebruikt snel afsluiten dezelfde `OpleverFlow` met `verkort=true`, inclusief het blok "De oplevering" (foto/video/opmerking) en het interne "Voor de opdrachtgever"-blok. Dat is de dubbeling. Nieuw:

- **Weg**: het blok "De oplevering" (foto/video/opmerking) in de verkort-modus.
- **Weg**: het interne "Voor de opdrachtgever"-blok (foto/video/notitie) in de verkort-modus. Dat hoort thuis in de volledige oplevering.
- **Nieuw**: blok **"Dit gaat mee in het rapport"** — een read-only overzicht van de meldingen van deze klus, getoond in de bestaande meldingen-stijl (met foto/video-telling, alleen spoed gelabeld). Zo ziet de monteur wat de opdrachtgever krijgt.
- **Begeleidend bericht** — één tekstveld (typen of inspreken) voor een korte toelichting. Hergebruikt het bestaande `opmerking`-veld; geen nieuw datamodel.
- **"Klus is niet af"** (vervolg-vinkje) — blijft ongewijzigd.
- **Versturen** — het **bestaande versturen-blok uit `OpleverFlow` ongewijzigd** overnemen: ontvanger-keuze (`OntvangerKeuze`), klant/opdrachtgever/later, verzendgeschiedenis. Naar de klant versturen blijft mogelijk.
- **Ontsnap-knop** — een kaart "Toch foto, video of handtekening? → volledige oplevering" die doorlinkt naar `/opdracht/[id]/opleveren`. Geen doodlopend pad.

### 4. Volledige oplevering (`/opdracht/[id]/opleveren`)

Ongewijzigd. Daar blijven algemene bevindingen, overzichtsfoto's en video van het project, en handtekening + akkoord.

## Hergebruik

- `MeldingForm` (uitgebreid met video).
- `OpleverFlow`: het versturen-deel en de vervolg-checkbox blijven; de verkort-modus wordt uitgekleed (oplever- en intern-blok eruit) en aangevuld met meldingen-overzicht + ontsnap-knop.
- Bestaande componenten: `VideoMaken`, `OpleverFotos`/`FotoMaken`, `SpraakOpname`, `OntvangerKeuze`, `ActieKaart`, de meldingen-lijstweergave, `MeldingStaatBadge` (aangepast naar spoed-only).

## Toestanden en ketens (vooraf invullen, vóór de bouw)

- Melding: nieuw vs bewerken; spoed vs niet-spoed; spoed verzonden of niet (`spoed_verzonden_at`); met vs zonder video; online vs offline (bestaande queue-route).
- Snel afsluiten met **0 meldingen**: bij versturen een bevestiging tonen, **"Versturen zonder melding?"**, zodat de monteur niet per ongeluk een leeg rapport stuurt. Bevestigt hij, dan gaat het door (rapport met alleen het begeleidend bericht).
- Snel afsluiten + "klus is niet af": keten terug naar kantoor + "vervolg plannen"-label (bestaand gedrag, niet breken).
- Snel afsluiten naar klant én opdrachtgever, los in tijd (bestaand versturen-gedrag).
- Verkorte PDF: moet de meldingen (incl. nieuwe video-link) en het begeleidend bericht bevatten. Verifiëren dat de huidige verkort-variant de meldingen al meeneemt.

## Testen (4 lagen, conform werkwijze)

- Unit: PDF-melding-sectie met video; verkort-rapport bevat meldingen + begeleidend bericht.
- Component/integratie: snel-afsluiten toont meldingen-overzicht en géén media-invoer; ontsnap-knop linkt naar opleveren.
- E2e: melding met video toevoegen; snel afsluiten end-to-end (overzicht → bericht → versturen naar opdrachtgever en naar klant); detailpagina-koppen en afsluit-blok.
- Migratie test-DB én prod voor het `video_url`-veld op meldingen (drift voorkomen).

## Coördinatie met parallel werk (mail-aflevering)

Er loopt op een andere terminal het plan `PLAN-MAIL-AFLEVERING.md` (betrouwbare oplever-mail + monteur-onboarding). Dat raakt deels dezelfde bestanden:

- `src/app/opdracht/[id]/page.tsx` (detailpagina): mail-plan voegt `VerzendInfoBlok` toe; melding-flow herstructureert de pagina. Conflict-risico.
- Rapport-route + versturen: mail-plan wijzigt de backend (reply-to, adres-override) en voegt een los verzend-infoblok toe. Melding-flow hergebruikt het bestaande `OpleverFlow`-versturen-blok ongewijzigd.

**Volgorde (serieel, niet parallel mergen):** 1) oplever-herinrichting → master, 2) mail-aflevering → master, 3) melding-flow → master als laatste, op een verse worktree vanaf de dan-bijgewerkte master. Reden: gedeeld test-DB (één keuring tegelijk), gedeelde bestanden, STOP-poort per stuk. Bij de bouw van melding-flow eerst checken hoe `VerzendInfoBlok` op de detailpagina staat en of de rapport-route backward-compatible bleef.

## Buiten scope

- **Onderzoeksvraag (apart):** hoe houden we PDF's (tekeningen, bestellijst) op de telefoon snel bij de hand tijdens een klus, zodat de monteur ze niet steeds opnieuw hoeft te openen? Aparte ronde.

## Mockups

- `docs/mockups/melding-detailpagina.html` — detailpagina, PDF boven, melden eronder, app-kleuren.
- `docs/mockups/melding-aan-het-eind.html` — afsluiten als "Aan het eind"-blok vs vaste balk.
- `docs/mockups/snel-afsluiten.html` — de flow detail → keuze → nieuw snel-scherm.
- `docs/mockups/melding-inklap.html` — inklap-variant (verworpen, ter referentie).
