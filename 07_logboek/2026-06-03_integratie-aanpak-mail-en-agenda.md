# Integratie-aanpak uitgewerkt: levering, mail en agenda-koppeling (fase 2)

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, nieuwe sectie "Integratie-aanpak (fase 2, vastgelegd 2026-06-03)"

## Aanleiding

Reinier stelde een reeks praktische vragen over hoe het systeem straks bij Ed terechtkomt en hoe een agenda-koppeling zou werken. Denkwerk vastgelegd zodat het er ligt zodra fase 2 begint. Nog niets gebouwd.

## Kern van de uitkomst

- **Levering:** web-based PWA, niks installeren, geen bezoek op locatie. Link plus eigen login. Draait in de cloud (Vercel + Supabase EU).
- **Mail in:** niet in de inbox van de klant duiken. Systeem krijgt een eigen postbus, klant zet een doorstuurregel, systeem leest alleen zijn eigen postbus via een inbound-maildienst. Provideronafhankelijk (Gmail/Outlook maakt niet uit). De variatie zit in de inhoud, opgevangen door de parser per opdrachtgever.
- **Mail uit:** via Resend (zit al in het project). Aparte dienst van ontvangen. Domein-instelling kan het laten lijken alsof het van de klant komt.
- **OAuth:** geen wachtwoord, klant geeft zelf toestemming, intrekbaar, niet op locatie. Verificatie eenmalig per app, niet per klant. Voor agenda gratis. Klein beginnen kan zonder volledige review.
- **Agenda-koppeling:** eenrichting, systeem blijft bron van waarheid. Bij aanmaken sla je het externe agenda-ID op bij de afspraak. Wijzigen/verwijderen gaat via dat ID, dus zonder de agenda van de klant te lezen. Grens: handmatige wijzigingen in de eigen agenda van de klant worden niet teruggezien.

## Kosten-inzicht

- Google: inbox lezen valt onder de zwaarste toegang met een dure verplichte jaarlijkse beveiligingskeuring (duizenden euro's). Agenda en mail versturen vallen daar niet onder.
- Microsoft: mail lezen is niet duur (geen betaalde keuring), maar de eigen-postbus-aanpak blijft alsnog de keuze om privacy, onderhoud en schaalbaarheid.
- Conclusie: scope klein houden, weg uit ieders inbox, één eigen postbus waar iedereen naar doorstuurt. Dat schaalt naar meer klanten.

## Status

Alles fase 2, bewust uitgesteld. Versie 1 heeft geen agenda-koppeling en geen mail-inkoppeling; het planbord is de agenda en order-mails komen via handmatige PDF-upload binnen. Sluit aan op architectuurregels 1 (gesloten kern, plug-in-naad), 2 (eigen agenda als bron) en 3 (schone datastructuur met vast ID).
