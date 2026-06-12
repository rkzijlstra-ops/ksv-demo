# 2026-06-12 Cloud-CI: tests van de lokale machine af

Aanleiding: de browser-e2e liep telkens vast op Reins Windows-machine (achtergebleven `next dev`-servers,
volgelopen poort 3001, hangende pushes). Afspraak: e2e draait Rein zelf in PowerShell, Claude nooit.
Structurele fix: tests naar de cloud.

## Wat er nu staat

- **GitHub Actions** (`.github/workflows/ci.yml`) draait bij elke push: typecheck, unit, integratie en
  browser-e2e. De testomgeving komt uit repo-secret `ENV_TEST` (de inhoud van `.env.test`).
- **Lokale pre-push hook** is licht: alleen unit + typecheck (snel, geen server, hangt nooit). De zware
  e2e is van de lokale machine af.

## Vallen onderweg (en de fixes)

1. **e2e met dev-server hing ook in de cloud** (pagina-voor-pagina compileren). Fix: in CI draait de e2e
   tegen een **productie-build** (`next build` + `next start`), Playwright-config is CI-bewust
   (`inCI ? next start : next dev`). Snel, geen hang.
2. **Uploads faalden in de cloud**: de server-env-validator (`src/lib/env.ts`) eist
   `SUPABASE_PUBLISHABLE_KEY` (zonder NEXT_PUBLIC) plus `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`. Die komen
   lokaal uit `.env.local`, niet uit `.env.test`/het secret. In CI nu geforceerd in de workflow:
   publishable afgeleid uit de NEXT_PUBLIC-variant, AI-keys als geldige dummy (e2e roept ze niet aan).
3. **Eén test in quarantaine**: `monteur-pwa.spec.ts:82` (melding met foto). De client-side
   foto-compressie (`canvas.toBlob`) blijft in de schermloze cloud-browser hangen op de melding-pagina,
   terwijl exact dezelfde upload op het oplever-scherm wél slaagt. Geen app-fout, nog niet doorgrond.
   `test.skip(!!process.env.CI, ...)` zodat de cloud groen is; lokaal draait hij wel. Open klusje om de
   echte oorzaak te vinden.

Resultaat: cloud-CI groen op unit (544) + integratie (13) + e2e (52 van 53, die ene lokaal).

## Diagnose-gereedschap

- `gh run view <id> --log-failed` en `gh run download <id> -n e2e-resultaten` halen de cloud-logs/trace
  op, zodat falende cloud-tests te onderzoeken zijn zonder lokaal iets te draaien.
