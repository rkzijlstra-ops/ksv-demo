# KSV Demo - Sessie 1 gebouwd

Datum: 2026-05-26
Project: `01_projecten/keukenstudio-voorschoten-demo`
Doel sessie 1: backend opzetten, AI-koppelingen, PDF-uitlezen werkend
Duur werkelijke sessie: ~90 min (geschat 3-5u, ruim binnen budget)

## Wat is gebouwd

End-to-end werkende backend voor PDF-extractie:
- Next.js 16.2.6 skeleton (TypeScript strict, App Router, src-dir, npm)
- Supabase project `ksv-demo` (BKM AI org, eu-west-1) met tabel `meldingen` (12 velden, 2 indexen)
- `src/lib/env.ts` met Zod-validatie van 5 env-vars + `npm run check:env` CLI
- `src/lib/parser-schema.ts` met Zod-schema én handmatig JSON-schema voor Anthropic tool_use
- `src/lib/claude-client.ts` die PDF naar Claude API stuurt (model `claude-sonnet-4-6`) met geforceerde tool_use voor structured output
- `src/lib/db.ts` met Supabase server-side client + `insertPdfMelding`
- `POST /api/parse-pdf` route: multipart-upload, 10MB limit, scherpe HTTP-statussen (200/400/413/502/503)
- `scripts/generate-fake-pdf.ts` (pdf-lib) genereert een Keller-style test-PDF
- **24 unit/integration tests groen**, 5 test-files

Bewezen end-to-end: `curl -F "file=@test-pdfs/voorbeeld.pdf" http://localhost:3001/api/parse-pdf` → JSON met klant J. Jansen, ref 7444, 2 meldingen correct geparsed, rij `9e4d149e-...` zichtbaar in Supabase Table Editor.

## Werkwijze

Eigen `projectstart-discipline` skill toegepast: brainstorm → design-tonen → plan in groepen van 5 taken → TDD bouwen → review. Werkte goed. Brainstorm en plan namen samen ~20 min, voorkwam vibe-coding en gaf duidelijke check-momenten met Rein per groep.

Strict TDD (test eerst, RED-GREEN) bij alle parser/db/route-code. Vertrouwen tijdens debug-fase: bij Supabase-permission-error wisten we zeker dat code zelf correct was, dus zochten alleen in infrastructuur.

Aanpak B (Anthropic tool_use met geforceerde JSON-schema) voor structured output uit Claude. Reins keuze gebaseerd op "demo wordt direct ingezet voor echte KSV-opdrachten, geen ruimte voor werkt-meestal". Geen retry-logic nodig, eerste call gaf direct schone JSON.

## Wat tegenviel en hoe opgelost

1. **pnpm niet geïnstalleerd** → npm gebruikt. Geen drama.
2. **create-next-app weigert non-empty dir** → MD's tijdelijk verplaatst naar `..\_tmp_ksv_md`. 2 min verlies.
3. **`.env.example` per ongeluk gegitignored** door `.env*` regel → opgelost met `!.env.example` whitelist.
4. **Vitest mock werkte niet als constructor** → class-pattern met `vi.hoisted` ipv `vi.fn().mockImplementation`.
5. **Supabase RLS + GRANTs (grootste verlies, ~7 min)**: nieuwe public-tabellen in BKM AI org hebben default RLS aan, en in dit geval ook geen automatische GRANTs voor service_role. Diagnostiek: directe SQL-insert in Supabase Studio werkte, dus probleem zat in PostgREST-laag. Opgelost door `schema.sql` aan te vullen met `disable row level security` + expliciete `grant` voor anon/authenticated/service_role. Memory geschreven voor toekomst.

## Klaar voor sessie 2

Geen blocking issues. Sessie 2 kan voortbouwen op alle backend-componenten.

**Voor sessie 2 (monteur-input PWA):**
- Skill `ui-ux-pro-max` activeren vóór er JSX wordt geschreven (vastgelegd in project-memory)
- Foto-upload via Supabase Storage (nieuwe lib)
- Spraak naar tekst (Claude API of Whisper)
- Urgentie-keuze (rood/geel)
- Pagina + form-route die rij in `meldingen` schrijft met `bron='monteur'`
- Eerste echte Keukenstudio-PDF als parser-stresstest (om te verfijnen waar fake-PDF afwijkt van Keller-format)

## Bestanden en commits

PLAN-1.md en BRAINSTORM-1.md staan in `01_projecten/keukenstudio-voorschoten-demo/`. Git-log toont 8 commits chronologisch per groep (skeleton → docs → A → B+C → D → E → F → G).

## Conclusie

Eerste echte bouwsessie met projectstart-discipline-skill verliep gestructureerd en sneller dan ingeschat. Backend-fundament staat solide. Demo ligt op koers om in 3-4 sessies klaar te zijn voor het gesprek met Ed.
