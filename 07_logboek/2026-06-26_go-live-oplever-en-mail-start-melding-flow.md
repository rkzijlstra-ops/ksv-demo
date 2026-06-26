# Go-live oplever-herinrichting (#25) + mail-aflevering (#26), start melding-flow

Datum: 2026-06-26
Branches: `oplever-herinrichting` (PR #25), `mail-aflevering` (PR #26), nieuw `melding-flow`

## Vandaag live op master

Twee features zijn vandaag, serieel en elk via de STOP-poort, op master gekomen. Beide draaien nu op productie (`mijn.kluslus.nl`) en demo.

**PR #25 — oplever-herinrichting (merge-commit `2d04c60`).**
Herinrichting van opleveren + snel-afsluiten + klant-levering + kluspool: hoofdscherm opnieuw ingedeeld, akkoord verplaatst naar het teken-scherm, responsief teken-scherm (landschap zet knoppen naast het vlak, portret verdeelt netjes), en de "Versturen"-kop zonder volgnummer nadat de 1-2-3 bij de herindeling vervielen. Prod-migraties 25/26/27 zijn gedraaid.

**PR #26 — mail-aflevering (merge-commit `298c2fc`).**
Betrouwbare oplever-mail via Resend onder strenge DMARC: Reply-To per monteur op het opleverrapport met een vangnet erachter, een eerste-verzending-waarschuwing per domein + opnieuw versturen, en een onboarding-gate die afzendergegevens verplicht maakt bij eerste gebruik (gate naar `/welkom`). Voegde de component `VerzendInfoBlok` toe op de detailpagina en raakte de rapport-route.

Volgorde-afspraak uit het ontwerp is gehaald: eerst oplever → master, dan mail-aflevering → master. Beide gekeurd op `kluslus-test` voor de merge.

## Start melding-flow (deze sessie)

Verse worktree `C:/Users/rkzij/ksv-worktrees/melding-flow` vanaf de bijgewerkte master (`origin/master` @ `2d04c60`), branch `melding-flow`. Env-bestanden gekopieerd, `npm ci` groen.

Doel (zie spec `docs/superpowers/specs/2026-06-26-melding-flow-herinrichting-design.md` en plan `docs/superpowers/plans/2026-06-26-melding-flow-herinrichting.md`):

1. **Video op melding** (nu alleen foto's): formulier + `video_url`-migratie + rapport-PDF.
2. **Detailpagina herinrichten**: koppen "Meldingen tijdens de klus" / "Aan het einde van de klus", melding-knop "Beschadiging of manco melden" (blijft naar de aparte pagina), afsluiten als blok in de pagina, onderbalk alleen "Terug naar kluspool", alleen "Spoed" als label.
3. **Snel afsluiten ontdubbelen**: oplever- en intern-blok eruit, meldingen-overzicht "Dit gaat mee in het rapport" + begeleidend bericht (hergebruik `opmerking`-veld) + bestaand versturen-blok ongewijzigd + ontsnap-knop naar de volledige oplevering, 0-meldingen-bevestiging. Volledige oplevering blijft ongewijzigd.

Let op bij de bouw: melding-flow herstructureert dezelfde detailpagina (`src/app/opdracht/[id]/page.tsx`) waar mail-aflevering `VerzendInfoBlok` neerzette, en de rapport-route die mail-aflevering wijzigde. Eerst checken waar `VerzendInfoBlok` staat en dat de rapport-route backward-compatible bleef, dan de herinrichting daar netjes omheen.

Werkwijze: test-first, `TESTDEKKING.md` + `TOESTANDEN.md` in dezelfde commit, eerst naar `omgeving-test`, STOP voor keuring door Rein (beide rollen) op `kluslus-test`, pas na zijn expliciete go naar master.
