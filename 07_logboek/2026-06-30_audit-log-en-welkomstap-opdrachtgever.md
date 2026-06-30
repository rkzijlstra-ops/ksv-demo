# Audit-log kantoor-acties + welkomstap opdrachtgever (2026-06-30)

Vervolg op de multi-opdrachtgever-branch, na een gesprek met Rein over wie-wat-wijzigt en hoe een
opdrachtgever onboardt.

## 1. Audit-log afgemaakt (wie deed wat)
De `gebeurtenissen`-tabel + het "Logboek" op het kantoor-detailscherm bestonden al, maar logden alleen de
monteur-lifecycle + verwijderen/akkoord. Nu loggen ook de kantoor-acties die in Reins scenario spelen
("de een schiet in, de ander past aan"): **ingeschoten, gepland, verzet, ontplannen, verstuurd,
geannuleerd, gewijzigd** (gegevens én werk-omschrijving), elk met de naam van de uitvoerder en wat context
(monteur/datum/veld). Toegevoegd in de betreffende routes via `logActie`, overal **best-effort** (een
log-fout mag de hoofdactie nooit breken; de nieuwe getProfiel-calls in plannen/verplaatsen/versturen staan
in een try/catch). Labels in `Logboek.tsx` en `KlusActiviteit.tsx` uitgebreid.

Accountabiliteit-nuance (besproken): één gedeeld e-mailaccount = één naam in het logboek. Voor wie-deed-wat
per persoon moet je aparte e-mailadressen uitnodigen (eigen account = eigen naam).

## 2. Welkomstap opdrachtgever (eenmalig corrigeren)
Een uitgenodigde opdrachtgever krijgt bij de eerste login een welkomscherm met zijn door beheer ingevulde
naam (+ optioneel telefoon), dat hij één keer kan bevestigen/corrigeren. Daarna weg.
- Migratie `schema-compleet-29-welkom-opdrachtgever.sql`: kolom `welkom_bevestigd` (default false) +
  SECURITY DEFINER `bevestig_welkom(naam, telefoon)` die alleen de eigen naam/telefoon raakt, nooit rol/zaak.
- Gate in `vereisRol`: onbevestigde opdrachtgever → `/welkom-opdrachtgever` (niet in demo, pagina zelf skipt).
- Pagina + `WelkomOpdrachtgeverForm` + route `POST /api/welkom-opdrachtgever` + `db.bevestigWelkom`.
- `Profiel.welkom_bevestigd` toegevoegd; e2e global-setup zet de test-opdrachtgever op true (start "klaar").

Controle blijft bij beheer: de welkomstap laat alleen de eigen naam/telefoon zetten, geen rol/zaak/toegang.
Toegang hangt aan het uitgenodigde e-mailadres (magic link naar dat postvak), niet aan de welkomstap.

## Tests
Test-first waar mogelijk: 949 unit groen, typecheck + lint schoon. Nieuw: toegang.test (opdrachtgever-gate),
welkom-opdrachtgever/route.test, opdrachten/[id]/route.test ("gewijzigd"-gebeurtenis). Migratie 29 op
test+demo gedraaid (additief: kolom + functie, geen policies). TESTDEKKING + TOESTANDEN bij.

## Status
Op de multi-opdrachtgever-branch, naar de test-omgeving. Productie-migratie (29) draait Rein zelf wanneer
dit naar productie gaat. Nog geen actieve klanten, dus geen risico.
