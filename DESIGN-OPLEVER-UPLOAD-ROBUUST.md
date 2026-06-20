# Design: oplever-foto-upload robuust (fase 1 "binnen de pagina")

Datum: 2026-06-19. Status: ontwerp, wacht op akkoord Rein.

## Aanleiding
De oplever-foto-upload is nu alles-of-niets per batch en hangt aan de levensduur van de
pagina-component. Verlaat je de pagina (in-app navigatie, verversen, app-switch met tab-kill) of faalt
er één foto in de batch, dan valt de hele batch weg, zonder waarschuwing en met weesbestanden in
storage. Zie de doorlichting in dit gesprek. Doel: geen vastlopers, geen dataverlies, en zichtbare
voortgang.

## Scope (fase 1 van 2)
Binnen de pagina-component oplossen:
1. Per foto committen zodra hij klaar is (staat + concept-save), in plaats van pas na de hele batch.
2. Zichtbare voortgang: teller "x van n" en thumbnails die 1-voor-1 verschijnen, met per-item status.
3. Per-item foutafhandeling met "opnieuw", in plaats van de hele batch laten vallen.
4. Verlaat-waarschuwing aanzetten zolang er foto's uploaden (nu alleen video/versturen).
5. In-app navigatie-bevestiging bij lopende uploads (Terug, Rapport voorvertonen).
6. AbortController per item, zodat verlaten/annuleren geen halve upload als weesbestand achterlaat.

## Beslist (2026-06-19)
- **Foto en video na elkaar (serialiseren).** Start je een video terwijl foto's nog uploaden, dan wacht
  de video automatisch tot de foto's klaar zijn, met een nette melding. Andersom idem. Minder kans op
  afbreken op slecht netwerk, duidelijker voor de monteur.
- **Weesbestanden gelijk meenemen** (niet doorschuiven naar fase 2, want fase 2 is niet besloten). Zie
  de aparte sectie hieronder.

## Expliciet NIET in fase 1 (bewust later)
- Service-worker met Background Sync / upload buiten de pagina (= fase 2 "volledig naadloos").
- Idempotentie-key tegen dubbele uploads (hoort bij fase 2, want retry-op-achtergrond introduceert dat).

## Weesbestanden opruimen
Een weesbestand = een object in storage waar geen oplevering-record meer naar verwijst. Bronnen: een
verwijderde/vervangen foto of video, en een afgebroken upload.

- **Structureel (fase 1, in scope):** een foto of video die je verwijdert of vervangt **tijdens de
  concept-fase (vóór enige verzending)** wordt ook uit storage gewist, best-effort, net zoals
  documentbeheer dat doet (`storage().verwijder...`, faalt stil zodat de UI-actie nooit blokkeert).
  Een afgebroken upload wordt geabort vóór de server klaar is, zodat er geen half object ontstaat.
- **Veilige regel:** zodra er een rapport verstuurd is (klant óf zaak), wissen we geen storage-objecten
  meer automatisch. De PDF gaat als bijlage mee, maar de foto-URLs worden ook in de web-voorvertoning en
  bij een herverzending gebruikt; een foto wissen na versturen zou die breken. Verwijderen na versturen
  haalt de foto dan alleen uit het concept, het object blijft staan (zeldzaam, bewust geaccepteerd).
- **Historische sweep (APART, nog te beslissen):** bestaande wezen uit het verleden wissen vergt een los
  script. Let op: de foto-bucket `meldingen-fotos` wordt gedeeld met de meldingen-foto's, dus de sweep
  moet referenties uit BEIDE bronnen (opleveringen + meldingen) meenemen, anders wis je echte foto's.
  Risicovol, hoort met een dry-run. Niet in deze bouwsessie tenzij Rein dat expliciet wil.

## Levenscyclus van één upload-item (nieuw intern model in FotoMaken)
`geselecteerd` -> `comprimeren` -> `uploaden` -> `klaar` (URL in concept) | `mislukt` -> (opnieuw) ; en `verwijderd` vanuit elke staat.

| Overgang | Data/concept | Monteur-UI | Opruiming/abort |
|---|---|---|---|
| geselecteerd -> comprimeren | nog niets opgeslagen | item in lijst, status "wachten", teller telt mee | n.v.t. |
| comprimeren -> uploaden | nog niets opgeslagen | item "uploaden", spinner op de tegel | AbortController aangemaakt |
| uploaden -> klaar | URL toegevoegd aan fotoUrls + concept-save (bestaande geserialiseerde keten) | thumbnail vervangt spinner, teller +1 | controller opgeruimd |
| uploaden -> mislukt | niets opgeslagen | tegel "mislukt" + knop "opnieuw" | controller opgeruimd |
| mislukt -> opnieuw (uploaden) | als boven bij succes | tegel terug naar "uploaden" | nieuwe controller |
| elke staat -> verwijderd | klaar-foto: uit fotoUrls + concept-save; storage-object wissen mits nog niet verstuurd | tegel weg | lopende upload: abort |
| video starten terwijl foto's nog uploaden | video wacht tot foto's klaar, dan automatisch starten | "video wacht op foto's…" melding | n.v.t. |

## Gebeurtenissen tijdens een lopende upload (de scenario's, gewenst gedrag na fix)
| Gebeurtenis | Gewenst gedrag | Dekt scenario |
|---|---|---|
| in-app navigatie (Terug / Rapport) | bevestiging vragen; klaar-foto's zijn al opgeslagen, alleen de lopende stopt | "naar andere pagina en terug" |
| verversen / tab sluiten | beforeunload-waarschuwing (zoals video) | "verversen" |
| app-switch, tab blijft leven | upload loopt door, bij terugkeer klaar | "andere app en terug" |
| app-switch, tab gekild | klaar-foto's overleven (in concept); alleen de lopende foto kwijt (fase-1-grens, fase 2 dicht dit) | "andere app, kill" |
| één foto faalt | alleen die tegel "mislukt" + opnieuw; rest blijft staan | "fout in batch" |
| typen/inspreken tijdens upload | werkt door, geen dataverlies (saves geserialiseerd, volledige snapshot) | "typen/spraak" |

## Behouden (niet breken)
- Geserialiseerde concept-saves (`opslaanChainRef`) met volledige snapshot. Per-foto commit haakt hierop.
- Server overschrijft `eindstaat_foto_urls`/`video_url` altijd; guard op handtekening/controle/intern/klant.
  Per-foto commit blijft de volledige fotoUrls-array sturen, dus veilig.
- `HydratieKlaar` in de upload-component (e2e-stabiliteit).
- Bestaande e2e `opleveren.spec.ts` (serialisatie-race) moet groen blijven.

## Nog te beslissen
1. **Historische weesbestand-sweep nu meenemen of apart?** (Zie sectie Weesbestanden.) Voorstel: nu alleen
   het structurele deel bouwen; de historische sweep apart en voorzichtig (gedeelde bucket, dry-run).

## Teststrategie
- **Unit (ik draai):** item-levenscyclus-reducer/helper (statusovergangen, teller, opnieuw, abort-state)
  puur testen, los van de DOM; pad-uit-URL-helper; de "mag-ik-wissen"-regel (alleen vóór versturen).
- **Route-test (ik draai):** DELETE-route voor een oplever-foto (rol-check: monteur mag; storage best-effort).
- **E2e (Rein draait):** 1) meerdere foto's tegelijk -> verschijnen 1-voor-1, teller klopt, concept bevat
  alle URLs. 2) per-item fout -> één tegel mislukt, rest blijft, "opnieuw" werkt. 3) navigatie-bevestiging
  verschijnt bij lopende upload. 4) video gestart tijdens foto-upload wacht en start daarna. 5) foto
  verwijderen tijdens concept -> tegel weg + uit concept. Bestaande `opleveren.spec` blijft groen.
- Registers `TOESTANDEN.md` (rij "oplevering vastleggen") en `TESTDEKKING.md` bijwerken in dezelfde wijziging.
