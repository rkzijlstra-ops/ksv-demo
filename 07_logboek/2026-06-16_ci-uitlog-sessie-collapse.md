# CI e2e rood: uitlog-test nekte de gedeelde monteur-sessie

Datum: 2026-06-16
Branch: ci-stabilisatie

## Klacht

CI bleef rood op de browser-e2e: 9 tests hard gefaald (verzending, werkpool-zichtbaarheid,
zelf-invoer), 1 flaky (inbox). Lokaal groen. Vorige sessie zat op een dwaalspoor: diag-logging op
`getWerkpoolVoor` (de werkpool-count), plus "ruimere timeouts" en "next dev i.p.v. next start". Geen
daarvan hielp, want de oorzaak zat niet in de werkpool-datalaag en niet in timing.

## Onderzoek (systematisch, met bewijs)

1. **Werkpool-data is in orde.** Probe-insert in de test-DB: `gewijzigd_te_versturen` defaultt netjes
   naar `false`, en de werkpool-`.or()`-filter vindt de rij. De NULL-vs-false-hypothese was fout.
2. **Echte faalmodus uit het artefact.** De page-snapshot bij elke harde fout toont het **inlogscherm**
   ("Kluslus / Login", heading "Inloggen"). De trace toont `GET / -> 307 -> /login`. Dus de middleware
   (`supabase-middleware.ts`, `getUser()` -> null) stuurt elke monteur-pagina naar /login.
3. **Cliff in de tijd.** Alles vanaf ~20:06:30 faalt; daarvoor slaagt bijna alles. De laatste geslaagde
   monteur-test was terugmelden (20:06:11), daarna draaide **uitloggen** (20:06:12), daarna faalt elke
   monteur-test. Beheerder-tests ertussen (verplaatsen-detail, verzending data-laag) slaagden: die
   sessie leeft nog. Dus specifiek de **monteur-sessie** ging dood.
4. **Token is niet verlopen.** JWT-TTL is 3600s; de sessie is ~5 min oud. Geen expiry, geen
   rate-limit, geen netwerkfout (getUser-round-trip is normale 198ms en geeft gewoon "geen user").
   Dus: **sessie server-side ingetrokken.**
5. **Empirisch gereproduceerd.** `signOut({ scope: "local" })` revoket de sessie tóch server-side:
   na een local-signOut geeft `getUser()` met hetzelfde access-token NULL. `setSession` alleen is
   onschuldig. Multi-sessie per user is wél toegestaan (een 2e login nekt de 1e niet).

## Oorzaak

De app-logout (`UserMenu.tsx`: `signOut({ scope: "local" })` + harde navigatie) is correct voor
productie. Maar de e2e deelt ÉÉN sessie (`monteur.json`) over alle monteur-tests. De uitlog-test logt
die gedeelde sessie uit, waardoor hij server-side dood gaat en elke volgende monteur-test (alfabetisch
na 'u': verzending, werkpool-zichtbaarheid, zelf-invoer) op /login belandt. Lokaal groen omdat... dit
reproduceert juist wél tegen het gedeelde test-project, dus "lokaal groen" was vermoedelijk een oude/
deelrun. Aandachtspunt voor Rein.

## Fix (alleen in de tests, app ongemoeid)

- Nieuw: `e2e/sessie-cookies.ts` -> `verseSessieCookies()` mint een losse wegwerp-sessie (zelfde
  cookie-vorm als global-setup).
- `e2e/uitloggen.spec.ts`: gebruikt niet meer `monteur.json` maar een eigen verse sessie. Uitloggen
  nekt dan alleen die wegwerp-sessie; de gedeelde sessie blijft leven.
- `e2e/inbox.spec.ts`: de inbox-flake was een aparte race (click "Bevestigen" -> meteen `goto("/")`
  annuleert de nog lopende async POST). Nu wacht de test op de bevestig-POST vóór navigatie.
- Diag-logging verwijderd uit `src/lib/db.ts` en `src/app/api/opdrachten/route.ts` (zat op de verkeerde
  laag, mag niet shippen).

Typecheck groen. Verificatie = groene e2e-run (door Rein / push naar CI).

## Les

Een gedeelde storageState-sessie + een test die uitlogt = collapse voor alle volgende tests met die
sessie. Een sessie-vernietigende test hoort een eigen wegwerp-sessie te krijgen. En: instrumenteer bij
"data verschijnt niet" eerst de auth-/middleware-laag (belandt de request op /login?) vóór de datalaag.
