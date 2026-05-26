# BRAINSTORM Sessie 1 - KSV Demo

Datum: 2026-05-26
Sessie-doel volgens PROJECT.md: backend opzetten, AI-koppelingen, PDF-uitlezen werkend (3-5u)
Werkwijze: projectstart-discipline skill, TDD waar zinvol

## Scope

### Wat erin zit (sessie 1)

- Next.js 15 project (TypeScript, App Router, pnpm)
- Supabase project aangemaakt door Rein, keys in `.env.local`
- Eén DB-tabel `meldingen` (breed datamodel, klaar voor sessie 2 en 3)
- API-route `POST /api/parse-pdf` die:
  1. PDF accepteert (multipart upload)
  2. Naar Claude API stuurt (native PDF-support, model `claude-sonnet-4-6` of nieuwer)
  3. Gestructureerde JSON terugkrijgt (klant, adres, ref-nr, adviseur, lijst meldingen)
  4. Valideert met Zod
  5. Opslaat in Supabase
- Fake voorbeeld-PDF gegenereerd die op Keller-format lijkt (testdata)
- Unit-tests (Vitest) voor parser-logica en Zod-schema
- Eén integration-test: PDF erin → rij in Supabase

### Wat er NIET in zit (uitgesteld naar latere sessies)

- UI / pagina's (sessie 2: monteur-input, sessie 3: Eds lijst)
- Realtime / live updates (sessie 3)
- PWA-config / manifest (sessie 4)
- Vercel deploy (sessie 4)
- Auth en accounts (helemaal niet in demo)
- Foto en spraak (sessie 2)
- Email-integratie voor PDF-binnenkomst (uit MVP-scope, blijft handmatige upload)
- Echte PDF van Keukenstudio (komt in sessie 2 voor verfijning parser)
- Echte productie-veiligheid (rate limit, RLS-policies, etc)

## Gebruikers

- **Rein zelf** (deze sessie): bouwt, test via curl en Supabase Studio
- **Latere gebruikers** (volgende sessies): monteur op telefoon (PWA), Ed op laptop

## Eindresultaat (verificatiecriteria sessie 1)

Sessie is "klaar" als al deze checks groen:

1. `pnpm dev` start zonder errors op `http://localhost:3000`
2. `pnpm test` slaagt — alle unit-tests groen
3. `curl -F "file=@test-pdfs/voorbeeld.pdf" http://localhost:3000/api/parse-pdf` geeft een JSON terug met `klant_naam`, `referentienummer`, en `meldingen[]` gevuld
4. In Supabase Studio: nieuwe rij zichtbaar in tabel `meldingen` met `bron='pdf'` en alle velden gevuld
5. `BRAINSTORM-1.md` en `PLAN-1.md` afgevinkt in project-map
6. Korte logboek-entry geschreven in `07_logboek`

## Happy path

1. Rein start sessie, opent VSCode in project-map
2. Rein maakt Supabase-account aan op supabase.com (nog geen account), start nieuw project, kopieert URL + anon-key + service-key. Reken 5-10 min extra.
3. Claude Code init Next.js + dependencies (pnpm)
4. Claude Code schrijft SQL voor `meldingen` tabel, Rein plakt in Supabase SQL editor
5. Claude Code schrijft Zod-schema voor parser-output (test eerst)
6. Claude Code schrijft Claude-client wrapper voor PDF (test eerst met mock)
7. Claude Code schrijft API-route die alles aan elkaar koppelt
8. Claude Code genereert fake voorbeeld-PDF
9. Curl-test: PDF erin → JSON eruit → rij in DB
10. Commit per taak, afvinken in PLAN-1.md

## Datamodel `meldingen` (eerste versie, mag uitbreiden)

| Veld | Type | Wanneer gevuld | Toelichting |
|---|---|---|---|
| `id` | uuid (PK) | altijd | Auto-gegenereerd |
| `created_at` | timestamptz | altijd | Auto |
| `bron` | text | altijd | `'pdf'` of `'monteur'` |
| `urgentie` | text \| null | alleen monteur | `'rood'` of `'geel'` |
| `klant_naam` | text \| null | meestal | Uit PDF of monteur-tekst |
| `klant_adres` | text \| null | meestal | Uit PDF |
| `referentienummer` | text \| null | meestal | Uit PDF, bijv `7444` |
| `adviseur` | text \| null | soms | Uit PDF |
| `meldingen` | jsonb | altijd | Array `[{keller_code, omschrijving, melding_tekst}]` |
| `foto_url` | text \| null | sessie 2+ | Supabase Storage URL |
| `spraak_tekst` | text \| null | sessie 2+ | Transcript |
| `ruwe_tekst` | text \| null | sessie 2+ | Wat monteur typte of insprak |

Voor sessie 1 raken we alleen de PDF-velden aan. Andere velden zijn nullable.

## Architectuur-keuzes

- **Package manager**: pnpm (snel, moderne Next.js standard)
- **Next.js**: 15 met App Router en TypeScript strict
- **PDF naar Claude**: native PDF-support van Claude API (geen losse parser-library). Reden: robuuster voor variaties in Keller-format, en Claude doet vision + tekst in één call. Iets duurder per call, maar parser-onderhoud nul.
- **Validatie**: Zod-schema voor wat Claude teruggeeft. Als Claude rommel terugstuurt, faalt validatie en krijg je een nette error.
- **Testing**: Vitest. Unit-test voor Zod-schema. Integration-test voor API-route mockt Claude-respons (echte Claude-call kost geld in CI).
- **DB-tabel**: SQL-bestand in repo `supabase/schema.sql`, Rein plakt in Supabase SQL Editor. Geen migrations-tool nodig voor MVP.
- **Geheimen**: `.env.local` (in .gitignore). `.env.example` zonder waardes wel in repo.
- **Git**: init in project-map, commit per taak met betekenisvolle naam.

## Edge cases (sessie 1)

| Risico | Aanpak in sessie 1 |
|---|---|
| Claude geeft geen geldige JSON | Zod faalt → HTTP 502 met ruwe response in log. Geen retry in sessie 1 (overhead). |
| Claude haalt niet alle velden eruit | Velden zijn nullable, parser geeft `null` waar veld ontbreekt. Geen fail. |
| PDF is enorm groot | Body-size limiet 10 MB. Daarboven → HTTP 413. |
| Supabase niet bereikbaar | API-route geeft HTTP 503 met error message. Fail loud. |
| `.env.local` niet aanwezig | App-start faalt expliciet met checklijst van missende vars. |
| Rein vergeet SQL te plakken in Supabase | Insert faalt → DB-error in log met hint "Heb je `supabase/schema.sql` al gerund?" |

## Voor sessie 2 op een rij gezet (niet vandaag)

- Monteur-input pagina (foto, spraak, urgentie) **via skill `ui-ux-pro-max`**
- Supabase Storage voor foto's
- Spraak naar tekst (Claude API of Whisper)
- Eerste echte test-PDF van Keukenstudio uploaden, parser fine-tunen

## Skill-keuze per sessie

- Sessie 1: geen UI, alleen `projectstart-discipline` (TDD voor parser)
- Sessie 2, 3, 4: `ui-ux-pro-max` activeren vóór er JSX geschreven wordt (styles, palettes, font-pairings benutten)
