# Toestandsmatrix: de opdracht-levenscyclus (levend document)

Doel: de gaten zichtbaar maken die ontstaan in de OVERGANGEN tussen statussen en tussen ROLLEN, niet
in losse features. Per overgang vier kolommen invullen. Een lege of onvolledige cel is een gat. Tests
leiden we hieruit af: elke cel die gedrag beschrijft krijgt een test, cross-rol-overgangen een e2e die
beide kanten checkt. Zie de skill projectstart-discipline (toestandsmatrix). Laatst bijgewerkt: 2026-06-07
(SMS-notificaties toegevoegd; zie DESIGN-SMS-NOTIFICATIES.md).

## Statussen van een opdracht (`dashboard_status`)

`binnen` → `concept_gepland` → `gepland` → `bevestigd` → `opgeleverd`, met zijtakken `geannuleerd`
(en verwijderd via de prullenbak). Daarnaast: `gewijzigd_te_versturen` (markering, geen status),
`opdracht_status: opgeleverd`, en de monteur ziet zijn toegewezen klussen via `getWerkpoolVoor`
(filtert op `toegewezen_aan`, NIET op status).

## Matrix

| Overgang | Data | Kantoor-UI | Monteur-UI | Bericht/notificatie |
|---|---|---|---|---|
| inschieten → binnen | melding + documenten, status binnen | dashboard "Binnen" | n.v.t. (niet toegewezen) | geen | 
| plannen (pool→bord) → concept_gepland | toewijzing + datum + status | planbord (oranje-gestreept), dashboard "concept" | verborgen tot verstuurd ✓ (werkpool-filter) | geen (bewust) |
| versturen → gepland | status gepland, verzonden_* + verzonden_at gezet | dashboard/planbord geel | werkpool "Te bevestigen" (geel) | mail + SMS (werk-kritiek) naar monteur ✓ |
| bevestigen → bevestigd | status bevestigd | dashboard/planbord blauw | badge "Bevestigd" | **kantoor krijgt geen actieve melding, alleen status-verandering** ⚠️ |
| wijzigen/verplaatsen na versturen (datum) | nieuwe planning + gewijzigd-marker | "gewijzigd, te versturen" | houdt afgesproken (verzonden) datum vast ✓ | geen tot opnieuw verstuurd (bewust) ✓ |
| wijzigen naar andere monteur na versturen | toewijzing naar B + gewijzigd-marker | kaart bij B op het bord | oude monteur houdt de klus tot opnieuw verstuurd, B ziet hem pas dan ✓ | geen tot opnieuw verstuurd (bewust) ✓ |
| opnieuw versturen (gewijzigd→gepland) | status gepland, verzonden_* + verzonden_at bij, herinnering gereset | terug naar "gepland" | terug naar "Te bevestigen", herbevestigen | mail + SMS (werk-kritiek) ✓ (keten nog niet e2e-getest) |
| ontplannen (bord→pool) → binnen | toewijzing + planning + verzonden_* gewist | dialoog (verstuurd), kaart naar pool | verdwijnt uit werkpool ✓ | mail + SMS (werk-kritiek) bij verstuurd/bevestigd ✓ |
| annuleren → geannuleerd | status geannuleerd, toewijzing blijft (dossier) | dashboard "geannuleerd" (inklapbaar) | uit de werkpool ✓ (werkpool-filter) | mail + SMS (werk-kritiek) bij verstuurd ✓ |
| document toevoegen na versturen | document erbij, geen status/herbevestiging | "nieuw document" zichtbaar | "nieuw"-badge in de app | mail/badge + SMS (overig) bij verstuurd ✓ |
| bevestiging blijft uit (na HERINNERING_NA_UUR) | herinnering_verzonden_at gezet (idempotent) | "niet bevestigd"-teller in Te-doen | herinnering binnen | mail + SMS (overig) via cron ✓ |
| opleveren → opgeleverd | opdracht_status, rapport_url | dashboard groen + rapport | naar history | rapport-mail ✓ |
| verwijderen (prullenbak) | verwijderd_at gezet | uit lijst, in prullenbak | verdwijnt uit werkpool ✓ | geen |

Legenda: ✓ klopt en/of getest · ⚠️ aandachtspunt/ontwerpvraag · ❌ gat

## Gaten (status)

1. **✅ OPGELOST. Wijziging na versturen (datum), monteur-kant.** De monteur houdt de afgesproken
   (verzonden) datum vast tot kantoor opnieuw verstuurt (`uitvoerdatumVoorMonteur`). Geen stille
   datum-wissel meer. Gedekt: opdracht-status.test + werkpool-zichtbaarheid.spec (gat 1).
2. **✅ OPGELOST. Geannuleerde klus blijft bij de monteur.** Werkpool-filter verbergt geannuleerd
   (toewijzing blijft voor het dossier). Gedekt: werkpool.test + werkpool-zichtbaarheid.spec (gat 2).
3. **✅ OPGELOST. Concept lekt naar de monteur.** Werkpool-filter verbergt concept_gepland tot
   verstuurd; eigen klussen (binnen) blijven. Gedekt: werkpool.test + werkpool-zichtbaarheid.spec (gat 3).
4. **⚠️ Kantoor weet niet dat de monteur bevestigd heeft (laag).** Geen actieve melding, alleen een
   status-verandering die kantoor ziet bij het openen van het dashboard. Waarschijnlijk acceptabel.
5. **✅ OPGELOST. Monteur-WISSEL na versturen.** Schuift Ed een verstuurde klus naar een andere
   monteur, dan houdt de oorspronkelijke (verzonden) monteur hem in zijn werkpool tot opnieuw
   verstuurd; de nieuwe monteur ziet hem pas na versturen. Werkpool-query filtert op de effectieve
   monteur, plus uitgebreide RLS (schema-compleet-7). Gedekt: werkpool-zichtbaarheid.spec (gat 5).
6. **Test-gat: de opnieuw-versturen-keten (S11) is nog niet als volledige e2e gedekt.**
