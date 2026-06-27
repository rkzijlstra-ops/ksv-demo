# Systeemkaart bijwerken

De systeemkaart (`systeemkaart.html`) is met de hand opgebouwd uit de echte bestanden in deze repo plus de infra-docs. Hij groeit niet vanzelf mee; je laat Claude hem opnieuw bouwen.

## Hoe Reinier hem bijwerkt

Zeg tegen Claude: **"werk de systeemkaart bij"**. Claude volgt dan de procedure hieronder en herbouwt de HTML. Daarna openen in Edge:

```
Start-Process msedge "file:///C:/Users/rkzij/Mainframe/01_projecten/keukenstudio-voorschoten-demo/docs/systeemkaart/systeemkaart.html"
```

## Procedure voor Claude (scan deze bronnen)

Lees telkens deze bronnen en werk de plaat bij waar de werkelijkheid is veranderd. Verzin niets; alleen wat hier staat komt op de kaart.

| Bron | Wat eruit komt |
|---|---|
| `.env.example` | Welke externe diensten er zijn (sleutelnamen: Supabase, Resend, CM.com, Anthropic/OpenAI, cron-secret) |
| `vercel.json` | De cron-jobs: pad + schema |
| `.github/workflows/ci.yml` | Wat de CI draait en waarop hij triggert (push master / PR) |
| `docs/OMGEVINGEN.md` | De 3 omgevingen, hun Supabase-refs, deploy-routes, de promote-valkuil |
| `docs/MAIL-STRUCTUUR.md` | Mailstromen (uitgaand Resend, inbound app) |
| `supabase/` (migraties) | Of er nieuw schema is; relevant voor de schema-drift-regel |
| `01_projecten/_kluslus-infra/dns-*.md` | DNS-records: CNAME mijn → Vercel, MX @ → Google, MX klus/send → AWS SES, DMARC |
| MEMORY.md (KSV-regels) | Live-status van features (bv. SMS live, Workspace-mail), open acties |

## Vaste structuur van de plaat (niet zomaar omgooien)

1. **Legenda** — kleuren prod/test/demo/extern, solid = automatisch, dash = met de hand.
2. **Sectie 1 — Hoe komt code live** — push branch → preview/kluslus-test; merge master → prod + demo. Met de promote-valkuil.
3. **Sectie 2 — De 3 omgevingen** — Vercel-project ↔ Supabase-DB, per omgeving.
4. **Sectie 3 — Wat de app naar buiten stuurt** — Resend, CM.com, AI, cron.
5. **Sectie 4 — Mail in & uit + domein** — app-inbound (klus → SES → Resend), mensmail (@ → Google), Vimexx DNS.
6. **Sectie 5 — Per dienst** — klikbare `<details>`-blokken, telkens 3 regels: Wat / Koppeling / Bij storing.

## Bij elke update

- Zet de datum-stempel bovenaan (`bijgewerkt JJJJ-MM-DD`) op vandaag.
- Voeg een dienst toe/weg als `.env.example` of de DNS dat laat zien.
- Houd het Nederlands, direct, geen hype. Geen em-dashes.
