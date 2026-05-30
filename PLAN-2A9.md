# PLAN Sessie 2A.9 - Offline werken

Doel: monteur kan in de kelder/parkeergarage opdracht openen, melding maken met tekst
en foto, en uploaden zodra er weer netwerk is. Spraak/opleveren/PDF-aanmaken vereisen
netwerk (grijze knop).

## Volgorde
G PWA-fundament -> H Lezen offline (Service Worker) -> I IndexedDB-wachtrij + foto-
compressie -> J Sync-pijp -> K UI offline-states -> L Quota-detectie -> M Test + push.

---

## Blok G - PWA-fundament

### G1 Manifest + icons
- Bestand: `public/manifest.webmanifest`, `public/icons/icon-192.png`, `icon-512.png`
- Test: `next build` slaagt, manifest-link in head van werkbak-page
- Code: manifest met name "KSV", short_name "KSV", theme_color #27272a (anthraciet),
  start_url "/", display "standalone". Icons SVG-gegenereerd of placeholder met "K".
- Verifiëren: Chrome DevTools -> Application -> Manifest toont geldige config
- Tijd: 15 min
- Status: AFGEROND

### G2 Serwist installeren + service worker registreren
- Bestanden: `package.json` (deps), `next.config.ts`, `src/app/sw.ts`
- Test: `npx serwist build` slaagt; SW geregistreerd na page-load (DevTools)
- Code: `@serwist/next` dev-dep, wrap next config met `withSerwist`, sw.ts met basis
  runtime caching
- Verifiëren: DevTools -> Application -> Service Workers toont "activated and running"
- Tijd: 30 min

### G3 SW-registratie + update-prompt
- Bestanden: `src/components/SwRegistrar.tsx`, geïmporteerd in root layout
- Test: bij nieuwe deploy ziet user "nieuwe versie beschikbaar, herladen?" prompt
- Code: useEffect met navigator.serviceWorker.register, listen op updatefound
- Verifiëren: na deploy + reload zie je prompt
- Tijd: 20 min

---

## Blok H - Lezen offline (Service Worker caches)

### H1 App-shell cache
- Bestand: `src/app/sw.ts`
- Test: offline -> reload werkbak -> page laadt (uit cache)
- Code: serwist precaching van `/_next/static`, manifest, fonts
- Verifiëren: DevTools -> Network -> offline checkbox -> reload -> shell laadt
- Tijd: 20 min

### H2 RSC-cache (bezochte pages)
- Bestand: `src/app/sw.ts`
- Test: bezoek opdracht-X, ga offline, bezoek opnieuw -> rendert
- Code: runtime caching strategy stale-while-revalidate voor `/opdracht/*` en `/`
- Verifiëren: DevTools offline-test
- Tijd: 30 min

### H3 Storage-asset-cache (foto's + PDFs)
- Bestand: `src/app/sw.ts`
- Test: foto in een opdracht zichtbaar in offline-mode na eerste view
- Code: cache-first strategy voor `*.supabase.co/storage/v1/object/public/*`, max
  100 entries, max 30 dagen
- Verifiëren: DevTools Application -> Cache Storage bevat foto-URLs na bezoek
- Tijd: 25 min

---

## Blok I - IndexedDB-wachtrij + foto-compressie

### I1 IndexedDB-wrapper
- Bestanden: `src/lib/queue-db.ts`, `src/lib/queue-db.test.ts`
- Test: openQueueDb() returnt IDBPDatabase met stores melding_queue + foto_blobs
- Code: idb-library, version 1, twee object stores met juiste keypaths + indexen
- Verifiëren: vitest tests groen
- Tijd: 30 min

### I2 Foto-compressie client-side
- Bestanden: `src/lib/foto-compressie.ts`, `src/lib/foto-compressie.test.ts`
- Test: compress(file) -> blob met smaller filesize, max-zijde 1920, mime jpeg
- Code: browser-image-compression library, q=0.7
- Verifiëren: vitest met fake-image fixture
- Tijd: 25 min

### I3 Queue add/list/remove
- Bestanden: `src/lib/queue.ts`, `src/lib/queue.test.ts`
- Test: addToQueue(melding + foto's) -> listQueue() returnt entry; removeFromQueue(id)
- Code: high-level functies bovenop queue-db.ts
- Verifiëren: vitest tests
- Tijd: 30 min

### I4 MeldingForm offline-aware
- Bestand: `src/components/MeldingForm.tsx`
- Test: bij offline klikken op submit -> melding in IDB, redirect, toast
- Code: detect navigator.onLine; bij offline -> compress + addToQueue ipv fetch
- Verifiëren: handmatig in dev: offline-toggle, klik, check IDB in DevTools
- Tijd: 35 min

---

## Blok J - Sync-pijp

### J1 Sync-functie + retry
- Bestanden: `src/lib/sync.ts`, `src/lib/sync.test.ts`
- Test: syncQueue() upload elk wachtend item, increment pogingen bij fout
- Code: loop spoed-first dan FIFO, upload foto's sequentieel, POST melding, mark done
- Verifiëren: tests met mocked fetch
- Tijd: 40 min

### J2 Online-event listener + initial sync
- Bestand: `src/components/SyncBoot.tsx` (client-component in layout)
- Test: bij window.online-event of mount -> syncQueue draait
- Code: useEffect met listener, debounce, runt syncQueue
- Verifiëren: offline -> online toggle in DevTools triggert sync
- Tijd: 25 min

### J3 Sync-state via Context (voor UI-indicator)
- Bestanden: `src/lib/sync-context.tsx`
- Test: useSyncState() returnt {online, queueCount, isSyncing}
- Code: React Context die queue-veranderingen abonneert
- Verifiëren: component die context leest update bij queue-mutatie
- Tijd: 25 min

---

## Blok K - UI offline-states

### K1 Status-strip
- Bestand: `src/components/OfflineStrip.tsx`, in root layout
- Test: offline+queue=0 toont "Offline - 0 wachtend"; isSyncing toont groene strip
- Code: leest useSyncState, kleurt oranje/groen, verdwijnt bij online+leeg
- Verifiëren: handmatig
- Tijd: 25 min

### K2 Knop-states (spraak, opleveren, nieuwe opdracht)
- Bestanden: `src/components/MeldingForm.tsx`, `src/components/OpleverKnop.tsx`,
  `src/components/OpdrachtAanmaken.tsx`
- Test: bij offline -> knop disabled + label "Netwerk nodig"
- Code: useSyncState().online voor disabled-state
- Verifiëren: offline-toggle in DevTools
- Tijd: 30 min

### K3 Pending meldingen op opdracht-detail
- Bestand: `src/app/opdracht/[id]/page.tsx` + nieuwe `PendingMeldingen`-client
  component
- Test: pending melding toont grijze achtergrond + klok + "wacht op netwerk"
- Code: client-side mergen van queue-items voor opdracht_id met server-meldingen
- Verifiëren: offline melding maken, zien pending verschijnen
- Tijd: 30 min

---

## Blok L - Quota-detectie

### L1 Quota-checker
- Bestand: `src/lib/quota.ts`, `src/lib/quota.test.ts`
- Test: checkQuota() returnt {usage, quota, niveau: "ok"|"waarschuwing"|"vol"}
- Code: navigator.storage.estimate() + drempels (300MB/500MB)
- Verifiëren: tests met mocked navigator.storage
- Tijd: 20 min

### L2 Quota-waarschuwing UI
- Bestanden: `src/components/QuotaWaarschuwing.tsx` ; geintegreerd in OfflineStrip of
  separaat
- Test: bij niveau "waarschuwing" -> gele banner; "vol" -> rode banner + foto-knop
  grijs
- Code: subscribed op checkQuota interval (na elke queue-mutatie)
- Verifiëren: handmatig (DevTools storage-quota override is beperkt; testen door veel
  foto's te queue'en)
- Tijd: 25 min

---

## Blok M - Test + push

### M1 Tests groen
- Verifiëren: `npm test` -> alle 161+nieuw groen
- Tijd: 5 min

### M2 Build + lokale offline-test in Chrome DevTools
- Verifiëren: `next build` slaagt, lokaal `next start`, DevTools offline-toggle, golden
  path doorlopen
- Tijd: 20 min

### M3 Push naar Vercel + Android-test
- Verifiëren: Rein test op zijn Android (Chrome) in airplane-mode, golden path
- Tijd: 20 min

### M4 iPhone-test via collega
- Verifiëren: collega met iPhone test PWA-installeer + offline + sync. Rein meldt
  bevindingen, eventueel hotfix in losse mini-blok.
- Tijd: variabel (afhankelijk van collega-beschikbaarheid)

---

## Schatting

| Blok | Tijd |
|---|---|
| G PWA-fundament | ~65 min |
| H Lezen offline | ~75 min |
| I IndexedDB + compressie | ~120 min |
| J Sync-pijp | ~90 min |
| K UI states | ~85 min |
| L Quota | ~45 min |
| M Test + push | ~45 min + iPhone-test variabel |
| **Totaal bouwen** | **~9 uur exclusief iPhone-test** |

Realistisch: 2 bouwsessies van ~4 uur, of opgedeeld in een 'lezen offline + manifest'
deel (G + H) en een 'schrijven offline + sync + UI' deel (I + J + K + L) met
tussentijdse push naar Vercel.

## Open punten ontdekt tijdens blok G

### PWA + Google OAuth opent niet standalone (Android Chrome)
- Bevestigd door Rein op zijn Android: na Google OAuth opent app niet meteen
  full-screen, ververs nodig. Magic link heeft het niet.
- Oorzaak: Android Chrome Custom Tabs vangt de OAuth-callback en geeft 'm niet
  terug aan de PWA-context.
- Eerste mitigatie geprobeerd: `id` + `scope` expliciet in manifest (blok G commit).
- Mogelijke vervolgfix: tussenroute `/auth/post-login` met client-side
  `matchMedia('(display-mode: standalone)')`-check en `location.replace` met
  query-trick om Android te verleiden PWA opnieuw te openen.
- Alternatief: magic link prominenter dan Google OAuth zetten.
- Niet blocker voor H. Beslis na zelf-test of fix nodig is.

## Wat we expliciet NIET doen in 2A.9

- Conflict-resolution tussen monteurs (RLS isoleert al)
- Multi-device sync voor één gebruiker
- Background Sync API (iOS Safari ondersteunt niet)
- Push-notificaties
- Spraak offline (audio opslaan + transcriberen later)
- Opleveren offline (mail vereist netwerk)
- Nieuwe opdracht uit PDF offline (Claude-parsing is cloud)

## Na 2A.9

Pas dan naar **2B (Gmail-koppeling Ed)** zodra Ed gesproken is en de scope helder is.
