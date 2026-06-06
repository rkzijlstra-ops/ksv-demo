# Volledig testrapport KSV demo-app — 2026-06-06

Reinier had volledige regie gegeven om de hele app-cyclus door te testen: dashboard, planbord, monteur-app en mails. Hier is het volledige rapport.

---

## Testresultaten samenvatting

| Suite | Tests | Resultaat |
|---|---|---|
| Vitest unit/integratie | 407 | Alles groen |
| E2E browser (niet-mail) | 21 | Alles groen |
| E2E mail (E2E_MAIL=1) | 6 | Alles groen |

**Totaal: 434 tests, 0 fouten.**

---

## Wat er getest is

### Dashboard-cyclus (browser e2e)
- Beheerder ziet het dashboard en het planbord (smoke)
- Kantoor annuleert een opdracht: status gaat naar "geannuleerd", annuleer-mail naar monteur
- Monteur bevestigt ontvangst van zijn klus: status naar "bevestigd"
- Monteur ziet alleen eigen klus in de werkpool (niet die van anderen)
- Monteur wordt van dashboard en planbord doorgestuurd naar werkpool
- Opdrachtgever ziet alleen opdrachten van zijn eigen zaak
- Opdrachtgever mag op het planbord, niet in de monteur-werkpool

### Planbord (browser e2e)
- Inplannen via formulier: status naar `concept_gepland`, datum en monteur correct in DB
- Inplannen door slepen van pool naar cel: idem (drag-and-drop via dnd-kit PointerSensor)
- Formulier annuleren: kaart blijft in pool, status ongewijzigd
- Slepen van bord terug naar pool: ontplant de kaart
- Multi-dag montage (3 dagen): span correct in DB opgeslagen
- Montage over het weekend: vrijdag geknipt, de week erna toont de rest
- Service + montage op dezelfde dag: GEEN conflictmarkering (zakelijke beslissing, zie hieronder)
- Twee montages op dezelfde dag: wél conflictwaarschuwing (rode rand + "dubbel"-label)
- Versturen naar monteurs: status van alle `concept_gepland`-items naar `gepland`

### Monteur-app (browser e2e)
- Monteur maakt een melding met foto (als kind-rij bij opdracht)
- Monteur legt oplevering vast: eindstaat-foto + handtekening (concept, geen verzending)

### Mail-flows (E2E_MAIL=1, echte verzending)
- Spoedmelding-mail naar kantoor
- Uitnodigingsmail naar nieuwe monteur
- Afmeldmail bij verwijderen gebruiker
- Annuleer-mail naar monteur bij geannuleerde opdracht
- Monteur-opdracht-mail met eerdere-rapporten-historie
- Oplevering: monteur uploadt foto + handtekening, verstuurt rapport naar keukenzaak

---

## Bugs gevonden en opgelost

### 1. E2E-tests liepen op een niet-bestaande Vercel-URL
**Probleem:** `.env.test` wees op `https://ksv-demo-test.vercel.app` dat niet bestaat.
**Oplossing:** `E2E_APP_URL=http://localhost:3001` + de lokale dev-server is de test-deploy.

### 2. `mail.spec.ts` timeout op file-input (oplevering-pagina laadde niet)
**Root cause (dubbel):**
1. `monteur-prod.json` cookie heeft `secure: true` (want domain `"localhost:3001" ≠ "localhost"`), waardoor browsers cookies niet sturen over HTTP. `page.goto()` (echte navigatie) respecteert dit strikt; `page.request.post()` (API-calls) niet.
2. `RAPPORT_NAAR = "bkmkeukenmontage+kluslus@gmail.com"` — Resend free tier blokkeert plus-aliassen, alleen het account-eigenaar-adres is toegestaan.
**Oplossing:** `storageState` naar `monteur.json` (domain: `localhost`, secure: false), `RAPPORT_NAAR` naar `bkmkeukenmontage@gmail.com`.

### 3. Annuleer-mail test: `gemaild: false`
**Root cause:** Resend stuurde niet naar `bkmkeukenmontage+anntest...@gmail.com`.
**Oplossing:** Vaste monteur `bkmkeukenmontage@gmail.com` met find-or-create patroon + `accNieuwAangemaakt`-vlag zodat bestaande accounts niet verwijderd worden.

### 4. mail-opdracht.spec.ts: 502-fout
**Root cause:** Zelfde Resend-beperking voor `+optest...`-adres.
**Oplossing:** Zelfde patroon als annuleer-mail.

### 5. Planbord-sleeptest flakey na E2E_MAIL-runs
**Root cause (meervoudig):**
- `mail-flows.spec.ts` instelde `accNieuwAangemaakt` nooit op `true` voor uitnodigingsmail en afmeldmail, waardoor gecreëerde monteur-accounts (`Invtest...`, `Afmtest...`) achterbleven in de test-DB.
- Bij afgebroken planbord-test-runs bleven orphaned pool-items (`DRAG-TERUG`, `ANN-FORM`) in de DB met status `binnen`.
- Met 5 monteur-rijen in de grid past de pool niet meer in de viewport (720px). De sleepcoördinaten vielen buiten het zichtbare gebied, waardoor dnd-kit de drop-cel niet registreerde.
**Oplossing (driedubbel):**
1. `mail-flows.spec.ts`: `accNieuwAangemaakt = true` ingesteld in uitnodigings- en afmeldmail-test, zodat afterEach opruimt.
2. `planbord-extra.spec.ts` beforeAll uitgebreid: verwijdert nu ALLE meldingen voor test-accounts (ook `binnen`-items), plus orphaned monteur-profielen via admin API.
3. `mail-opdracht.spec.ts`: zelfde fix voor `testMonteurNieuwAangemaakt`.

### 6. `planbord-extra.spec.ts` test 5 (service + montage): valse conflicten
**Root cause:** Orphaned geplande meldingen van eerdere testruns veroorzaakten een dubbele-boeking voor de test-monteur.
**Oplossing:** `test.beforeAll` in `planbord-extra.spec.ts` ruimt planned items op voor testaccounts.

---

## Zakelijke beslissingen vastgelegd

### Service + montage op dezelfde dag = geen conflict
Een monteur kan op de laatste dag van een montage-opdracht een service-afspraak hebben om 12:00. Dit is gewenst en mogelijk. Alleen montage+montage en service+service (zelfde tijdstip) zijn echte dubbele boekingen.

**Geïmplementeerd in:** `src/lib/planbord.ts` — `vindDubbeleBoekingen()`, gedekt door 24 unit-tests in `src/lib/planbord.test.ts`.

### Zaterdag/zondag op het planbord → volgende maandag
Het planbord toont bij navigatie op een weekend automatisch de komende werkweek.

---

## Technische status van de app

### Wat werkt
- Volledige lifecycle: aanmaken → inplannen → versturen → bevestigen → opleveren → archief
- Drag-and-drop op het planbord (dnd-kit PointerSensor)
- Conflictdetectie voor dubbele boekingen
- Alle mail-flows (Resend, echte verzending)
- PDF-generatie en rapport-upload (Supabase Storage)
- RLS: beheerder, opdrachtgever en monteur zien alleen wat ze mogen zien
- Test-infrastructuur: zijspoor (aparte test-Supabase), storageState per rol, mailtest achter `E2E_MAIL=1`

### Bekende beperkingen
- **Resend free tier:** kan alleen naar `bkmkeukenmontage@gmail.com` sturen in testmodus. Plus-aliassen (`+anntest`, `+optest`) worden geblokkeerd. Mail-e2e tests werken hieromheen door het account-eigenaar-adres te gebruiken.
- **Test-deploy:** er is geen aparte Vercel-deploy die naar de test-Supabase wijst. Mail-e2e draait daardoor tegen `localhost:3001` met de lokale dev-server. Zodra een `ksv-demo-test.vercel.app` bestaat, wijzig `E2E_APP_URL` in `.env.test`.
- **Drag-and-drop:** afhankelijk van viewport-hoogte en aantal monteurs. De beforeAll-cleanup houdt de DB schoon zodat de pagina kort blijft.

---

## Actiepunten voor Reinier

Niets dringends. Alles werkt. Als je later een echte test-deploy op Vercel aanmaakt:
1. Zet `E2E_APP_URL=https://ksv-demo-test.vercel.app` in `.env.test`
2. De `beheerder-prod.json` en `monteur-prod.json` sessies worden dan voor dat domein aangemaakt
3. `mail.spec.ts` kan dan terug naar `monteur-prod.json` (want dan is het HTTPS)
