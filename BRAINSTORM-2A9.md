# BRAINSTORM Sessie 2A.9 - Offline werken

Datum: 2026-05-30
Status: akkoord van Rein, gaat naar plan.

## Aanleiding

Pijnpunt uit zelf-gebruik: monteur staat in een kelder, parkeergarage, of oud huis met
dikke muren. Geen netwerk. App moet door blijven werken, anders is hij voor de
sociale interactie met collega's al onbruikbaar.

## Scope

### Wat moet offline werken
1. **Lezen**: werkbak + opdracht-detail + documenten + foto's, voor opdrachten die je
   eerder hebt geopend (auto-cache, geen "maak beschikbaar offline"-knop nodig).
2. **Melden**: tekst + foto offline invoeren. Wordt opgeslagen in IndexedDB-wachtrij,
   verstuurt automatisch zodra er netwerk is.
3. **UI-feedback**: dunne strip bovenaan met huidige offline-status + aantal wachtende
   items. Verdwijnt zodra online + queue leeg.

### Wat NIET offline werkt
- Spraak-naar-tekst (Whisper is cloud-only). Knop grijs, label "Netwerk nodig".
- Opleveren (genereert PDF + verstuurt mail). Knop grijs, label "Netwerk nodig".
- Nieuwe opdracht uit PDF (Claude-parsing is cloud). Knop grijs, label "Netwerk nodig".

### Wat we expliciet NIET bouwen
- Conflict-resolution tussen meerdere monteurs (RLS isoleert hen al).
- Multi-device sync voor één gebruiker (out of scope).
- Background Sync API (iOS Safari doet 'm niet).
- Push-notificaties bij sync-succes (later).

## Architectuur

### Drie lagen
1. **Service Worker** (via `serwist`, moderne next-pwa-opvolger voor Next 16 App Router):
   - App-shell (HTML/JS/CSS): cache-first
   - Bezochte pages (werkbak, opdracht-detail RSC-stream): stale-while-revalidate
   - Foto/PDF URLs uit Supabase Storage: cache-first, lange TTL
2. **IndexedDB** (via `idb`-library, ~1KB):
   - Store `melding_queue`: pending meldingen met tekst + spoed-vlag + opdracht-id
   - Store `foto_blobs`: foto's als blob tot upload kan
3. **Sync-pijp**: `window.addEventListener('online')` -> loop door queue -> upload
   foto's -> POST melding -> verwijder uit queue -> UI refresht.

### Data-model

```ts
melding_queue: {
  id,                  // lokaal UUID
  opdracht_id,
  spoed,
  ruwe_tekst,
  foto_blob_ids[],
  status: "wachtend" | "bezig" | "mislukt",
  pogingen,
  laatste_fout?,
  created_at,
}
foto_blobs: {
  id,
  blob,
  content_type,
  bestandsnaam,
}
```

### Sync-volgorde
1. Spoed-meldingen eerst (vlag `spoed=true`)
2. Daarna FIFO op `created_at`
3. Per melding: foto's sequentieel uploaden, dan POST melding
4. Bij failure: max 3 retries met 2/4/8s backoff, daarna status `mislukt` + handmatige
   retry-knop in UI

### Conflict-afhandeling
- Opdracht door iemand verwijderd: 404 -> toast "Opdracht bestaat niet meer", item
  blijft in queue voor handmatig oplossen
- Sessie verlopen: 401 -> redirect naar `/login`, queue blijft, sync hervat na re-login
- Server 503: retry-mechanisme

## Storage-veiligheid (iOS)

- iOS Safari PWA-storage ~1 GB en iOS kan het wissen bij ruimtegebrek
- Foto's client-side comprimeren VOOR opslag: JPEG q=0.7, max-zijde 1920px,
  ~200-500KB per foto. Library: `browser-image-compression` (~10KB) of eigen canvas
- `navigator.storage.estimate()` voor quota-detectie. Drempels op `usage`:
  - < 300 MB: niets melden
  - 300-500 MB: gele banner "Wachtrij wordt groot, zoek netwerk op"
  - > 500 MB: rode banner "Wachtrij vol. Maak geen foto's meer tot je netwerk hebt." +
    foto-knop grijs
- App-shell + page-cache nemen geen vasthoudende ruimte (browser ruimt LRU)

## UI-veranderingen samengevat

| Element | Online | Offline |
|---|---|---|
| Status-strip bovenaan | weg (lege queue) | dunne oranje balk met aantal wachtend |
| Toevoegen aan rapport | normaal | normaal + toast bij klikken |
| Inspreken | normaal | grijs + label "Netwerk nodig" |
| Opleveren | normaal | grijs + label "Netwerk nodig" |
| Nieuwe opdracht (werkbak) | normaal | grijs + label "Netwerk nodig" |
| Foto maken | normaal | normaal (blob lokaal) |
| Pending melding op opdracht-detail | n.v.t. | grijze achtergrond + klok-icoon + "wacht op netwerk" |

## Apparaten

- **Android Chrome**: primair (Rein test zelf). Service Worker + IndexedDB + manifest
  uitgebreid getest in webstandaarden.
- **iOS Safari**: belangrijk (collega's), Rein kan nu niet zelf testen. Bouw volgens
  standaarden: IndexedDB werkt sinds iOS 10, Service Worker sinds 11.3, PWA-install
  via "Voeg toe aan beginscherm" werkt al lang. Storage-limiet is bekend risico.
  Test via collega met iPhone.
- Geen iOS-simulator op Windows beschikbaar; iPhone-test moet door Rein of collega.
