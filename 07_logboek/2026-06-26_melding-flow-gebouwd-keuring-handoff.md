# Melding-flow herinrichting: gebouwd, gekeurd, klaar voor merge (handoff)

Datum: 2026-06-26
Branch: `melding-flow` (worktree `C:/Users/rkzij/ksv-worktrees/melding-flow`)

## Wat gebouwd is (test-first)
Volledige melding-flow herinrichting volgens spec/plan (`docs/superpowers/`):

1. **Video op een melding** — `video_url`-kolom (migratie `supabase/schema-compleet-28-melding-video.sql`), API (POST/PATCH) + db-laag, `VideoMaken` in `MeldingForm`, videolink in de rapport-PDF.
2. **Detailpagina** — kop "Meldingen tijdens de klus" + subtekst "Is iets beschadigd of manco? Meld het hier", knop "Beschadiging of manco melden", afsluiten als blok "Aan het einde van de klus", onderbalk alleen "Terug naar kluspool", alleen spoed krijgt een label.
3. **Snel afsluiten ontdubbeld** — geen media-invoer; compact "Dit gaat mee in het rapport"-overzicht (thumbnails + tekst + telling), begeleidend bericht (hergebruikt `opmerking`), bestaand versturen-blok ongewijzigd, ontsnap-knop "Liever uitgebreid opleveren?" bovenaan. Volledige oplevering ongewijzigd.

## Keuring-feedback van Reinier, verwerkt (2 rondes)
- Subtekst "per stuk" → "Is iets beschadigd of manco? Meld het hier".
- "Dit gaat mee in het rapport": van grote kale blokken → compact met thumbnails + tekst + telling.
- Ontsnap-knop: tekst "Liever uitgebreid opleveren? (met klant-handtekening en akkoord)" + naar bovenaan verplaatst.
- **Melding-concept-vangnet** (`src/lib/melding-concept.ts`): invoer wordt automatisch lokaal bewaard en hersteld, ook bij de telefoon-terugknop. De opslaan-knop blijft leidend.
- **Bug gefixt**: in snel afsluiten verspronk de "Ook aan de klant opleveren"-schakelaar zonder iets te openen (het interne blok dat hij opende is in snel afsluiten bewust weg). Opgelost: schakelaar weg in snel afsluiten; klant-levering is daar nu een directe verstuur-optie ("Naar de klant"). Oorzaak van het doorglippen: die schakelaar was wel e2e-getest in de volledige oplevering, maar niet in de snel-variant. Nu e2e-gedekt.

## Tests
- Unit: 882 groen (incl. melding-concept, melding-overzicht, rapport-videolink, urgentie-null).
- E2e: `melding-flow.spec` 7 groen (detailpagina, spoed-only label, video round-trip, snel-afsluiten layout, klant-levering, concept-vangnet, 0-meldingen-bevestiging). Volledige suite eerder groen (106).
- `TESTDEKKING.md` + `TOESTANDEN.md` bijgewerkt.

## Open ontwerp-keuze (klein)
Interne notitie-blok in snel afsluiten: standaard NIET (huidige staat, advies). Reinier kan alsnog kiezen het ook in snel afsluiten te zetten (zoals bij volledig). Niet blokkerend voor de merge; als hij niets zegt, blijft het zoals nu.

## Merge naar productie: de stappen en de stand
Branch staat gepusht en is gemerged in `omgeving-test` → gekeurd op kluslus-test. Reinier gaf go ("merge en push naar productie"). De harde volgorde voor de productie-deploy:

1. **Reinier draait de productie-migratie** `supabase/schema-compleet-28-melding-video.sql` (kolom `video_url` op `meldingen`). MOET vóór de merge, anders breekt het opslaan van meldingen op productie (de code schrijft `video_url`). Test + demo zijn al gedaan via `npm run migrate:test`.
2. PR `melding-flow` → `master` geopend; CI moet groen zijn (branch-protected).
3. Na groene CI én bevestigde prod-migratie: merge naar `master`. Prod-Vercel (`mijn.kluslus.nl`) en demo-Vercel deployen dezelfde code.

Tot stap 1 bevestigd is, is de merge bewust niet uitgevoerd (productie-veiligheid).

## To-do uit deze sessie
`docs/TODO-opdrachtgever-whitelist.md`: nieuwe opdrachtgever proactief om whitelist van planning@kluslus.nl vragen via de uitnodigingsmail (Optie A). Apart klusje, los van deze branch.
