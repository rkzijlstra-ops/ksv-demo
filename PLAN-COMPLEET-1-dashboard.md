# Plan blok 1: dashboard-overzicht (opdrachtgeverskant)

Datum: 2026-06-03
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (functielijst Dashboard), mockup `public/mockups/dashboard.html`
Bouwt op: blok 0 (datamodel + db-functies + helpers).
Aanpak: pure helpers met TDD; componenten gebouwd en geverifieerd via build + visuele check.
Stijl: echte app-tokens (`globals.css`, industrieel D) en bestaande bouwstenen, niet de mockup-CSS.

## Route
Nieuwe route `/dashboard` (server component, force-dynamic), naast de monteur-werkpool (`/`).
Kaarten linken voorlopig naar de bestaande `/opdracht/[id]`. Een dashboard-eigen detail
(opdracht-binnen/opgeleverd-mockups) en navigatie/rollen komen later (blok 6).

## Taken

### B1-1: pure helpers (TDD)
- `src/lib/dashboard-lijst.ts` (+ test): `zoekMatch` (klant/ref/monteur/adres), `filterOpdrachten`
  ({zoek, status}), `groepeerPerStatus` (in statusvolgorde, lege groepen overslaan).
- `src/lib/opdracht-weergave.ts` (+ test): `planningTijd` ("start 14 jun" / "12 jun · 10:00" /
  "Nog niet gepland"), `duurLabel` ("1 dag" / "N dagen").

### B1-2: kaart-componenten
- `src/components/OpdrachtStatusBadge.tsx`: status -> label + kleur + icoon (literal Tailwind
  classes per status; kleur+icoon+label conform design).
- `src/components/OpdrachtDashboardCard.tsx`: kaart met gekleurde strip, montage/service-badge,
  referentie, statusbadge, en status-afhankelijke meta (planning, duur, monteur / opgeleverd-datum).

### B1-3: te-doen + lijst
- `src/components/TeDoenOverzicht.tsx`: 4 klikbare tellers uit `teDoenTelling` (klik zet filter).
- `src/components/DashboardLijst.tsx` (client): houdt zoek- en statusfilter-state, rendert
  secties per status met live tellers, lege-staat-tekst, en de archiefnotitie.

### B1-4: pagina + afronden
- `src/app/dashboard/page.tsx`: haalt `getOpdrachtenVoorDashboard()` op, berekent `teDoenTelling`,
  rendert header (telling + aandacht), TeDoenOverzicht en DashboardLijst.
- `npm test` + `next build` groen. Logboek-entry. Commit.

## Niet in dit blok (bewust)
- PDF-inschiet-zone en handmatig invoeren (blok 2).
- Verstuur-knop-actie + mail naar monteurs (blok 3/4).
- Dashboard-eigen opdrachtdetail, navigatie monteur<->opdrachtgever, rollen (blok 6).
