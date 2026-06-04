# Fix: valse "Offline"-melding

Datum: 2026-06-04
Project: KSV demo-app

## Probleem

De oranje "Offline"-balk bovenaan stond constant, op laptop én telefoon, terwijl er gewoon
internet was. Oorzaak: de code vertrouwde blind op `navigator.onLine`, en die vlag meldt soms
ten onrechte "offline" (bekend zwak punt van die browser-API).

## Oplossing

`useOfflineState` vertrouwt `navigator.onLine` nog wel als die "online" zegt (snel, geen extra
request), maar doet bij "offline" een **echte mini-check** tegen een nieuw endpoint `/api/ping`.
De service worker laat `/api/`-routes altijd door naar het netwerk, dus dat is een betrouwbare
verbindingstest. Lukt de ping, dan zijn we online en verdwijnt de balk; faalt hij, dan zijn we
echt offline. Extra: ook bij terugkeren naar het tabblad (focus/visibilitychange) wordt opnieuw
gecheckt.

- `src/app/api/ping/route.ts`: mini GET-endpoint (200), geen auth.
- `src/lib/use-offline-state.ts`: bevestigOnline() met de ping-check; start optimistisch online.

## Verificatie

- `npm test`: 353 groen.
- `npm run build`: slaagt, `/api/ping` in de routelijst.
- Live testen: na pushen even hard verversen (Ctrl+F5) zodat de nieuwe code geladen wordt.
