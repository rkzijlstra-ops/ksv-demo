# Compleet systeem blok 6b-1: routing per rol

Datum: 2026-06-04
Project: KSV demo-app

## Wat gebouwd is

Elke beschermde pagina kent nu de rol van de ingelogde gebruiker en stuurt door waar nodig:
- niet ingelogd -> /login
- ingelogd zonder profiel -> /geen-toegang (nieuwe pagina met uitleg)
- verkeerde rol -> naar de eigen startpagina (monteur -> werkpool, opdrachtgever/beheerder -> dashboard)

- `src/lib/toegang.ts`: `vereisRol(toegestane)` + `startpaginaVoorRol(rol)`.
- Gates: `/` (monteur+beheerder), `/dashboard` + `/planbord` + `/dashboard/opdracht/[id]`
  (opdrachtgever+beheerder), `/mensen` (beheerder).
- `/geen-toegang` pagina.

Beheerder (Reinier) heeft toegang tot alles, dus solo-testen blijft werken. Een opdrachtgever die
op de werkpool komt gaat naar het dashboard; een monteur die het dashboard probeert gaat naar de
werkpool.

## Verificatie

- `npm test`: 345 groen.
- `npm run build`: slaagt. Geen SQL nodig (gebruikt de profielen uit 6a).

## Vervolg

6b-2: monteur-dropdown op het planbord (echte accounts, `toegewezen_aan` uuid zetten) + mail naar
het echte monteur-adres. Daarna 6c (RLS).
