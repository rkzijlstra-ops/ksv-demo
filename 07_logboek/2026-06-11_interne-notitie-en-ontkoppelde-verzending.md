# Interne notitie + ontkoppelde verzending (klant / zaak)

Datum: 2026-06-11 (nacht-sessie, autonoom gebouwd terwijl Rein sliep).
Ontwerp: `DESIGN-INTERNE-NOTITIE-EN-VERSTUREN.md`. Mock-up: `mockups/oplevering-versturen.html`.

## Wat en waarom

Begon als "een interne-notitie-knop bij de oplevering". Tijdens het uitdenken met Rein groeide het
naar een nette herinrichting van het opleveren, met drie eisen:

1. Een interne notitie naast de openbare opmerking; de klant ziet de interne nooit.
2. Het rapport los in tijd naar klant (schone versie) en zaak (volledige versie) kunnen sturen.
3. De monteur houdt de regie: het kantoor (Ed) mag het exacte oplevermoment niet live zien.

Onderzoek bracht twee dingen aan het licht die we meteen meenamen:
- Het klant-mailadres staat al in de bron-PDF ("Email-adres") maar werd bij het inschieten
  weggegooid. Nu pakken we het en vullen het klant-veld vooraf in.
- Het dashboard toonde de oplevering al zodra er een (tussenopslag-)record was, dus Ed kon live
  meekijken. Dat lek is gedicht: het oplever-blok verschijnt pas na de zaak-versie.

## Hoe het nu werkt

- **Opleveren is privé.** Tekenen/foto's/opmerking/interne notitie zijn tussenopslag; geen status,
  Ed ziet niets.
- **Twee verzendknoppen, los in tijd.** Klant = schone versie (raakt de status niet). Zaak =
  volledige versie mét interne notitie, en zet de opdracht PAS dan op opgeleverd. Stuur je de klant
  eerst, dan meldt de zaak-mail dat de klant het rapport ook kreeg.
- **Interne notitie**: amber, dichtgeklapt met slotje, voor of na het tekenen, met spraak. Komt via
  de pure functie `interneNotitieVoorRapport` alleen in de zaak-PDF; de klant-tak krijgt het veld
  structureel nooit (lek-test borgt dit).
- **Labels**: "Opmerking · zichtbaar voor iedereen" en "Interne notitie · alleen voor de zaak".

## Bouwlagen (alle unit/route-getest waar mogelijk)

1. DB: kolommen op opleveringen (interne_opmerking, klant_rapport_email/url/verzonden_at,
   zaak_rapport_verzonden_at) en meldingen (klant_email). Migratie `schema-compleet-15` +
   test-schema. db-functies `registreerKlantRapport` / `registreerZaakRapport`.
2. PDF-parse: klant_email door parser-schema, prompt en insert.
3. rapport.ts: doelgroep klant/zaak; interne notitie alleen zaak; lek-tests.
4. Route `POST /api/opdrachten/[id]/rapport` (doelgroep in body); oude `/opleveren` verwijderd.
5. Mail: doelgroep + "klant heeft 't ook"-regel (backward compatible).
6. OpleverFlow: interne notitie, twee verzendkaarten, knop-uitlijning, klant-mail voorinvullen.
7. Dashboard: privacy-fix + interne notitie als amber blok voor het kantoor.

Twee commits boven `0a0d921` (rapport-PDF-herontwerp van de parallelle sessie, niet aangeraakt):
`94d55bd` (fundering) en `1040883` (flow + UI). Unit: 542 groen, typecheck schoon. Niet gepusht.

## Nog open (voor morgen, met Rein)

- **E2e van de nieuwe verzend-flow** (Rein draait in PowerShell). Te checken: klant-verzending zet de
  status niet op opgeleverd; zaak wel; dashboard toont de oplevering pas na de zaak-versie; interne
  notitie wel in de zaak-PDF, niet in de klant-PDF. De mail-e2e is al omgezet naar "Stuur naar zaak".
- **Werkpool-geheugensteun** "rapport naar zaak nog versturen" (privé voor de monteur) is nog niet
  gebouwd. Bewust uitgesteld: raakt de werkpool-datalaag en de kaarten tonen de status al op het
  oplever-scherm zelf. Los, helder afgebakend vervolgklusje.
- **Migraties draaien**: `schema-compleet-15` nog tegen de test-DB en (later) productie uitvoeren.
- Eén bestaande lint-error (`set-state-in-effect`, OpleverFlow regel ~131, de handmatig-sync) is
  pre-existing en niet aangeraakt.
