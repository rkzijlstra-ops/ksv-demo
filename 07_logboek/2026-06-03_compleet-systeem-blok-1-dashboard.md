# Compleet systeem blok 1: dashboard-overzicht gebouwd

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md`, `PLAN-COMPLEET-1-dashboard.md`, mockup `dashboard.html`

## Wat gebouwd is

De opdrachtgeverskant: route `/dashboard` (server component) die de echte opdrachten toont,
gegroepeerd per status, doorzoekbaar en filterbaar, met de "Te doen"-tellers bovenaan en de
14-dagen-archief-scoping uit blok 0.

- `src/lib/dashboard-lijst.ts` (+ test): `zoekMatch`, `filterOpdrachten`, `groepeerPerStatus`.
- `src/lib/opdracht-weergave.ts` (+ test): `planningTijd` (dagblok vs tijdkaart) en `duurLabel`.
- `src/components/OpdrachtStatusBadge.tsx`: status -> kleur + icoon + label (literal tokens).
- `src/components/OpdrachtDashboardCard.tsx`: kaart met statusstrip, montage/service, referentie,
  status-afhankelijke meta (planning/duur/monteur, opgeleverd-datum, of binnen-datum), "geen ref".
- `src/components/TeDoenOverzicht.tsx`: 4 klikbare tellers (zetten het statusfilter).
- `src/components/DashboardLijst.tsx` (client): zoek + statusfilter + secties met live tellers.
- `src/app/dashboard/page.tsx`: haalt data op, berekent `teDoenTelling`, rendert header + lijst.

Stijl volgt de echte app-tokens (industrieel D) en bestaande bouwstenen, niet de losse mockup-CSS.

## Aangepast onderweg

`toegewezen_aan` (de toegewezen monteur) zat al als kolom in de database via `createOpdracht`,
maar ontbrak in het TypeScript-type `Melding`. Toegevoegd; build viel er eerst op om.

## Verificatie

- `npm test`: 279 groen (was 265, +14).
- `npm run build`: slaagt, `/dashboard` staat in de routelijst.
- Visuele check door Reinier: `npm run dev` en open `/dashboard`.

## Niet in dit blok (bewust, volgende blokken)

- PDF-inschiet-zone en handmatig invoeren (blok 2).
- Verstuur-knop-actie + mail naar monteurs (blok 3/4).
- Dashboard-eigen opdrachtdetail, navigatie monteur<->opdrachtgever, rollen/login per zaak (blok 6).

## Vervolg

Blok 2 (inschieten via PDF) of blok 3 (planbord, zelfbouw grid + dnd-kit).
