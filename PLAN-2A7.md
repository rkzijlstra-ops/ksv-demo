# PLAN Sessie 2A.7 - Melding-flow herontwerp + kleur-staat

Basis: DESIGN-2A7.md (goedgekeurd). TDD per taak (RED -> GREEN -> commit). Migratie draait Rein in
Supabase; unit-tests mocken Supabase. Testcommando `npm test`. Baseline: 149 groen.
UI-taken: ui-ux-pro-max is deze sessie al geladen; design-system + kleur-staat-taal aanhouden.

## D0 - Migratie schema-2a7-spoed.sql
- `meldingen.spoed boolean not null default false` + `spoed_verzonden_at timestamptz`. Idempotent.
- Verifiëren: Rein runt; `\d meldingen` toont nieuwe kolommen. Tijd 5 min. Status: open

## D1 - db: spoed-model + tellingen
- Melding-type: `spoed`, `spoed_verzonden_at`. MonteurMeldingInput/UpdateMeldingInput: `spoed` i.p.v.
  `urgentie`. createMonteurMelding/updateMelding zetten `spoed`. Nieuw `markeerSpoedVerzonden(id)`.
  Nieuw `getMeldingTellingen()` -> `Record<opdracht_id,{aantal,heeftSpoed}>`.
- Test: payloads bevatten spoed; markeerSpoedVerzonden zet spoed_verzonden_at; tellingen aggregeren.
- Tijd 15 min. Status: open

## D2 - lib/mail: verstuurSpoedMelding
- `verstuurSpoedMelding({ naar, opdracht, melding })` via Resend: subject "SPOED - <klant> (ref)",
  tekst-body met meldingtekst + foto-links, geen PDF. Zelfde key-check als opleverrapport.
- Test: mock resend, assert subject/to/body; error zonder key.
- Tijd 10 min. Status: open

## D3 - API: spoed in create/patch + spoed-versturen-route
- `POST /api/meldingen` + `PATCH /api/meldingen/[id]`: accepteren `spoed` (bool) i.p.v. urgentie.
- Nieuw `POST /api/meldingen/[id]/spoed-versturen`: getMeldingById(id) (404), getMeldingById(opdracht_id)
  voor klantcontext, verstuurSpoedMelding, markeerSpoedVerzonden. Mailfout 502 + niet markeren.
- Test: create/patch met spoed; spoed-versturen happy/404/502.
- Tijd 18 min. Status: open

## D4 - lib/rapport: spoed-weergave
- Per melding: spoed -> "SPOED"-regel; spoed_verzonden_at -> "al als spoed verstuurd op [tijd]".
  Urgentie-gebruik eruit.
- Test: bestaande rapport-tests aanpassen (fixtures spoed); blijft geldige PDF.
- Tijd 10 min. Status: open

## D5 - Kleur-staat badges
- Klein config + component voor staat-kleuren (spoed=rood, open=amber, opgeleverd=groen) met icoon+label.
  Hergebruik design-system tokens. urgentie.ts opschonen (rood/geel-urgentie eruit waar mogelijk).
- Test: config-functie (label/kleur/icoon per staat).
- Tijd 12 min. Status: open

## D6 - MeldingForm herontwerp (ui-ux-pro-max)
- Foto BOVEN tekst. Rood/geel-knoppen weg. Spoed-schakelaar (default uit) + "?" inline-uitleg.
  Hoofdknop: uit=blauw "Toevoegen aan rapport"; aan=rood "Nu als spoed versturen". Bij spoed:
  bevestigings-popup, dan create (spoed=true) -> spoed-versturen; bij fout retry-melding.
- Verifiëren: browser. Tijd 25 min. Status: open

## D7 - Opdracht-detail: kleur-staat-weergave
- Meldingen tonen met staat-kleur: open=amber, spoed verstuurd=rood "Spoed verstuurd op [tijd]".
  Oude "In rapport/Concept"-labels eruit.
- Verifiëren: browser. Tijd 12 min. Status: open

## D8 - Werkbak-kaart: open-teller + spoed
- `getMeldingTellingen` in werkbak-page; OpdrachtCard toont amber "X open meldingen" en rode
  spoed-markering bij open opdracht. Opgeleverd blijft groen in history.
- Verifiëren: browser. Tijd 15 min. Status: open

## D9 - Live test (Rein) + migratie
- `schema-2a7-spoed.sql` draaien. Scenario: melding klaarzetten (amber), spoed versturen (mail +
  rood), opleveren (rapport met spoed-markering), werkbak toont open-teller. Tijd 12 min. Status: open

Na 2A.7: logboek + terug naar Vercel-deploy (geparkeerd) en daarna zelf-gebruik fase.
