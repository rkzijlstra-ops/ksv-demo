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

### Laag 2, afscherming per zaak (security-kern, test + Reins review, daarna pas productie)
Maak de RLS rol-EN-zaak-bewust. Nieuwe SECURITY DEFINER-helper `mijn_opdrachtgever()` (de zaak van de
ingelogde gebruiker) en `opdracht_van_mijn_zaak(opdracht_id)` (parent-zaak via opdracht_id). Dan per
tabel:
- **beheerder**: blijft alles zien/doen.
- **opdrachtgever**: alleen rijen van zijn eigen zaak. meldingen: `opdrachtgever_id = mijn_opdrachtgever()`
  of (kind-melding) via parent. documenten/opleveringen: via `opdracht_van_mijn_zaak(opdracht_id)`.
- **monteur**: ongewijzigd (alleen toegewezen klussen + kind-rijen).
- **eigen klussen** (opdrachtgever_id null, door een monteur ingeschoten): alleen de eigen monteur.
Migratie op alle drie de DB's (prod handmatig door Rein). Integratie-/e2e-test die BEWIJST dat
opdrachtgever A de klussen van zaak B niet ziet, vóór dit naar productie gaat.

## Veiligheidsregel (hard)
Zolang laag 2 niet af en niet door Rein gekeurd is, gaat het aanmaken van opdrachtgevers NIET naar
productie. Anders kan een tweede zaak KSV's klussen zien. Alles blijft op de test-omgeving tot de
afscherming bewezen is.

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
