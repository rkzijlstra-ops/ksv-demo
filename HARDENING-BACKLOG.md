# Hardening-backlog (productie klant-klaar)

Levend overzicht van zaken die nog moeten gebeuren voordat/terwijl de app met echte klanten live gaat.
Geen werk dat de werking nu blokkeert, wel nodig voor robuustheid, kosten en beheer. Per punt: wat,
waarom, urgentie. Aangemaakt 2026-06-18.

## Opslag / opruiming

- [ ] **Storage opruimen bij definitief verwijderen.** Urgentie: laag.
  Bij "definitief verwijderen" in de prullenbak (`definitiefVerwijderen`) en bij het hard verwijderen
  van een losse melding (`verwijderMelding`) worden de database-rijen gewist (met cascade), maar de
  bijbehorende bestanden in de opslag blijven achter als wees: oplever-foto's/video's
  (`oplevering.eindstaat_foto_urls`, `video_url`), oplever-PDF's (`rapport_url`, `klant_rapport_url`,
  `rapport_verzendingen.rapport_url`) en melding-foto's (`meldingen.foto_urls`). Oorzaak: van die
  bestanden is alleen de web-link opgeslagen, niet het opslagpad, dus de bestaande opruim-functie kan ze
  niet vinden. (Documenten worden wél netjes opgeruimd, want daar staat het opslagpad in de
  documenten-tabel.) Raakt alleen de zeldzame handmatige "definitief verwijderen"-actie; normaal
  weggooien is soft-delete (alles blijft). Lage kosten/impact, maar netter om te dichten.
  Fix-richting: opslagpad meeloggen bij upload (zoals documenten doen), of bij hard-delete de
  bestanden via hun pad uit de bucket halen.

## Bewaarbeleid (bewust GEEN auto-wis)

- Besloten 2026-06-18: GEEN automatische verwijdering van weggegooide klussen na X dagen. Voor
  keukenmontage is historie waardevol (oplever-bewijs, foto's, garantie, geschillen). Alles blijft via
  soft-delete bewaard tot iemand bewust "definitief verwijderen" kiest. Opslag is goedkoop; performance
  is bij ZZP-volume geen probleem. Heroverweeg alleen als de opslag ooit echt oploopt; dan een MILDE
  opruiming (bv. 1 jaar, niet 30 dagen) MET storage-cleanup (zie punt hierboven).

## Eerder benoemd (uit project-geheugen, nog te verifiëren/plannen)

- [ ] CI groen en stabiel houden (test-DB schema gelijk aan productie bij elke migratie).
- [ ] Preview-flow / rollback-strategie voor deploys.
- [ ] Monitoring + backups vóór live met echte klanten.

(Vul aan naarmate er punten bijkomen. Dit document hoort bij de code; de toestandsmatrix staat in
TOESTANDEN.md, de testdekking in TESTDEKKING.md.)
