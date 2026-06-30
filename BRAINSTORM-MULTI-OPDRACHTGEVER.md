# Multi-opdrachtgever: echte aparte klanten (2026-06-30)

## Aanleiding
Rein wil dat de uitnodig-afzender de gekozen opdrachtgever volgt, dat "Beheer" platform-baas wordt
(niet vast aan Keukenstudio Voorschoten), en dat hij opdrachtgevers kan aanmaken. Op de vraag "labels of
echte aparte klanten" koos hij **echte aparte klanten**: opdrachtgevers die elkaars klussen NIET mogen zien.

## Wat het onderzoek liet zien
- Het datamodel ondersteunt multi-opdrachtgever al: `meldingen.opdrachtgever_id`, `bestemmingVoor` met
  `gekozenZaakId`, en de inschiet-route met "keuze-veld komt pas bij 2+ zaken".
- RLS staat aanmaken door beheer al toe (`opdrachtgevers_insert: mijn_rol() = 'beheerder'`).
- Gat 1: er is geen db-functie/route/UI om een opdrachtgever aan te maken.
- Gat 2 (security): de RLS geeft `mijn_rol() in ('beheerder','opdrachtgever')` VOLLEDIGE toegang tot
  meldingen/documenten/opleveringen. Een opdrachtgever ziet dus nu ALLE zaken. De RLS-comment zegt het
  zelf: "opdrachtgever -> alle opdrachten van zijn zaak (v1: de enige zaak, dus alles)". Afscherming per
  zaak was altijd de bedoeling, alleen uitgesteld.
- "Beheer" hangt in productie aan KSV (`opdrachtgever_id` gezet). Inschieten gebruikt voor een beheerder
  niet dat veld maar de gekozen/standaard zaak, dus loskoppelen (null) is veilig.

## Aanpak in twee lagen

### Laag 1, fundament (additief, veilig, naar test-omgeving)
1. **Opdrachtgever aanmaken** (beheer): `db.insertOpdrachtgever(naam)` + `POST /api/opdrachtgevers`
   (beheer-only) + een "Nieuwe opdrachtgever" formulier op de Gebruikers-pagina (bij het bestaande
   opdrachtgever-blok).
2. **Uitnodigen met zaak-keuze**: dropdown van opdrachtgevers in `UitnodigForm` (verplicht; bij één zaak
   voorgeselecteerd). De route neemt `opdrachtgever_id`, valideert dat hij bestaat, en gebruikt die zaak
   voor zowel de koppeling (`profiel.opdrachtgever_id`) als de afzender/naam ("&lt;zaak&gt; via Kluslus").
   Terugval op de standaard-zaak als er (nog) geen keuze is.
3. **Inschieten met zaak-keuze bij 2+ zaken**: het al-voorziene keuzeveld in het inschiet-scherm tonen
   zodra er meer dan één zaak is.
4. **Beheer loskoppelen**: `Beheer.opdrachtgever_id` → null (platform-baas). Data-wijziging, veilig want
   de RLS is rol-gebaseerd en inschieten gebruikt dit veld niet voor een beheerder.

### Laag 2, afscherming per zaak — BESTOND AL (correctie 2026-06-30)
Bij het bouwen bleek de zaak-afscherming al in de codebase te zitten: `schema-compleet-6e-zaak.sql`
definieert `mijn_opdrachtgever()`, `opdracht_van_mijn_zaak()` en `mag_melding`/`mag_opdracht`, en zet de
meldingen/documenten/opleveringen-policies rol-EN-zaak-bewust. `schema-compleet-7` voegt daar de
werkpool-vasthouden-clause aan toe. De afscherming was alleen niet zichtbaar omdat er één zaak was. De
e2e `afscherming.spec` bewijst het (o.a. "opdrachtgever ziet GEEN klus uit een andere zaak") en is groen.
Ik hoefde laag 2 dus NIET te bouwen.

Gedrag dat al klopt:
- **beheerder**: ziet/doet alles (rol-gebaseerd), dus al platform-breed. De decouple (opdrachtgever_id op
  null) was niet nodig en is niet doorgevoerd; beheer's zaak-veld is vestigiaal (inschieten gebruikt voor
  beheer de gekozen/standaard zaak, niet dit veld).
- **opdrachtgever**: ziet alleen zijn eigen zaak.
- **monteur**: alleen toegewezen klussen + de werkpool-vasthouden-uitzondering.

Valkuil die ik maakte en herstelde: ik schreef een migratie 29 die dit dubbelde (en de policies inline
zette + beheer nullde), draaide hem op test+demo, en draaide hem daarna terug door 6e en 7 opnieuw te
draaien. afscherming.spec bevestigt dat test weer canoniek is.

## Veiligheidsregel
De afscherming bestaat en is bewezen, dus het aanmaken van opdrachtgevers + de zaak-keuze kan veilig
naar productie. Wel eerst op de test-omgeving keuren (de normale weg). Vóór een echte tweede klant
aansluit: nog even de afscherming end-to-end naleven met een tweede zaak in de praktijk.

## Bewuste sub-keuzes
- Monteurs zijn niet zaak-exclusief: ze zien klussen die aan hen zijn toegewezen, ongeacht zaak (een
  monteur kan voor meerdere zaken werken). Hun `opdrachtgever_id` is de "thuis"-zaak, niet een filter.
- Uitnodigen blijft beheer-only. Een opdrachtgever nodigt (voorlopig) niet zelf uit.
- Opdrachtgever aanmaken: alleen naam; klant-levering staat standaard aan (zoals de bestaande zaak).

## Teststrategie
- Unit: insertOpdrachtgever (mock), opdrachtgevers-route (beheer-gate + aanmaken), uitnodig-route
  (gekozen zaak → koppeling + branding; ongeldige/ontbrekende zaak).
- Integratie/e2e (laag 2): RLS-afscherming, opdrachtgever A ziet zaak B niet (negatieve test), beheer
  ziet alles. Dit is de poort vóór productie.
