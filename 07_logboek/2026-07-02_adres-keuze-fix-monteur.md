# Adres-keuze fix: montagelocatie respecteren + keuzeblok voor de monteur

Datum: 2026-07-02 (gemeld en gebouwd 2026-07-01, 's avonds live op productie via PR #46).

## Aanleiding

Reinier meldde: bij een order met twee adressen (klant/montage vs. bouwbedrijf) kwam er geen adres in
de klus, via beide invoerwegen. Concreet geval: mevrouw D. Lek / 7085 W. Jonker.

- **Mailen:** geen adres, en geen keuze getoond.
- **Uploaden:** de app toonde wél de keuze uit twee adressen, hij vinkte de juiste aan en sloeg op, maar
  daarna stond er alsnog geen adres in de klus.

## Onderzoek (root cause)

De PDF-parser haalt het adres wél binnen. Bij 2+ unieke adressen laat de app bewust `klant_adres` leeg,
bewaart de kandidaten en zet `adres_keuze_nodig=true`, zodat een mens de montagelocatie kiest (geen
gok-adres). Dat principe klopt. De fout zat in twee schakels daarna:

1. **Upload gooide de keuze weg.** `src/app/api/opdrachten/aanmaken/route.ts` herberekende `keuzeNodig`
   uit de nog-volledige kandidatenlijst die de frontend blijft meesturen, en zette daarmee het door de
   invoerder gekozen `klant_adres` op `null`. De inline gemaakte keuze verdween dus bij het aanmaken.
2. **De monteur had geen keuzescherm.** Het herstel-blok `AdresControleBlok` stond alleen op de
   kantoor/dashboard-detailpagina (`/dashboard/opdracht/[id]`). De monteur bekijkt een klus via
   `/opdracht/[id]` (ook vanuit `/inbox`), en die pagina kende `adres_keuze_nodig` niet. Dus een per mail
   binnengekomen klus (bewust zonder adres) bleef bij de monteur adresloos hangen, zonder manier om te
   kiezen.

Kantoor merkte fout 1 minder omdat het dashboard het keuzeblok wél had (herstelbaar); de monteur liep vast.

## Fix

1. `aanmaken/route.ts`: een meegestuurd gekozen `klant_adres` wint; alleen vlaggen als er meerdere
   adressen zijn én er niets gekozen is.
2. `opdracht/[id]/page.tsx`: `AdresControleBlok` toegevoegd bij `adres_keuze_nodig`.
3. **Weergave-opschoning** (op Reins observatie): het keuzeblok werd inconsistent getoond, een rood kader
   ("Adres controleren") rond het gele `AdresKeuze`-blok met een dubbele kop op de detailpagina's, en kaal
   bij invoeren. Nu hergebruikt `AdresControleBlok` exact dezelfde `AdresKeuze` met alleen een eigen
   bevestig-knop, dus overal hetzelfde gele blok.

Geen migratie nodig: de adres-kolommen bestonden al in productie.

## Test

- Unit: `opdrachten/aanmaken/route.test` (keuze gerespecteerd; vlaggen zonder keuze) — test-first, RED gezien.
- E2e: `adres-keuze-monteur.spec` (monteur kiest op `/opdracht/[id]`), `adres-keuze.spec` (kantoor).
- Volledige unit-suite (988) + typecheck + lint groen; beide e2e's lokaal groen; cloud-CI `test` groen (PR #46).
- Keuring: Reinier verifieerde upload én mail op kluslus-test (adres landt bij beide). De weergave-opschoning
  ging na zijn akkoord mee naar productie zonder tweede keuring (op zijn verzoek; hij test morgen op prod).

## Weg naar productie

branch `fix/adres-keuze-monteur` → worktree → test-first → `omgeving-test` (kluslus-test) → keuring Rein →
weergave-opschoning → PR #46 → CI groen → merge master. Prod (`mijn.kluslus.nl`) + demo gedeployd van master.

## Openstaand / vervolg (los, niet gebouwd)

- Vangnet-melding "geen order-PDF gevonden" bij een doorgestuurde-van-doorgestuurde mail (dan zit er alleen
  nog een handtekening-logo aan). Kwam voorbij tijdens de keuring; ligt aan wat er wordt doorgestuurd, geen
  app-bug. Nice-to-have.
