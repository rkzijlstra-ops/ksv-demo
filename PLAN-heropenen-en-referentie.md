# Plan: heropenen opgeleverde klus + werkpool netter (referentie)

Sessie 2026-06-18. Keuzes Rein: heropende klus = plan-kleur + badge "Heropend"; scope = heropenen-functie
ÉN werkpool netter. Test-first. Migratie blok 23 draait Rein later op productie.

## Feature 1: heropenen van een opgeleverde klus (kantoor)

Probleem: een volledig opgeleverde klus (opdracht_status=opgeleverd, rapport verstuurd) kan niet terug
naar de planning. De bestaande `heropenen` reset de afrond-cyclus + planning, maar laat opdracht_status
"opgeleverd" staan -> strijdige toestand. Geen knop bij opgeleverd.

- [ ] T1. Migratie blok 23: kolom `heropend_at timestamptz` op meldingen. Op test-DB.
- [ ] T2. db.ts: `heropenen` volledig laten resetten naar "open + te plannen": opdracht_status="open",
  opgeleverd_at=null, rapport_url=null, heropend_at=nu, plus optionele instructie -> werkomschrijving.
  De oplevering + verzendgeschiedenis blijven als historie staan. `heropend_at` in Melding-type.
- [ ] T3. db.ts: `registreerZaakRapport` wist `heropend_at` (bij opnieuw opleveren is hij niet meer
  "heropend"). Unit-tests T2+T3.
- [ ] T4. heropenen-route: optionele `instructie` in de body -> werkomschrijving zetten. Route-test.
- [ ] T5. Kantoor-detailpagina: knop "Heropenen" bij een opgeleverde klus, met een venster dat een
  instructie vraagt (werkomschrijving). Plus het werkomschrijving-blok tonen op de kantoor-detailpagina
  (ontbrak). 
- [ ] T6. Badge "Heropend" (plan-kleur, niet groen) op OpdrachtDashboardCard, OpdrachtCard (monteur) en
  PlanbordGrid, zolang heropend_at gezet is.

## Feature 2: werkpool netter (referentie / vervolg)

Probleem: in de monteur-werkpool staan klussen van dezelfde referentie als losse kaarten, zonder
verband. Dashboard heeft al "Eerder op deze referentie"; de monteur niet.

- [ ] T7. Monteur-detailpagina: "Eerder op deze referentie"-blok (zoals dashboard), zodat de historie
  meereist bij een vervolg-bezoek. (RLS: monteur ziet alleen zijn eigen eerdere klussen — controleren.)
- [ ] T8. Werkpool-kaart: subtiele referentie-/vervolg-hint als er eerdere klussen op dezelfde
  referentie zijn. Test waar zinvol.

## Afronding

- [ ] T9. Volledige unit+integratie groen, typecheck/lint/build. E2e uitbreiden waar zinvol (Rein draait).
- [ ] T10. TOESTANDEN.md + TESTDEKKING.md bijwerken; logboek.

## Productie (Rein)

Draai `supabase/schema-compleet-23-heropend.sql` op productie, daarna mergen/pushen.
