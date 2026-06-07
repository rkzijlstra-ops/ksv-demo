# Toestandsmatrix: de opdracht-levenscyclus (levend document)

Doel: de gaten zichtbaar maken die ontstaan in de OVERGANGEN tussen statussen en tussen ROLLEN, niet
in losse features. Per overgang vier kolommen invullen. Een lege of onvolledige cel is een gat. Tests
leiden we hieruit af: elke cel die gedrag beschrijft krijgt een test, cross-rol-overgangen een e2e die
beide kanten checkt. Zie de skill projectstart-discipline (toestandsmatrix). Laatst bijgewerkt: 2026-06-07.

## Statussen van een opdracht (`dashboard_status`)

`binnen` → `concept_gepland` → `gepland` → `bevestigd` → `opgeleverd`, met zijtakken `geannuleerd`
(en verwijderd via de prullenbak). Daarnaast: `gewijzigd_te_versturen` (markering, geen status),
`opdracht_status: opgeleverd`, en de monteur ziet zijn toegewezen klussen via `getWerkpoolVoor`
(filtert op `toegewezen_aan`, NIET op status).

## Matrix

| Overgang | Data | Kantoor-UI | Monteur-UI | Bericht/notificatie |
|---|---|---|---|---|
| inschieten → binnen | melding + documenten, status binnen | dashboard "Binnen" | n.v.t. (niet toegewezen) | geen | 
| plannen (pool→bord) → concept_gepland | toewijzing + datum + status | planbord (oranje-gestreept), dashboard "concept" | **verschijnt al in werkpool (toegewezen, nog niet verstuurd)** ⚠️ | geen (bewust) |
| versturen → gepland | status gepland, verzonden_* gezet | dashboard/planbord geel | werkpool "Te bevestigen" (geel) | mail naar monteur ✓ |
| bevestigen → bevestigd | status bevestigd | dashboard/planbord blauw | badge "Bevestigd" | **kantoor krijgt geen actieve melding, alleen status-verandering** ⚠️ |
| wijzigen/verplaatsen na versturen | nieuwe planning + gewijzigd-marker | "gewijzigd, te versturen" | **werkpool toont stil de nieuwe datum** ❌ | **GEEN** ❌ |
| opnieuw versturen (gewijzigd→gepland) | status gepland, verzonden_* bij | terug naar "gepland" | terug naar "Te bevestigen", herbevestigen | mail ✓ (maar keten niet e2e-getest) |
| ontplannen (bord→pool) → binnen | toewijzing + planning + verzonden_* gewist | dialoog (verstuurd), kaart naar pool | verdwijnt uit werkpool ✓ | mail bij verstuurd/bevestigd ✓ |
| annuleren → geannuleerd | status geannuleerd, **toewijzing blijft** | dashboard "geannuleerd" (inklapbaar) | **blijft in actieve werkpool (toewijzing niet gewist)** ❌ | mail bij verstuurd ✓ |
| opleveren → opgeleverd | opdracht_status, rapport_url | dashboard groen + rapport | naar history | rapport-mail ✓ |
| verwijderen (prullenbak) | verwijderd_at gezet | uit lijst, in prullenbak | verdwijnt uit werkpool ✓ | geen |

Legenda: ✓ klopt en/of getest · ⚠️ aandachtspunt/ontwerpvraag · ❌ gat

## Gevonden gaten (geprioriteerd)

1. **❌ Wijziging na versturen, monteur-kant (hoog).** Verplaatst Ed een al bevestigde klus, dan ziet
   de monteur stil de nieuwe datum in zijn werkpool en krijgt hij geen bericht. Hij staat nog op de
   oude afspraak. Dit is de bug die Reinier vond. (Richting: werkpool tonen als "gewijzigd, wacht op
   nieuwe bevestiging" i.p.v. stil de datum wijzigen, en/of een melding sturen.)
2. **❌ Geannuleerde klus blijft bij de monteur (hoog/midden).** `annuleerOpdracht` wist de toewijzing
   niet en `getWerkpoolVoor` filtert niet op status (db.ts), dus een geannuleerde klus blijft in de
   actieve monteur-werkpool staan. Op basis van code-analyse, nog te bevestigen met een test.
   (Richting: toewijzing wissen bij annuleren, of de werkpool op status filteren.)
3. **⚠️ Concept lekt naar de monteur (midden).** Een ingeplande maar nog niet verstuurde klus
   (concept_gepland) is al toegewezen en verschijnt dus al in de monteur-werkpool, terwijl de
   verstuur-poort juist bedoeld is om te bepalen wat de monteur ziet. (Richting: werkpool pas tonen
   vanaf status gepland, of concept apart markeren.)
4. **⚠️ Kantoor weet niet dat de monteur bevestigd heeft (laag).** Geen actieve melding, alleen een
   status-verandering die kantoor ziet bij het openen van het dashboard. Waarschijnlijk acceptabel.
5. **Test-gat: de wijziging-na-versturen-keten (S11) is niet e2e-getest.** Volgt vanzelf zodra gat 1
   is opgelost (dan de e2e die beide kanten checkt meeschrijven).

## Aanpak

Gaten 1, 2 en 3 raken allemaal dezelfde plek: wat de monteur in zijn werkpool ziet bij een
statusverandering aan de kantoor-kant. Logisch om ze samen op te pakken. Eerst met Reinier de richting
per gat kiezen (net als de vorige batch), dan bouwen met een e2e per overgang die beide rollen checkt.
