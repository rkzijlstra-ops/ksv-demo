# Compleet systeem blok 5a: opdrachtgever-detailpagina + terug-knop

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (Terugkoppeling / Context en dekking)

## Wat gebouwd is

Een eigen leesweergave voor de opdrachtgever, los van de monteur-app. Klikken op een kaart
(dashboard of planbord) gaat nu naar `/dashboard/opdracht/[id]` met een nette "terug naar
Dashboard"-knop. Daarmee is Reiniers eerdere irritatie (je belandde in de monteur-app zonder weg
terug) opgelost.

De pagina toont: klant, type (montage/service), status, referentie, adres, telefoon, monteur,
planning, en bij opgeleverd de datum. Documenten als links (lezen, niet verwijderen). Meldingen
van de monteur als korte samenvatting. Een opgeleverd rapport voorlopig als PDF-link.

- `src/app/dashboard/opdracht/[id]/page.tsx` (server, force-dynamic).
- Kaart-links in `OpdrachtDashboardCard` en `PlanbordGrid` wijzen nu hierheen.
- Hergebruik: OpdrachtStatusBadge, DocumenttypeBadge, TerugKnop, planningTijd/duurLabel.

## Verificatie

- `npm test`: 334 groen.
- `npm run build`: slaagt, `/dashboard/opdracht/[id]` in de routelijst. Geen SQL nodig.

## Nog te doen in blok 5 (volgende sessies)

- 5b: het volledige opleverrapport als inline leesweergave (eindstaat-foto's, handtekening, video,
  opmerking; meldingen met foto's), in plaats van alleen een PDF-link.
- 5c: keukenhistorie per referentienummer (eerdere klussen op dezelfde keuken, nieuwste eerst).

## Daarna

Blok 6: accounts en rollen per monteur en zaak (dan ook echte monteur-mailadressen).
