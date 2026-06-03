# Plan-fase: stijl vastgelegd en dashboard-statuskleuren

Datum: 2026-06-01
Project: `01_projecten/keukenstudio-voorschoten-demo`

## Beslissing

Het dashboard en de agenda (het systeem rond de bestaande monteur-PWA) worden gebouwd in dezelfde stijl als de PWA. Geen nieuw concept. Dat houdt het werk eenvoudig en het oogt als één product. De plan-fase krijgt mock-ups als vaste eerste stap, iets dat bij de vorige build ontbrak.

## Stijl-basis (uit de PWA)

Levende waarheid is `src/app/globals.css` (niet de oudere `design-system.md`, die noemde primary nog als blauw).

- primary anthraciet #27272A, accent oranje #F97316 (merk), surface grijs #F1F5F9, ink #0F172A
- urgent-rood #DC2626, success groen #16A34A
- Lexend (UI/koppen) + Source Sans 3 (lange tekst), 56px tap-targets, kleur altijd met icoon + label, geen dark mode

## Ontbrekende kleur opgelost

De dashboard-statuskleuren zijn grijs/oranje/blauw/groen. Alles zat al in het palet behalve **blauw** (was verdwenen toen primary anthraciet werd). Toegevoegd als los status-token:

- `--color-bevestigd: #1D4ED8` (blue-700, witte tekst, 7:1). Botst niet met oranje, want oranje blijft merk-accent en blauw is puur de status 'bevestigd'.

## Vastgelegd in

1. `src/app/globals.css` — nieuw token `--color-bevestigd`
2. `design-system.md` — kleurtabel gecorrigeerd naar de levende waarheid + nieuwe sectie "Dashboard-statuskleuren"
3. `DESIGN-COMPLEET-SYSTEEM.md` — statuskleuren-sectie gekoppeld aan de tokens met hexes

## Volgende stap

Mock-ups van dashboard-overzicht en agenda, in deze stijl, laag-fidelity als beslis-hulpmiddel.

## Stand van zaken einde sessie (2026-06-01)

Dashboard-mock-up v1 gebouwd: `public/mockups/dashboard.html` (statische HTML, open via file:// of dev-server `/mockups/dashboard.html`, tegel staat ook op `/mockups`). Bevat: header zoals de app (wit, grijze rand, oranje balk onderlangs, mono-titel, overgenomen uit `page.tsx`), PDF-inschiet-zone plus "handmatig invoeren zonder PDF", attentie-callout, zoekbalk (werkt op klant/referentie/monteur), Datum-pill, klikbare statusknoppen (Alle/Binnen/Gepland/Bevestigd/Opgeleverd/Geannuleerd) die de lijst filteren, en opdrachten gegroepeerd per status met gekleurde strip. Iconen en Lexend gelijk aan de app (Package=montage, Wrench=service, CalendarClock=datum).

Laatste keuze van Reinier: statusknoppen uniform zwart omlijst, wit van binnen (niet per kleur), actieve knop vult vol in. Lexend laadt via Google Fonts (internet nodig in de mockup; app zelf-host).

**Morgen verder:** Reinier dashboard nakijken, daarna detail-mock-up (kaart aanklikken opent klantdossier; PDF's als aanklikbare documenten, niet inline) en de agenda-mock-up in dezelfde stijl.
