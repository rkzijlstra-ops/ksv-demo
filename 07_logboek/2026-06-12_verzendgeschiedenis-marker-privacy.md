# 2026-06-12 Verzendgeschiedenis, werkpool-marker, privacy-waarschuwing + drie fixes

Autonome bouwsessie (Rein onder de douche, "bouw alles, niet stoppen, beslis zelf"). Eerst brainstorm/akkoord
op de features, daarna gebouwd met test-driven aanpak waar mogelijk.

## Gebouwd

**Feature 1: verzendgeschiedenis (append-only).** Nieuwe tabel `rapport_verzendingen` (migratie 16). De
rapport-route logt elke verzending (doelgroep klant/zaak, naar-adres, tijdstip, pdf-url, door wie). Getoond op
het oplever-scherm (monteur) en de opdracht-detail (kantoor). Lost op dat de app de ontvanger overschreef, de
verwarring van vanmorgen rond Hoek 192920.

**Feature 2: werkpool-marker "Rapport niet verzonden".** Op een actieve klus met een oplevering-in-uitvoering
(foto of handtekening gezet) die nog niet naar de zaak is verstuurd. Verdwijnt zodra naar de zaak verstuurd is
(klus wordt opgeleverd en zakt naar history). Tekst bewust "rapport niet verzonden" / geen "zaak". Alleen
zichtbaar als er iets te doen is, om het werkscherm niet te vervuilen. Nieuwe db-functie
`getOpdrachtenRapportNietVerzonden`.

**Feature 3: privacy-waarschuwing.** Schakelaar in Mijn gegevens (kolom `waarschuw_klant_zicht`, standaard aan,
migratie 17 via een 7-arg overload van `update_eigen_gegevens`; de oude 6-arg functie blijft staan voor
deploy-veiligheid). Staat hij aan, dan komt er bij "Stuur naar klant" een pop-up: de klant ziet ALLE foto's en
meldingen, niet alleen de opmerking; voor zaak-only info is er de interne notitie.

## Fixes

- **klant_email vulde niet voor.** De parser haalde het wel uit de PDF, maar `OpdrachtInput`/`createOpdracht` en
  beide inschiet-routes lieten het vallen. Hele keten bedraad. Let op: bestaande opdrachten (zoals Hoek) blijven
  leeg tot ze opnieuw worden ingeschoten; en als een PDF geen e-mailadres bevat (vaak bij service-werkbonnen)
  blijft het leeg.
- **Lang e-mailadres liep uit het adresboek-veld** (met aanpassen/wissen erachter). Afgekapt + knoppen vast.
- **Interne-notitie placeholder** aangepast naar "Bijv. transportschade aan kastdeur, in het werk opgelost."

## Status

Unit 544 + integratie + e2e 53 groen, typecheck schoon. Commit `c2c5ff8`, **niet gepusht**: pushen = deploy, en
de live-app heeft eerst de migraties 16 + 17 op productie nodig (anders breekt het versturen op de ontbrekende
tabel/RPC). Migraties staan wel op de test-DB. Productie-migratie + push samen met Rein.

## Nog open / te bespreken

- De Hoek-data heeft drie dubbele 192920-opdrachten in productie (mogelijk dubbel ingeschoten). Opschonen?
- De mailstap zelf blijft alleen E2E_MAIL-gedekt (geen mail-dry-run).
