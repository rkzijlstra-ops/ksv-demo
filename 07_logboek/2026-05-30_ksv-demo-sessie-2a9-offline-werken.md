# KSV Demo - Sessie 2A.9 (Offline werken)

Datum: 2026-05-30 (na 2A.5 op dezelfde dag)
Project: `01_projecten/keukenstudio-voorschoten-demo`
Live: <https://ksv-demo.vercel.app>

## Aanleiding

Na 2A.5 (auth + RLS) waren we klaar voor zelf-test door collega's. Rein noemde
één pijnpunt dat hij eerst wilde dichten: geen netwerk in kelder/parkeergarage/
oude muren betekende dat de app onbruikbaar werd. Voor monteur in praktijk
essentieel.

Doel: monteur kan zonder bereik een opdracht openen, een melding maken met
tekst en foto, en zodra hij weer in bereik is gaat alles vanzelf de lucht in.

## Scope-keuzes (brainstorm)

- Lezen offline + melden offline + sync bij online-event
- Spraak/opleveren/PDF-opdracht-aanmaken: grijs offline (te complex om in
  wachtrij te zetten)
- Bewerken offline: niet ondersteund (race-conditions met server)
- Multi-device sync, push-notificaties, Background Sync API: out of scope

## Gebouwd

### G - PWA-fundament
- `src/app/manifest.ts` met id + scope + theme_color #27272a + standalone display
- `src/app/icon.svg` en `src/app/apple-icon.tsx` (180x180 via next/og ImageResponse)
- `public/sw.js` handgeschreven (`@serwist/next` bleek niet compatibel met Next 16
  Turbopack default, eigen SW is future-proof en past bij beperkte scope)
- `SwRegistrar` client-component in root layout

### H - Lezen offline
Drie cache-strategieen in `public/sw.js`:
1. `/_next/static/*` (gehashte chunks) -> cache-first
2. `/` en `/opdracht/*` HTML/RSC -> **network-first** (mutaties direct zichtbaar
   zonder refresh)
3. `*.supabase.co/storage/*` en `/_next/image` -> cache-first met lange TTL

Plus `PrefetchOpdrachten`: na werkbak-render fetcht op de achtergrond per
opdracht drie URLs (detail, melding-formulier, rapport) zodat de hele
doorkliklus offline werkt. Skipt URLs die al gecached zijn, 1.5 s pauze tussen
fetches, `priority: "low"` zodat user-POSTs voorrang krijgen.

`vernieuwOfflineCache()` helper in `src/lib/sw-cache.ts`: client roept dit aan
na elke mutatie zodat de HTML-cache van bezochte pages wordt geupdate (RSC-fetch
van router.refresh() landt onder een andere cache-key dan navigate).
Geintegreerd in 7 mutatie-componenten.

### I+J - Schrijven offline en sync-pijp
- `src/lib/queue-db.ts`: IndexedDB-schema (idb-library) met stores
  `melding_queue` en `foto_blobs`
- `src/lib/queue.ts`: voegToeAanQueue, haalQueueOp (sorteert spoed-first dan
  FIFO), markeerStatus, verwijderUitQueue, bewaarFotoBlob, leesFotoBlob,
  aantalInQueue, resetMislukteItems
- `src/lib/sync.ts`: syncQueue() loopt door wachtende items, upload lokale
  foto-blobs via /api/upload-foto en POSTed melding via /api/meldingen. Max 3
  pogingen, daarna status "mislukt"
- `src/components/SyncBoot.tsx` in root layout: initial sync na mount + reageert
  op `window.online`-event (eerst reset mislukt, dan sync)
- `FotoMaken` offline-tak: comprimeert lokaal (bestaande canvas-compressie),
  bewaart blob in IndexedDB, preview via object-URL met "Wacht"-badge
- `MeldingForm` offline-tak: route naar queue + alert "wordt verstuurd zodra je
  weer netwerk hebt"
- `src/lib/sync.test.ts`: dekt lege queue, succes, single retry, 3x falen ->
  mislukt, spoed-first volgorde

### K - UI offline-states
Event-bus zonder Context-boilerplate:
- `src/lib/sync-state.ts`: publish/abonneer op queue-mutaties en sync-bezig
- `src/lib/use-offline-state.ts`: hook met `{ online, queueCount, isSyncing }`
- queue.ts en sync.ts dispatchen events

Componenten:
- `OfflineStrip` bovenaan viewport (sticky, dunne 24-px balk), drie staten:
  offline (oranje), bezig met versturen (groen), verborgen bij online + lege
  queue
- `PendingMeldingen` op opdracht-detail: gestreepte border, klok-icoon, "Wacht
  op netwerk" of rood "Versturen mislukt", spoed-badge, foto-aantal. X-knop voor
  handmatig verwijderen van vastzittende items
- Knop-states bij offline: CloudOff-icoon + "Netwerk nodig" label voor:
  SpraakOpname, OpleverKnop, OpdrachtAanmaken (beide knoppen), DocumentToevoegen

### L - Storage-quota
- `src/lib/quota.ts`: navigator.storage.estimate met drempels 300 / 500 MB
  (iOS Safari wist rond 1 GB, dus flinke marge)
- `src/lib/use-quota.ts`: hook met 30 s-poll plus refresh op queue-events
- `QuotaBanner` onder OfflineStrip: oranje bij waarschuwing, rood bij vol
- FotoMaken: foto-knoppen disabled bij niveau "vol"

## Bijwerkingen onderweg

Tijdens de zelftest door Rein op zijn Android een paar live-bugs opgelost:

1. **Aanmaak/wis pas zichtbaar na refresh**: stale-while-revalidate gaf eerst de
   oude RSC. Opgelost door network-first voor pages.
2. **Niet-bezochte opdrachten leeg offline**: PrefetchOpdrachten toegevoegd, en
   later uitgebreid van alleen `/opdracht/[id]` naar drie URLs per opdracht
   (incl. melding-formulier en rapport) toen Rein "Offline en niet in cache"
   kreeg bij melding toevoegen.
3. **Dubbele Turnhout-opdracht na trage upload**: bezigRef in OpdrachtAanmaken
   (synchroon ipv state-update) blokkeert nu dubbel-tap.
4. **Werkbak offline leeg na mutatie**: router.refresh() doet RSC-fetch onder
   andere cache-key dan navigate. `vernieuwOfflineCache()`-message naar de SW
   ververst alle navigate-URLs in cache na elke mutatie (7 componenten
   geintegreerd).
5. **"Wacht op netwerk" bleef hangen met netwerk aan**: items met status
   "mislukt" en pogingen=3 werden niet meer geprobeerd maar telden wel mee.
   resetMislukteItems() bij `online`-event geeft ze een verse kans, plus
   X-knop op pending-kaart voor handmatige cleanup.
6. **PWA + Google OAuth opent niet meteen standalone op Android Chrome**:
   bekend issue (Custom Tabs vangt callback). Eerste mitigatie via expliciete
   `id` + `scope` in manifest. Niet-blocker, vervolgfix als nodig.

## Stand

- Sessie 2A.9 volledig opgeleverd. 166 tests groen, build slaagt, productie
  draait.
- Functioneel offline: lezen + melding met foto's maken + sync zodra netwerk
  terug is + visuele feedback (offline-strip, pending-kaarten, knop-states) +
  storage-quota-waarschuwing.
- Commits: `4f7f1bc` (G), `af09624` + `59e0d8d` + `1d86008` + `409db19` +
  `9bc242f` (H + opvolgfixes), `9577843` (I+J), `b387481` (K+L), `98ebf49`
  (mislukt-reset).

## Open punten (voor later)

- **iOS Safari-test**: Rein heeft Android, collega met iPhone moet de PWA-
  installeer, offline-flow en sync nog op iOS doorlopen.
- **PWA + Google OAuth fullscreen-quirk**: handmatige refresh nodig na Google-
  login. Mitigatie via tussenroute `/auth/post-login` met `display-mode`-check
  is mogelijk; magic link prominenter zetten is alternatief.
- **Spoed-mail bij offline melding**: tijdens sync wordt de melding wel
  opgeslagen maar de spoed-mail wordt nog overgeslagen. Handmatige "spoed
  versturen" werkt na sync. Volledige spoed-flow in queue is nog werk.
- **Offline editen van bestaande melding**: nu expliciet geweigerd met
  foutmelding. Eventueel later via een conflict-arme aanpak (last-write-wins).
- **PDF-parsing op upload duurt 20-30 sec**: cosmetic UX (loading-stat met "Bezig
  met PDF lezen…") kan, structurele fix (async parse + queue) is later werk
  als de demo dit echt blokkeert.

## Na 2A.9

Zelftest met collega-zzper (die ook voor Ed werkt) gaat door. Pas na hun
feedback en gesprek met Ed naar **2B (Gmail-koppeling)**, met de juiste scope
die uit dat gesprek komt.
