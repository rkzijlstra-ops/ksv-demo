# Code-review kritieke flows (voor de E2E-testronde)

Datum: 2026-06-05
Project: KSV demo-app (Kluslus)
Aanleiding: vóór de geautomatiseerde E2E-tests en vóór Ed live gaat, adversarieel de kern-flows
nagelopen (planbord plannen/verplaatsen/versturen, RLS, oplevering, zelf-inschiet).

## Bevindingen

1. **KKS-zelf-inschiet lekt in het KSV-dashboard/planbord (HOOG, vóór Ed).** Opdrachten hebben nog
   geen `opdrachtgever_id` (bewust uitgesteld). Een zelf-ingeschoten ad-hoc klus (status binnen)
   verschijnt straks ook in Ed's dashboard en de planbord-pool. Nu gemaskeerd (Ed niet live, één
   zaak). = de volgende grote bouwstap: zaak op de opdracht + dashboard/planbord daarop filteren.

2. **Verplaatsen wiste duur/tijd (MIDDEN, latent). GEFIXT.** De route zette duur_dagen naar 1 en
   starttijd naar leeg als ze ontbraken. Nu valt hij terug op de bestaande opdracht-waarde
   (expliciet null wist nog wel). Test + fix gecommit.

3. **"Verzonden plek" vergelijkt op monteur_naam, niet op account (MIDDEN-LAAG).** Met naamgenoten
   (7 monteurs) kan een verplaatsing tussen twee gelijknamige monteurs op dezelfde dag/tijd ten
   onrechte als "ongewijzigd" gelden, waardoor de wijziging niet opnieuw naar de monteur gaat.
   Fix vraagt een kolom `verzonden_toegewezen_aan` (mini-migratie). BUNDELEN met bevinding 1, want
   dat raakt toch het schema; zo hoeft Reinier niet los een migratie te draaien.

4. **Ruime INSERT-policy (LAAG-MIDDEN, bewuste tradeoff).** Onder 6c mag elke ingelogde gebruiker
   rijen invoeren; een monteur kan een melding/oplevering hangen aan een opdracht die niet van hem
   is (wel vervuiling, geen lek, want lezen is afgeschermd). Later dichttimmeren voor betalend:
   INSERT koppelen aan eigenaarschap.

5. **Versturen markeert ook monteurloze opdrachten als verzonden (LAAG).** Een opdracht zonder
   toegewezen monteur krijgt wel status gepland maar geen mail. Edge; UI wijst normaal eerst toe.

## Status / vervolg

- Bevinding 2: gefixt en gecommit.
- Bevinding 1: volgende grote bouwstap (zaak-scheiding). Brainstorm/plan eerst.
- Bevinding 3: meeliften op de schema-wijziging van 1.
- Bevinding 4 en 5: bekende open punten, later.
