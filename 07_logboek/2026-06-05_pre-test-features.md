# Vier praktijk-functies vóór het geautomatiseerd testen

Datum: 2026-06-05
Project: KSV demo-app (Kluslus)
Aanleiding: Reinier wilde eerst een compleet systeem voordat we automatisch testen. Praktijk-analyse
leverde vier functies op die een werkend systeem logischerwijs nodig heeft. Alle vier gebouwd (TDD,
commit per feature). Geen schema-migratie nodig.

## Gebouwd

1. **Eerdere rapporten meesturen op referentie.** Bij het versturen van een klus krijgt de monteur de
   eerdere bezoeken aan dezelfde keuken mee in zijn mail (datum, monteur, rapport-link per opgeleverde
   klus). Pure `historieVoorMonteur` + render in `monteurMailTekst`; versturen- en mail-monteur-route
   bouwen de historie via `zoekOpReferentie`.

2. **Opdracht corrigeren na inschieten.** `PATCH /api/opdrachten/[id]` werkt klant/adres/telefoon/
   referentie/keukenzaak/type bij (alleen kantoor; monteur 403). `db.updateOpdrachtGegevens` +
   bewerk-formulier `OpdrachtBewerken` op de dashboard-detailpagina. Vooral de referentie corrigeren is
   cruciaal, want de keukenhistorie hangt eraan.

3. **Dubbele-boeking waarschuwen op het planbord.** Pure `vindDubbeleBoekingen` detecteert overlap per
   monteur-account (twee montages of montage+service zelfde dag; twee services zelfde dag en tijd).
   Botsende kaarten worden rood ("dubbel") en er verschijnt een waarschuwingsbalk.

4. **Mail-afsluiter uit de zaak.** Monteur- en spoedmail sloten hardcoded af met "Keukenstudio
   Voorschoten"; nu komt de afsluiter uit de keukenzaak van de opdracht (terugval "Het planning-team").

## Verificatie

395 tests groen (was 387). Build slaagt. Geen migratie; veilig te deployen.

## Nog open (bewust later)

- Monteur-beschikbaarheid (vrij/ziek/vakantie) bij het plannen.
- "Monteur onderweg"/klant-notificatie (vaak doet de keukenzaak dit zelf).
- Bevinding 4 (ruime INSERT-policy) en 5 (monteurloze verstuur-markering).
- Keuze-veld "welke zaak" (pas bij 2+ zaken), zaak achteraf wijzigen, filialen.

Hierna: het geautomatiseerd testen (integratie-harnas tegen de test-database, mail gemockt).
