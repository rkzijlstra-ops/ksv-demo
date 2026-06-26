# Icoon-kaart (levend overzicht)

Naslag voor welke iconen waarvoor staan, zodat de app consistent blijft. Tegenhanger van de
kleurenkaart (de kleur-tokens staan in `src/app/globals.css`, regels 3-19). Icoon-set:
**lucide-react**. Gebruik altijd een icoon uit deze kaart voor een bestaande betekenis; voeg een
regel toe als er een nieuwe betekenis bijkomt.

## Documenten en media

| Betekenis | lucide-icoon | iconKey (document-weergave.ts) | Kleur |
|---|---|---|---|
| Orderbon / orderbevestiging | `FileText` | orderbon | ink |
| Bovenaanzicht (tekening) | `Map` | bovenaanzicht | accent |
| Leidingschema (tekening) | `Spline` | leidingschema | accent |
| Tekening / schema (overig) | `PencilRuler` | tekening | accent |
| Offerte | `FileText` | offerte | ink |
| Werkbon (service) | `ClipboardList` | werkbon | ink |
| Foto / afbeelding | `Image` | afbeelding | ink-muted |
| Overig document | `File` | overig | ink-muted |
| Oplever-video | `Video` | - | ink-muted |
| Opleverrapport-PDF openen | `FileBarChart` | - | success |
| Document openen (in de app) | `Maximize2` | - | primary |
| Extern openen (nieuw tabblad) | `ExternalLink` | - | primary |
| Offline beschikbaar maken | `Download` / `DownloadCloud` | - | primary |
| Niet online (offline-indicator) | `CloudOff` | - | ink-muted |

De soort wordt afgeleid uit de bestandsnaam (`documentSoort`) en gekoppeld aan label + iconKey
(`documentMeta`) in `src/lib/document-weergave.ts`. De React-component mapt `iconKey` op het
lucide-component hierboven.

## Algemene app-iconen (bestaand)

| Betekenis | lucide-icoon |
|---|---|
| Toevoegen | `Plus` |
| Verwijderen | `Trash2` |
| Bezig / laden | `Loader2` (spin) |
| Fout | `AlertCircle` / `AlertTriangle` |
| Handtekening | `PenLine` |
| Planning / status | `FileCheck` |
| Bevestigen / akkoord | `Check` |
| Vorige / volgende | `ChevronLeft` / `ChevronRight` |
| Sluiten | `X` |
| Bellen / navigeren / WhatsApp | `Phone` / `MapPin` / (WhatsApp-knop) |

## Kleur-tokens (zie kleurenkaart in globals.css)

`surface, ink, ink-muted, line, primary, primary-ink, accent, urgent-rood, urgent-geel, success,
bevestigd`. Gebruik tekening-soorten met `accent` (merk-oranje) zodat de monteur ze er snel uit pikt.
