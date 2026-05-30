# DESIGN - Oplevering met eindstaat-bewijs en handtekening

Datum: 2026-05-30
Status: ontwerp akkoord in brainstorm, klaar voor review en daarna implementatieplan
Sessie-context: volgt op 2A.9 (offline). Nieuwe functie, geen vervanging van bestaande flow.

## Aanleiding

De app legt bij een klus nu alleen schades en manco's vast (meldingen met foto's). Wat
ontbreekt is het vastleggen van de **eindstaat** bij oplevering: bewijs van hoe de keuken,
het keukenblad en de apparatuur erbij stonden op het moment van opleveren. Dat is een
referentiepunt en, bij een eventueel conflict, bewijs om je recht te halen. Daarnaast is
een (optionele) klant-handtekening gewenst.

## Kernbeslissingen uit de brainstorm

1. **Eén oplever-flow voor alle opdrachten**, met optionele stappen. Geen splitsing
   montage versus service in de flow. De monteur bepaalt vanzelf wat hij vastlegt.
2. **Bewijs-footage = foto's én video**, beide vanaf het begin.
3. **Eindstaat-bewijs is zacht verplicht**: minstens één foto of video voor je kunt
   versturen, met een "toch doorgaan?"-waarschuwing als het leeg is. Video zelf blijft
   optioneel.
4. **Handtekening is een overslaanbare stap.** Geen instellingen-scherm; iedereen heeft
   per oplevering de keuze.
5. **Rapport gaat naar de keukenzaak.**
6. **De keukenzaak hoort bij de opdracht, niet bij de app of de deploy.** De app is
   monteur-gericht en multi-opdrachtgever: een monteur voert zelf mail of PDF in voor elke
   opdrachtgever (bekend of onbekend), de parser haalt de zaaknaam eruit, de monteur kan
   corrigeren.
7. **"Werkbak" wordt overal "Werkpool".** De werkpool-kop krijgt de neutrale naam
   "Werkpool" in plaats van het hardcoded "KSV".

## Scope

### Wat erin zit
- Korte geleide oplever-flow vanaf opdracht-detail.
- Eindstaat vastleggen: foto's (zacht verplicht) + optionele video.
- Uitkomst kiezen: `Afgerond` of `Nog openstaande punten`.
- Optionele klant-handtekening (overslaanbaar).
- Oplever-rapport (PDF) met uitkomst, foto's, videolink, handtekening en openstaande
  punten, gemaild naar de zaak.
- Keukenzaak per opdracht (parser-veld, handmatig corrigeerbaar), gebruikt in het rapport.
- Hernoeming werkbak -> werkpool.

### Wat er NIET in zit (YAGNI / later)
- Volledige multi-zaak-registratie met per-zaak mailadressen en logo's.
- Per-opdracht ontvanger-mailadres fijn afstellen (haak ligt klaar, niet afgebouwd).
- Parser fijn afstellen voor de beste zaak-keuze en uitleg bij onbekende opdrachtgevers
  (komt later, de seam ligt er).
- Video-bewaarbeleid / opruimen / goedkopere opslag.
- Geschiedenis van meerdere opleveringen per opdracht (1:1 nu; tabel maakt het later
  triviaal).
- Offline opleveren (blijft online-only, zie 2A.9).

## De oplever-flow

Vanaf opdracht-detail: knop **"Oplevering starten"** (vervangt de losse "Opleveren"-knop)
leidt naar een kort geleid scherm, voor elke opdracht hetzelfde:

1. **Eindresultaat vastleggen**
   - Foto's maken (hergebruik bestaande foto-pijplijn: compressie + upload).
   - Video optioneel toevoegen (zie video-aanpak).
   - Uitkomst kiezen: `Afgerond` of `Nog openstaande punten`.
   - Zacht verplicht: zonder foto of video een waarschuwing "Geen bewijs vastgelegd, toch
     doorgaan?".
2. **Handtekening (overslaanbaar)**
   - Klant tekent op het scherm, of "Overslaan".
3. **Versturen**
   - Rapport-PDF maken, naar de zaak mailen, opdracht op `opgeleverd` zetten.

De meldingen (schades/manco's) die tijdens de klus zijn gemaakt blijven los staan en
vormen bij uitkomst "Nog openstaande punten" het lijstje in het rapport.

## Datamodel

Nieuwe, afgebakende tabel zodat de toch al dubbel belaste `meldingen`-tabel niet verder
vervuilt.

```
opleveringen
  id                  uuid, pk
  created_at          timestamptz
  opdracht_id         uuid  -> meldingen(id), on delete cascade
  uitkomst            text  ('afgerond' | 'openstaande_punten')
  eindstaat_foto_urls text[]            -- bewijs-foto's
  video_url           text, nullable    -- link naar opgeslagen video (null = geen)
  handtekening_url    text, nullable    -- null = overgeslagen
  rapport_url         text, nullable    -- de gegenereerde PDF
  user_id             uuid, nullable    -- toekomstvast: wie leverde op
```

Uitbreiding op de opdracht-rij (`meldingen`, de rij met `opdracht_id IS NULL`):
```
  keukenzaak  text, nullable   -- zaaknaam van deze opdracht (parser + handmatig te corrigeren)
```

Gedrag:
- **Eén oplevering per opdracht.** "Opnieuw opleveren" werkt de bestaande rij bij en maakt
  een nieuw rapport. Foto's en video blijven in opslag.
- De opdracht-rij houdt zijn bestaande status (`opdracht_status` open/opgeleverd,
  `opgeleverd_at`), zodat de werkpool ongewijzigd blijft werken. Bij versturen op
  `opgeleverd` zetten.
- **Concept-opslag**: zodra foto's of video worden toegevoegd, wordt de oplevering meteen
  als concept opgeslagen en aan de opdracht gekoppeld (hervatten mogelijk, geen zwevende
  video's). "Versturen" is de afrondende actie.
- RLS/grants in dezelfde lijn als de bestaande tabellen (demo: RLS uit; `user_id`
  toekomstvast, nu zonder logica).

## Video-aanpak

- **Opnemen**: file-input met `accept="video/*"` en camera-capture. De telefoon filmt en
  comprimeert zelf (h.264). Eén video per oplevering, vervangbaar. Geen hercompressie of
  bewerking in de browser.
- **Omvang**: zachte begrenzing met hint ("houd het kort, 30-60 seconden is genoeg") en een
  waarschuwing bij erg grote bestanden. Geen harde blokkade.
- **Uploaden**: rechtstreeks vanuit de browser naar Supabase Storage via de bestaande
  browser-client (`supabase-browser.ts`), naar een nieuwe bucket `oplever-videos`. Bewust
  NIET via de Next-API-route, om de Vercel payload-limiet (~4.5 MB) en time-outs te
  vermijden. De teruggekomen URL wordt opgeslagen in `opleveringen.video_url`.
- **Meegaan met de oplevering**: video past niet in een PDF. Het rapport sluit de foto's in
  en zet de video als duidelijke link ("Video van de oplevering: ..."). De mail naar de
  zaak heeft de PDF als bijlage en dezelfde videolink in de tekst.
- **Offline**: de hele oplever-flow vereist netwerk (consistent met de huidige
  oplever-knop). Geen video in de offline-wachtrij; offline-ontwerp 2A.9 blijft ongemoeid.
- **Bekend aandachtspunt (niet nu bouwen)**: video vreet opslag en bandbreedte. Bij echt
  gebruik een bewaar-/opruimbeleid of goedkopere opslag overwegen.

## Rapport en keukenzaak-identiteit

Het rapport (`rapport.ts`) wordt oplevering-bewust en bevat:
- Kop: **zaaknaam uit de opdracht** (`keukenzaak`), niet meer hardcoded "Keukenstudio
  Voorschoten". Klant, referentie, opleverdatum.
- Uitkomst prominent: `Afgerond` of `Nog openstaande punten`.
- Eindstaat-foto's ingesloten (bestaande foto-insluiting hergebruikt).
- Video als duidelijke link.
- Handtekening als ingesloten afbeelding, of "Niet ondertekend".
- Openstaande punten: de meldingen zoals het rapport ze nu al toont.

Keukenzaak-identiteit:
- **Per opdracht**, gevuld door de parser (leest de zaaknaam uit de documentkop) en
  handmatig te corrigeren door de monteur in `OpdrachtAanmaken` / opdracht-detail.
- Dit maakt de app bruikbaar voor elke monteur en elke opdrachtgever, bekend of onbekend,
  via het bestaande zelf-invoeren-pad (mail/PDF plakken of uploaden).
- **Mailadres van de zaak**: nu nog de ingestelde ontvanger; het ontwerp houdt de haak open
  dat de monteur bij het versturen de ontvanger kan bevestigen of invullen. Niet nu
  afgebouwd.

Labels:
- Werkpool-kop: neutrale naam "Werkpool" (geen "KSV").
- Opdracht-detail toont de `keukenzaak` van die opdracht (dynamisch) in plaats van hardcoded
  "KSV".

## Foutafhandeling en offline

- **Voortgang bewaren**: oplevering als concept opgeslagen zodra bewijs wordt toegevoegd;
  hervatten na weglopen/crash, geen zwevende video's.
- **Versturen-pijplijn, veilige volgorde** (zoals nu): rapport maken -> PDF uploaden ->
  mailen -> pas dan opdracht op `opgeleverd`. Mislukt de mail, dan blijft de opdracht open
  en kun je opnieuw versturen zonder iets opnieuw vast te leggen. Elke stap een eigen,
  leesbare foutmelding.
- **Video-upload mislukt**: duidelijke melding + opnieuw-knop. Blokkeert het versturen niet
  (video is optioneel).
- **Handtekening mislukt**: niet fataal (overslaanbaar).
- **Opdracht ondertussen verwijderd**: 404, nette melding, terug naar de werkpool.
- **Opnieuw opleveren**: werkt de bestaande oplevering bij, nieuw rapport, bewijs blijft.
- **Offline**: "Oplevering starten" grijs met label "Netwerk nodig", zoals de huidige
  oplever-knop in 2A.9.

## Testen (TDD-lijn, vitest)

Met automatische tests:
- **Db-laag**: oplevering aanmaken als concept, bijwerken, ophalen per opdracht, afronden;
  keukenzaak-veld op de opdracht. Via het mock-server-patroon van `db.test.ts`.
- **Rapport-generator**: uitkomst, eindstaat-foto's, videolink, handtekening (of "Niet
  ondertekend"), openstaande punten en de zaaknaam komen in de PDF. Uitbreiding op
  `rapport.test.ts`.
- **Parser**: `keukenzaak` wordt uit de documentkop gehaald. Uitbreiding op de parser-tests.
- **Mail**: zaaknaam, ontvanger en videolink in de mail. Met gemockte Resend.
- **Versturen-route**: happy path geeft `opgeleverd`, mail-voor-markeren-volgorde,
  foutstatussen (404, mail mislukt, markeren mislukt). Uitbreiding op `route.test.ts`.
- **Beslissingslogica als pure functies**: "mag je versturen?" (zacht verplicht), handtekening
  overslaan. Los van de UI.

Dun gehouden en handmatig getest (browser-only):
- Video-opname en directe upload naar Supabase Storage.
- Handtekening tekenen op canvas + omzetten naar afbeelding.
- Offline-grijs-staat van "Oplevering starten".

## Open punten / latere verfijningen

- Parser slim laten kiezen en uitleggen bij onbekende opdrachtgevers.
- Per-opdracht ontvanger-mailadres afbouwen.
- Video-bewaarbeleid.
- Eventueel geschiedenis van opleveringen per opdracht.
