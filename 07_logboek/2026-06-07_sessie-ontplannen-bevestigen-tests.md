# Sessie: ontplannen, bevestigen vanaf werkpool, testdiscipline en oplever-race

Datum: 2026-06-07 (werk grotendeels 2026-06-06, afgesloten met volledige testrun op 07)

## Wat er gedaan is

1. **Deploy naar Vercel** van de groene test-suite (FROM-adres `planning@kluslus.nl`, workarounds eruit).
2. **Ontplannen vanaf het planbord**: bevestigingsdialoog + mail naar de monteur bij een al
   verstuurde/bevestigde klus. Concept gaat nog stil terug. Zie
   `2026-06-06_ontplannen-bevestiging-en-mail.md`.
3. **Bevestigen vanaf de werkpool-kaart**: status-badge ("Te bevestigen"/"Bevestigd") + snelknop op
   de kaart, knop blijft ook op detail. Zie `2026-06-06_bevestigen-vanaf-werkpool.md`.
4. **NavKnop** lint-error opgelost (useSyncExternalStore i.p.v. useEffect+setState).
5. **Testdiscipline aangescherpt** (op verzoek van Reinier): de inhoud van het geheugen was goed, maar
   werd alleen bij grote bouwmomenten afgedwongen. Nu in de skill projectstart-discipline een lichte
   afrond-check (3 vragen) bij elke wijziging, bredere trigger, en een levend `TESTDEKKING.md` dat per
   feature de testlagen koppelt en gaten zichtbaar maakt.
6. **Gaten gedicht** die het register blootlegde:
   - e2e voor de ontplan-bevestigingsdialoog op het planbord (`planbord-ontplannen.spec`).
   - e2e voor de oplever-UI: foto-upload, handtekening-canvas, opmerking (`opleveren.spec`).
7. **Race gedicht** die de oplever-e2e blootlegde: de concept-saves waren fire-and-forget zonder
   volgorde-garantie (opmerking kon wegvallen). Nu geserialiseerd via een promise-chain in
   `OpleverFlow`; de e2e bewaakt dit met bewust snelle stappen.

## Eindstand testsuite

452 groen, 0 fouten: 419 unit/route, 26 browser-e2e (+7 mail-e2e die in de gewone run skippen),
7 mail-e2e echt verstuurd. Alles live op Vercel.

## Les van deze sessie

Tests bewijzen dat code doet wat je opschreef, niet dat het ontwerp compleet is. De gemiste tegenhanger
(ontplannen zonder mail) en de gemiste testlaag (UI niet e2e) ontstonden bij kleine wijzigingen, niet
bij groot bouwwerk. Daarvoor is de afrond-check + het testdekking-register bedoeld.
