# Heropenen opgeleverde klus + werkpool netter (referentie)

Datum: 2026-06-18 (vervolg op de terugmeld-keten dezelfde dag). Branch: master (lokaal).

## Aanleiding (Rein, tijdens live testen)

1. Een opgeleverde klus moet soms terug naar de planning (klant belt, toch nog iets), met een
   instructie. Dat kon niet: er was alleen een "Toch nog open" voor de lichte afronding, niet voor een
   volledig opgeleverde klus. De bestaande `heropenen` was er ook niet klaar voor (liet opdracht_status
   "opgeleverd" staan).
2. Vraag of meerdere opleveringen/vervolg-opdrachten van dezelfde referentie strak georganiseerd zijn,
   op dashboard én in de werkpool.

## Beslissingen (Rein)

- Heropende klus = terug naar plan-kleur met badge "Heropend" (niet groen).
- Scope: heropenen-functie ÉN werkpool netter.

## Gebouwd

**Feature 1 — heropenen van een opgeleverde klus:**
- Migratie blok 23: kolom `heropend_at` op meldingen.
- `heropenen(id, instructie?)` zet de klus volledig terug naar "open + te plannen" (opdracht_status,
  opgeleverd_at, rapport_url-kopie op de melding), markeert `heropend_at`, en zet een optionele instructie
  als werkomschrijving. De oplevering + verzendgeschiedenis blijven als historie. `registreerZaakRapport`
  wist `heropend_at` (opnieuw opgeleverd = niet meer heropend).
- Route accepteert een optionele `instructie`.
- Kantoor-detailpagina: knop "Heropenen" + instructie-venster (HeropenKnop), bij een opgeleverde klus.
- Badge "Heropend" (accent/oranje) op dashboard-kaart, monteur-kaart, planbord-kaart en pool-kaart, met
  de instructie eronder op de kaarten waar dat past.

**Feature 2 — werkpool netter (referentie):**
- "Eerder op deze referentie"-blok op de monteur-detailpagina (zoals het dashboard al had), zodat de
  historie meereist bij een vervolg-bezoek. RLS toont de monteur zijn eigen eerdere bezoeken.
- "Meerdere bezoeken"-hint op de werkpool-kaart als een referentie op meer dan één eigen klus voorkomt.

## Bevinding onderweg (niet als gat behandeld)

Eén opdracht heeft technisch één oplevering (upsert op opdracht_id); opnieuw opleveren overschrijft de
oplevering-record, maar de verstuurde rapporten blijven in de append-only verzendgeschiedenis. "Meerdere
opleveringen" die Rein zag, zijn meerdere losse opdrachten met dezelfde referentie (deels oude data).
Het dashboard koppelt die al via "Eerder op deze referentie"; de werkpool nu ook.

## Verificatie

- Unit 676 + integratie 15 groen, typecheck/lint/build schoon.
- E2e: nog door Rein te draaien/uitbreiden (heropen-flow, referentie-blokken).

## Voor Rein (productie)

1. Draai `supabase/schema-compleet-23-heropend.sql` op het PRODUCTIE-project (idempotent).
2. Daarna pushen (deploy). Zonder de migratie zou heropenen falen (kolom ontbreekt).
