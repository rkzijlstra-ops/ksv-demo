# BRAINSTORM Sessie 2A - Monteur-flow

Datum: 2026-05-28
Brainstorm-doc sessie 1: [BRAINSTORM-1.md](BRAINSTORM-1.md)
Sessie-doel: monteur kan op telefoon een complete melding maken; werkbak toont opdrachten; detail-scherm met nav/bel/foto's
Werkwijze: projectstart-discipline skill, UI via ui-ux-pro-max, TDD waar zinvol
Geschat: 4-6u

## Beslissingen uit brainstorm (2026-05-28)

1. **Mail in 2A: NEE.** "Verzenden" = status wordt 'verzonden' + rij opgeslagen/bijgewerkt in Supabase. Echte mail naar de zaak komt compleet in 2B (samen met inbound Gmail). Makkelijkst en consistent.
2. **Werkbak toont beide bronnen.** Monteur-meldingen (`bron='monteur'`) EN PDF-klussen (`bron='pdf'`). PDF-klussen komen in 2A binnen via een tijdelijke handmatige PDF-upload-knop; Gmail vervangt die in 2B.
3. **Spraak naar tekst: OpenAI Whisper API.** Key staat al in `trc-platform/.env`. Betrouwbaar NL. Audio-opname in browser → upload → Whisper → tekst terug.
4. **Status-model: concept / verzonden**, met `aangepast` als boolean-vlag op verzonden meldingen (geen aparte derde status).

## Scope

### Wat erin zit (2A)

**Datamodel-uitbreiding** (`meldingen` tabel + Storage):
- `status` text default 'concept' (check: concept | verzonden)
- `aangepast` boolean default false
- `verzonden_at` timestamptz nullable
- `foto_urls` jsonb default '[]' (array van Storage-urls; vervangt enkelvoudige `foto_url`)
- `klant_telefoon` text nullable (voor bel-knop, uit PDF)
- Supabase Storage bucket `meldingen-fotos` (publiek-lezen voor demo)

**Parser-uitbreiding:**
- `klant_telefoon` toevoegen aan ParsedPdfSchema + tool_use JSON-schema

**UI (ui-ux-pro-max), mobile-first PWA:**
- **Werkbak** (`/`): actief werk bovenaan (concept + niet-verzonden PDF-klussen), history (verzonden) achter tab/inklapbaar. Item toont klant, ref-nr, urgentie-kleur, bron-badge, status. Overzicht is leidend.
- **Detail-scherm** (`/opdracht/[id]`): klantgegevens, nav-knop (Android `geo:`, iPhone Google Maps), bel-knop (`tel:`) indien telefoon aanwezig, meldingen-lijst (PDF) of melding-invoer (monteur), foto's terugzien.
- **Melding maken** (monteur): foto's maken/kiezen (camera capture), spraak inspreken → Whisper → tekst OF tekst typen, urgentie (rood/geel), opslaan als concept of verzenden.
- **PDF-upload-knop** (tijdelijke bron): upload → bestaande `/api/parse-pdf` → verschijnt in werkbak.

**Nieuwe API-routes / server-acties:**
- `POST /api/transcribe` (audio → Whisper → tekst)
- Melding aanmaken/bijwerken (concept→verzonden, aangepast-vlag) — route of server action
- Foto-upload naar Storage (Supabase client of route)
- Werkbak + detail lezen via server components (directe Supabase-query)

### Wat er NIET in zit (2B of later)

- Echte mail naar de zaak (2B)
- Gmail-koppeling inbound (2B)
- "aangepast"-markering in mail (2B, want mail zelf is 2B)
- Live updates / realtime (sessie 3)
- PWA-manifest + installeerbaar (sessie 4)
- Vercel deploy (sessie 4)
- Auth (niet in demo)
- Klantgeschiedenis-tabellen (toekomstige feature, sessie 3-4+)

## Gebruikers

- **Monteur** op telefoon (PWA): maakt meldingen, ziet werkbak en detail. Niet-technisch, moet sneller zijn dan WhatsApp.
- **Rein** (deze sessie): bouwt en test op laptop + echte telefoon.

## Eindresultaat (verificatiecriteria 2A)

1. `npm run dev` start zonder errors
2. `npm test` slaagt (bestaande 24 + nieuwe tests)
3. PDF uploaden via knop → klus verschijnt in werkbak met klantgegevens
4. Detail-scherm opent: nav-knop + bel-knop werken (juiste deep-links), foto's zichtbaar
5. Monteur maakt melding: foto + ingesproken tekst (Whisper) + urgentie → opslaan als concept → verschijnt in werkbak
6. Concept openen, verzenden → status 'verzonden', verschuift naar history-tab
7. Verzonden melding aanpassen + opnieuw verzenden → `aangepast` vlag staat
8. Getest op echte telefoon (camera + microfoon werken)
9. PLAN-2A.md afgevinkt + logboek-entry

## Happy path (monteur)

1. Monteur opent app op telefoon, ziet werkbak met klussen van vandaag
2. Tikt op een klus → detail-scherm met klantgegevens
3. Tikt nav-knop → telefoon opent kaart-app met route
4. Doet de klus, ziet een probleem
5. Maakt foto('s), spreekt melding in (of typt), kiest urgentie rood/geel
6. Slaat op als concept (nog niet klaar) of verzendt direct
7. Verzonden melding verdwijnt uit actief, staat in history, blijft terugvindbaar

## Edge cases (2A)

| Risico | Aanpak |
|---|---|
| Geen telefoonnummer in PDF | Bel-knop verbergen (niet tonen als `klant_telefoon` null) |
| Geen internet op bouwplaats | Buiten 2A-scope (offline-support is complex). Wel: duidelijke foutmelding bij verzend-falen, concept blijft lokaal behouden tot upload lukt — minimale variant, niet volledige offline-sync |
| Microfoon/camera-permissie geweigerd | Nette melding + fallback naar tekst typen / bestand kiezen |
| Whisper-transcriptie faalt | Tekst blijft handmatig invulbaar, transcriptie is hulpmiddel niet verplicht |
| Grote foto's | Client-side compressie vóór upload (max ~1500px lange zijde) |
| Verzonden melding aanpassen | Toegestaan; zet `aangepast=true`, `verzonden_at` bijwerken |

## Open punten / aandachtspunten

- Offline-werking is bewust minimaal in 2A. Als bouwplaats-ontvangst een echt probleem blijkt bij testen, wordt het een aparte feature (sessie 3-4).
- Foto-compressie-library kiezen (browser-image-compression of canvas zelf).
- ui-ux-pro-max bepaalt stijl/kleur/typografie — design-keuze maken in taak 1 van het plan.
