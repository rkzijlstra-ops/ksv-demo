# Vers ontwerp opleverrapport gebouwd (richting B: Inspectierapport)

Datum: 2026-06-11

Vervolg op `2026-06-11_handoff-vers-rapport-ontwerp.md`. Het opleverrapport is met een frisse blik
opnieuw ontworpen, geen afgeleide van het oude.

## Aanpak

- UI/UX-skill (`ui-ux-pro-max`) erbij gepakt. De Python-CLI van die skill werkt niet (geen Python op
  deze machine), dus de skill-principes direct toegepast: ingetogen kleur, contrast, kleur niet als
  enige indicator, consistent ritme/witruimte.
- Drie mock-ups gemaakt als **echte pdf-lib-PDF's** (niet HTML), omdat het rapport zelf ook pdf-lib is.
  Zo is wat Rein kiest gegarandeerd bouwbaar en kon ik de PDF's zelf bekijken en bijschaven. Generator
  stond tijdelijk in `src/lib/_mockups-rapport.test.ts` (verwijderd na de keuze).
  - A — Notarieel: serif (Times), monochroom, haarlijnen, veel rust.
  - B — Inspectierapport: Helvetica, gegevenstabel, genummerde secties, leader-puntjes, checkbox-vinkje.
  - C — Modern minimaal: grote typografie, veel lucht, vrijwel geen randen, warme zandaccent.
- **Rein koos B.**

## Wat er staat (B, gebouwd in `src/lib/rapport.ts`)

- Briefhoofd: accentbalk + bedrijfsnaam (uit monteur-profiel) + label OPLEVERRAPPORT + opleverdatum.
- Klant-gegevenstabel met haarlijn-rijen (Klant / Adres / Referentienummer / Leverweek / Keukenzaak),
  alleen ingevulde velden.
- Sectie 1 Oplevering: status als leader-regels (Ondertekend / Video / aantal eindstaat-foto's),
  opmerking in een zacht vlak met accent-streep, eindstaat-foto's in 2-koloms raster.
- Sectie 2 Meldingen: per melding kop (Melding/Spoed, rood bij spoed) + datum + tekst + foto's.
  Doorlopende foto-nummering over het hele rapport (vlaggetje linksboven). Alle foto's klikbaar
  (link-annotatie, opent groot in de browser).
- Sectie 3 Controle bij oplevering: checkbox met getekend vinkje (Akkoord groen / Niet akkoord rood).
- Sectie 4 Bijlagen: hint + klikbare videolink (de foto's zijn zelf al klikbaar, dus geen apart
  foto-linkgrid meer).
- Handtekening klant onderaan in een kader + naam/datum. Voettekst met afzender-contact, gecentreerd.

## Kleur

Accent is staalblauw `rgb(0.2, 0.34, 0.46)`, bewust ingetogen (geen fel oranje/roodbruin dat Rein
"goedkoop" vond). Status groen/rood. Accent is één constante in `rapport.ts`, dus later in één regel
bij te draaien als Rein een andere tint wil.

## Datum

Nieuwe pure functie `formatDatumLang` in `src/lib/datum.ts`: "10 juni 2026" (voluit met jaartal), voor
het briefhoofd en de handtekeningregel. Inline melding-datums blijven `formatDatumKort` ("10 jun").

## Tests

- `formatDatumLang` met eigen unit-tests in `datum.test.ts` (TDD, eerst test, dan functie).
- Bestaande `rapport.test.ts` (contract: geldige PDF, niet crashen bij ontbrekende data / mislukte
  fetch / akkoord+niet-akkoord, doorlopende nummering, pure helpers) blijft het vangnet en is groen.
- Volledige unit-suite: **531 groen** (was 526 + 5 nieuwe datum-tests). `tsc --noEmit` schoon.
- **E2e nog te doen, samen met Rein** (zoals afgesproken).

## Opruimen

`test-pdfs/` is nu volledig gegitignored (was alleen `/test-pdfs/week23/`); preview/mock-up-PDF's
horen nooit in git. De PDF's staan nog wel op schijf om te bekijken.

## Na Reins eerste review (zelfde dag)

- Bug: de ondertekenaarsregel onder het handtekening-kader liep door de onderlijn. Afstand onder het
  kader vergroot (van 6 naar 16pt), regel staat nu vrij.
- Controle-uitkomst toegevoegd aan het overzicht in sectie 1 (vierde leader-regel "Controle bij
  oplevering -> Akkoord" groen, of "N niet akkoord" rood). Detail blijft in sectie 3. `controle` is
  daarvoor één keer bovenaan afgeleid (dubbele declaratie bij sectie 3 weg).
- Bijlagen-tekst vermeldt nu expliciet dat de klant een foto/de video kan opslaan en zelf doorsturen
  (bijv. naar een leverancier).

## Foto- en video-URL's (relevant voor klant-gebruik)

- Foto's: bucket `meldingen-fotos`, video: bucket `oplever-videos`, beide via `getPublicUrl` ->
  **permanente publieke URL's** (geen vervaltijd/handtekening). Bestandsnamen zijn UUID's.
- Gevolg: de klikbare links in het rapport zijn betrouwbaar en verlopen niet. De klant kan een foto of
  de video openen, op volle (originele) resolutie opslaan en als bijlage doorsturen. De foto's *in* de
  PDF zijn bijgesneden tegel-versies; het origineel zit achter de link.
- Aandachtspunt voor productie-hardening (niet nu): de buckets zijn publiek (niet achter login). Voor
  keukenfoto's meestal acceptabel, maar bewust meenemen vóór live met echte klanten.

## Commit/push-situatie (parallel werk)

- Dit rapport-werk is lokaal gecommit (alleen `rapport.ts`, `datum.ts`, `datum.test.ts`, `.gitignore`,
  dit logboek). Bewust specifiek gestaged, niet `git add -A`, omdat er parallel in een andere terminal
  aan de **Akkoord-knop in de oplevering** (`OpleverFlow.tsx`) wordt gewerkt.
- De e2e `e2e/opleveren.spec.ts` is op de huidige master rood op precies die Akkoord-knop (regel 120):
  dat is het onaffe parallelle UI-werk, niet deze redesign. Mijn changeset raakt het oplever-scherm niet.
- **Nog niet gepusht.** De pre-push hook (`.githooks/pre-push`) draait `npm run test:all` (incl. e2e) en
  pushen = deploy naar Vercel. Push wacht dus tot de andere terminal de Akkoord-knop af heeft en de
  volledige suite groen is; dan pushen Rein en ik samen. Niet forceren met `--no-verify`.
