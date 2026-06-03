# Plan blok 0: datamodel + db-laag (fundament complete systeem)

Datum: 2026-06-03
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (Route A, architectuurregels 2, 3, 6)
Aanpak: TDD op alle db-logica. Eén SQL-migratie die Reinier zelf draait. Commit per blok.
Bouwwijze: **uitbreiden, niet herbouwen** (design-regel). De bestaande `meldingen`-tabel
blijft de opdracht-rij; we voegen er planning- en statusvelden aan toe.

Dit is het gedeelde fundament. Het moet solo en als eerste, want dashboard (blok 1) en
planbord (blok 3) bouwen er allebei op voort. Pas na dit blok kan parallel werk veilig.

## Datamodel-keuzes (gemaakt met motivatie, bevestigen met "ga")

1. **Tabel `meldingen` uitbreiden, niet splitsen naar een aparte `opdrachten`-tabel.**
   Motivatie: het design zegt expliciet "uitbreiden, niet herbouwen". Een opdracht is nu al
   een rij in `meldingen` met `bron='pdf'`. Splitsen is een grote, risicovolle migratie zonder
   directe winst voor versie 1. Later splitsen kan nog, zonder de buitenkant te raken.

2. **Nieuwe kolom `dashboard_status`** als de levenscyclus van de opdracht (de opdrachtgeverskant),
   los van de bestaande `status` (concept/verzonden, hoort bij de monteur-melding) en
   `opdracht_status` (open/opgeleverd, monteur-flow). Het zijn echt verschillende assen, dus
   geen kolommen samenvoegen (zou de monteur-flow breken). Enum:
   `binnen | concept_gepland | gepland | bevestigd | opgeleverd | geannuleerd`, default `binnen`.
   Migratie van bestaande rijen: `opgeleverd` als `opdracht_status='opgeleverd'`, anders `binnen`.

3. **Planning-velden** op de opdracht-rij: `startdatum date`, `starttijd time` (mag leeg),
   `duur_dagen int default 1`. Eén invoermodel (design): tijd leeg = dagblok (montage),
   tijd ingevuld = kaartje op dat uur (service). `uitvoerdatum` (bestaand, monteur-werkpool)
   houden we gelijk aan `startdatum` voor compatibiliteit; later op te ruimen.

4. **Marker `gewijzigd_te_versturen boolean default false`** voor "gewijzigd, nog te versturen".
   En `bevestigd_at timestamptz` voor de bevestiging door de monteur.

5. **Geen aparte `klanten`-tabel in dit blok.** Keukenhistorie = query op `referentienummer`
   (design: "uitbreiden, niet herbouwen", context reist met de referentie). Een echte
   klanten-/dossiertabel kan later, zonder herbouw.

## Blok 0a: SQL-migratie (Reinier draait)

### Taak 1: migratiebestand schrijven
- Bestand: `supabase/schema-compleet-0.sql`
- Code: `alter table meldingen add column ...` voor `dashboard_status` (met check-constraint op de
  enum-waarden), `startdatum`, `starttijd`, `duur_dagen`, `gewijzigd_te_versturen`, `bevestigd_at`.
  Plus een `update`-statement dat bestaande rijen een `dashboard_status` geeft (zie keuze 2) en
  `startdatum = uitvoerdatum` zet waar die bestaat. Index op `dashboard_status` en op
  `referentienummer` (voor dashboard-filter en keukenhistorie).
- Test eerst: n.v.t. (SQL, handmatig). Wel: in het bestand een commentaarregel met wat het doet.
- Verifiëren: Reinier plakt in Supabase SQL-editor, "Success. No rows returned".
- Tijd: 8 min (schrijven) + Reinier draait

## Blok 0b: types + dashboard-status-helper (TDD)

### Taak 2: types uitbreiden in db.ts
- Bestand: `src/lib/db.ts`
- Code: `DashboardStatus` type-union; velden op `Melding`-interface toevoegen
  (`dashboard_status`, `startdatum`, `starttijd`, `duur_dagen`, `gewijzigd_te_versturen`, `bevestigd_at`).
- Test eerst: typecheck (geen runtime-test nodig voor pure types); dekking volgt via de functietests.
- Verifiëren: `next build` typecheckt zonder fouten.
- Tijd: 5 min

### Taak 3: status-helper (pure functie, los te testen)
- Bestand: `src/lib/opdracht-status.ts` (+ `.test.ts`)
- Code: `statusLabel(status)`, `statusKleurToken(status)` (mapt naar de tokens uit `globals.css`:
  binnen→surface/ink-muted, concept_gepland→accent+gestreept, gepland→accent,
  bevestigd→bevestigd, opgeleverd→success, geannuleerd→ink-muted+doorhaling),
  en `isActief(status)` (binnen/concept_gepland/gepland/bevestigd = actief werk).
- Test eerst: per status het juiste label, token en actief-vlag.
- Verifiëren: `npm test` groen voor dit bestand.
- Tijd: 10 min

## Blok 0c: dashboard-queries (TDD)

### Taak 4: getOpdrachtenVoorDashboard
- Bestand: `src/lib/db.ts` (+ test in `db.test.ts`)
- Code: haalt opdracht-rijen (`bron='pdf'`, `verwijderd_at is null`). Scoping (design):
  actief werk altijd; opgeleverd/geannuleerd alleen laatste 14 dagen. Parameter `peildatum`
  injecteerbaar zodat de 14-dagen-grens testbaar is zonder echte klok.
- Test eerst: actieve opdracht komt altijd mee; opgeleverde van 3 dagen geleden wel, van 20 dagen
  geleden niet; verwijderde nooit.
- Verifiëren: `npm test` groen.
- Tijd: 12 min

### Taak 5: getOpdrachtById + zoekOpReferentie
- Bestand: `src/lib/db.ts` (+ test)
- Code: `getOpdrachtById(id)` (één opdracht-rij). `zoekOpReferentie(ref)` (alle opdrachten op
  dezelfde referentie, nieuwste eerst, voor naslag en keukenhistorie).
- Test eerst: vindt op id; zoekt op ref en sorteert nieuwste eerst; lege uitkomst bij onbekend.
- Verifiëren: `npm test` groen.
- Tijd: 10 min

## Blok 0d: planning- en status-mutaties (TDD)

### Taak 6: planOpdracht
- Bestand: `src/lib/db.ts` (+ test)
- Code: zet `toegewezen_aan`, `startdatum`, `starttijd` (mag null), `duur_dagen`; status →
  `concept_gepland`; houdt `uitvoerdatum = startdatum`. Geen mail (verstuur-poort is apart).
- Test eerst: velden worden geschreven; status wordt concept_gepland; starttijd null toegestaan.
- Verifiëren: `npm test` groen.
- Tijd: 10 min

### Taak 7: verstuurNaarMonteurs + bevestigOntvangst
- Bestand: `src/lib/db.ts` (+ test)
- Code: `verstuurNaarMonteurs(ids[])`: status concept_gepland/gewijzigd → `gepland`, zet
  `gewijzigd_te_versturen=false`. (De echte mail zit in blok 4; dit is alleen de statussprong.)
  `bevestigOntvangst(id)`: status → `bevestigd`, `bevestigd_at=now`.
- Test eerst: statusovergangen kloppen; gewijzigd-marker wordt gereset bij versturen.
- Verifiëren: `npm test` groen.
- Tijd: 10 min

### Taak 8: wijzigOpdracht + annuleerOpdracht
- Bestand: `src/lib/db.ts` (+ test)
- Code: `wijzigOpdracht(id, velden)`: past planning aan; als de opdracht al `gepland`/`bevestigd`
  was, zet `gewijzigd_te_versturen=true` (telt mee in de verstuur-knop). `annuleerOpdracht(id)`:
  status → `geannuleerd`.
- Test eerst: wijziging op verstuurde opdracht zet de marker; op concept niet; annuleren zet status.
- Verifiëren: `npm test` groen.
- Tijd: 10 min

## Blok 0e: afronden

### Taak 9: telling voor "Te doen" + verstuur-knop
- Bestand: `src/lib/db.ts` (+ test) of pure helper `src/lib/te-doen.ts`
- Code: telfunctie die per categorie het aantal geeft: te plannen (binnen),
  te versturen (concept_gepland + gewijzigd), niet bevestigd (gepland, te lang open),
  aandacht (geen referentienummer). Pure functie over een lijst opdrachten, los testbaar.
- Test eerst: telt per categorie correct op een voorbeeldlijst.
- Verifiëren: `npm test` groen.
- Tijd: 12 min

### Taak 10: alles groen + commit-voorbereiding
- `npm test` (alles) + `next build` slagen.
- Ochtend-checklist-regel toevoegen: `schema-compleet-0.sql` draaien.
- Korte logboek-entry in `07_logboek/`.
- Reinier commit.
- Tijd: 8 min

## Niet in dit blok (bewust)
- UI/schermen (blok 1 dashboard, blok 3 planbord).
- Echte mailverzending (blok 4).
- Aparte klanten-/dossiertabel.
- Tabel-splitsing opdracht vs melding.

Totaal geschat: ~1u45 bouw + Reinier draait SQL en commit.
