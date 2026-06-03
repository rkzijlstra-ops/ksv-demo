# KSV Demo - Sessie 2A.7 (melding-flow herontwerp) + Vercel-deploy

Datum: 2026-05-30 (sessie startte 29-05 's avonds, doorgelopen tot vroeg 30-05)
Project: `01_projecten/keukenstudio-voorschoten-demo`
Live URL: <https://ksv-demo.vercel.app>
Repo: <https://github.com/rkzijlstra-ops/ksv-demo>

## Sessie 2A.7 - Melding-flow herontwerp + kleur-staat-taal

Live-feedback na 2A.6: rood/geel-urgentie ("DIRECT/ACHTERAF") was vaag en te prominent. Werkelijke
flow: monteur zet meldingen klaar, levert 's avonds op. Spoed is uitzondering.

### Gebouwd (D0-D9, TDD)

- Migratie `schema-2a7-spoed.sql`: `spoed boolean` + `spoed_verzonden_at timestamptz` op meldingen.
- db: `spoed` i.p.v. urgentie in inputs; `markeerSpoedVerzonden`; `getMeldingTellingen` (werkbak).
- lib/mail: `verstuurSpoedMelding` (losse tekst-mail naar kantoor, geen PDF).
- API: meldingen create/patch accepteren `spoed`; nieuw `POST /api/meldingen/[id]/spoed-versturen`
  met retry-pad bij mail-fout.
- lib/rapport: SPOED-regel per melding + "al als spoed verstuurd op [tijd]".
- MeldingForm herontworpen: foto BOVEN tekst (natuurlijke volgorde), rood/geel weg,
  Spoed-schakelaar + "?"-uitleg (tap-to-expand), hoofdknop wordt rood bij spoed met bevestiging.
  Concept-knop verwijderd (Rein's vraag: deed niets onderscheidends).
- Kleur-staat-taal: rood=spoed, oranje=open/wachtrij, groen=opgeleverd. `MeldingStaatBadge` +
  uitgeklede `urgentie.ts`. UrgentieBadge + urgentieConfig opgeruimd (dood na herontwerp).
- Werkbak: 8px gekleurde linker-strip per opdracht (kleur-staat). Open-meldingen-teller per kaart.

### Live geverifieerd (D9)

- Spoed-flow: melding met Spoed aan -> bevestiging -> directe mail (binnen) + komt later ook in rapport.
- Normale melding: in wachtrij; oplevering bundelt alles in rapport (gemaild via Resend, werkt door
  vanaf 2A.6).

## Visuele iteratie - industrieel D-stijl

Rein wilde "meer kleur, minder paars-blauw, minder hard". Na meerdere ronden + 4 mockups
(`/public/mockups/`) keuze: industrieel D, variant D1 (kop) + B1 (knop), anthraciet ipv pure
slate-zwart (warmer/zachter).

### Doorgevoerd

- `--color-primary: #27272a` (anthraciet zinc-800), `--color-accent: #f97316` (oranje merk-accent).
- Mono-font op KSV-stamp en sectie-koppen, harde hoeken overal (`rounded-none`), outlined uppercase
  badges, knop-onderlijnen (oranje accent).
- Werkbak-kop: vol anthraciet vlak met "KSV / WERKBAK" stamp + oranje strip onder.
- Opdracht-kaart: 2px anthraciet rand + 8px staat-strip links + mono datums + mono ref-stamp.
- 4 mockup-pagina's bewaard onder `/mockups` (redirect + index), bruikbaar als referentie.

## Opgeleverd-flow uitgebreid (na Reins vraag over re-send)

Een opgeleverde opdracht was nog steeds editable -- terecht: nakomertjes komen voor. Maar UI moest
het laten zien en hersturen moest mogelijk worden.

- Header bij opgeleverd: groene strip onder ipv oranje + stamp "KSV / OPGELEVERD".
- Outlined groene "Rapport-PDF openen"-knop.
- Nieuwe "Opnieuw opleveren"-knop (anthraciet + groene onderlijn) -- regenereert PDF, uploadt,
  mailt opnieuw via dezelfde route. `OpleverKnop` parameteriseerd met `accent: "oranje" | "groen"`.
- "Melding toevoegen"-knop wordt groen-accent op opgeleverde opdracht.

## Melding verwijderen (live-feedback)

Rein wees erop dat een melding in de wachtrij niet te wissen was. Toegevoegd:

- `db.verwijderMelding` + `DELETE /api/meldingen/[id]` (404 bij onbekend).
- `MeldingVerwijderKnop` (rood-outline prullenbak) naast "Bewerken" op opdracht-detail.

## Vercel-deploy

Eerder geparkeerd; nu de logische volgende stap voor de zelf-gebruik fase, omdat HTTPS vereist
is voor spraak/camera op de telefoon (memory `project_mobiel_dev_https_lan`).

Route: GitHub-integratie (toekomstvast t.o.v. CLI):

1. GitHub private repo `rkzijlstra-ops/ksv-demo` aangemaakt.
2. `git remote add origin ... && git push -u origin master`.
3. Vercel-account via GitHub-OAuth, project geimporteerd.
4. 9 env-vars uit `.env.local` ingesteld (Anthropic, OpenAI, Supabase x3, Resend x3, RAPPORT_EMAIL).
5. Eerste deploy ~2-3 min. URL: `ksv-demo.vercel.app`.

Live test: `curl` op `/` en `/mockups/index.html` geven HTTP 200. Spraak-naar-tekst werkt nu op
de telefoon (HTTPS = secure context voor `getUserMedia`). Daarmee is het laatste geparkeerde punt
uit sessie 2A weg.

## Veiligheidsmelding

Tijdens de Vercel-stap selecteerde Rein per ongeluk `.env.local`-regels in zijn editor; die
belandden in de chat-context. Geen lek naar GitHub (`.env.local` is gitignored). Wel het advies
meegegeven om keys eventueel later te roteren als preventie en in de toekomst op te passen met
env-file-selecties.

## Stand

- 160 tests groen, tsc schoon, `next build` slaagt.
- Live deploy op Vercel werkt end-to-end (werkbak, melding maken met spraak + foto, opleveren met
  mail, opnieuw opleveren bij opgeleverde opdracht, melding/document/opdracht verwijderen).
- Volgorde na nu: zelf-gebruik fase (Rein neemt de app mee in het veld), daarna 2A.5 (auth/RLS)
  en pas dan 2B (Gmail-koppeling aan Ed).

## Open punten voor morgen

- PROJECT.md bijwerken: 2A.6 + 2A.7 + Vercel-deploy afgerond, volgorde-na-nu verduidelijken.
- Geheugen-updates: `project_mobiel_dev_https_lan` markeren als opgelost (Vercel-HTTPS), nieuwe
  memory voor Vercel-deploy details (URL, repo, key-rotatie-advies).
- Eventueel DESIGN/PLAN-2A7 status afronden zoals 2A6.
