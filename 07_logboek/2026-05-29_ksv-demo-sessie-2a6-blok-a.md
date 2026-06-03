# KSV Demo - Sessie 2A.6 Blok A gebouwd (opdracht met meerdere documenten)

Datum: 2026-05-29
Project: `01_projecten/keukenstudio-voorschoten-demo`
Doel Blok A: app bruikbaar maken voor echte opdrachten met meerdere documenten per opdracht
Resultaat: backend + UI van Blok A klaar. 125 tests groen (was 91), tsc schoon, `next build` slaagt.

## Voorbereiding: echte week 23-data van Ed bekeken

De planningsmail van Ed (28 mei 2026, BKM-mailbox) gelezen en de bijlagen lokaal gehaald via de
google-bkm MCP (download_attachment schrijft naar de echte schijf, want de server draait lokaal op
127.0.0.1). Bestanden in `test-pdfs/week23/` (gitignored wegens klant-PII).

Belangrijke vondst: de mail is GEEN één opdracht met 4 documenten (zoals de brainstorm aannam), maar
een weekplanning met DRIE losse orders:
- 7636 Heesakkers (Leiden): montage-orderbevestiging, 2 pag, afzuigkap + plasmafilter
- 7407 Dijk (Leiden): montage-orderbevestiging 16 pag (hele keuken) + werkblad-schets (PNG)
- 7320 Putman (Noordwijk): service-werkbon, melding "afdekplaatjes manco, verkeerde ladenbak"

Lessen die het ontwerp stuurden (vastgelegd in DESIGN-2A6.md):
1. Eén mail kan meerdere opdrachten bevatten -> matchen op referentienummer, niet per mail.
2. Documenten zijn niet alleen PDF (werkblad-schets is PNG) -> model "documenten" (pdf + afbeelding).
3. Twee echte PDF-layouts: montage-orderbevestiging (leverweek, apparatuur, geen meldingen) vs
   service-werkbon (Uw melding). Parser moet het type herkennen.
4. Voor het opleverrapport telt de kop + monteur-meldingen + foto's, niet de 16-pagina kastenlijst.

## Beslissingen (door Rein bevestigd)

- Parser leest van montage-orders alleen de KOP (klant/adres/ref/telefoon/adviseur/leverweek +
  documenttype). Kastenlijst blijft het originele PDF dat de monteur opent.
- Mail-route opleverrapport (Blok B) wordt Resend, achter `lib/mail.ts`. Schaalt door bij meerdere
  monteurs; later hooguit eigen verzend-domein verifiëren (DNS, geen code-herbouw).
- Datamodel: LICHTE uitbreiding. Opdracht blijft een `meldingen`-rij; één nieuwe tabel `documenten`
  + extra kolommen. Volledige normalisatie (aparte opdrachten/klanten-tabellen) blijft sessie 4+.

## Wat is gebouwd (TDD, RED-GREEN per taak)

- Schema-migratie `schema-2a6-documenten.sql`: tabel `documenten`, kolommen leverweek/documenttype/
  opdracht_status/opgeleverd_at/rapport_url + toekomstvaste user_id/toegewezen_aan, bucket
  `opdracht-documenten`. (Nog te draaien in Supabase.)
- Parser: `documenttype` + `leverweek` in schema; prompt detecteert orderbevestiging vs werkbon,
  meldingen alleen bij service.
- Storage: `uploadOpdrachtDocument` naar de nieuwe bucket.
- db: `createOpdracht` (toekomstvast), `addDocument`, `getDocumentenVoorOpdracht`; Melding-type uitgebreid.
- API: `POST /api/opdrachten` (meerdere bestanden -> 1 opdracht, primaire PDF geeft de kop; ook
  tekst-only; parserfout blokkeert niet) + `POST /api/opdrachten/[id]/documenten`.
- UI: `OpdrachtAanmaken` (multi-upload + handmatige opdracht) op de werkbak; opdracht-detail toont
  documenten met "open origineel" + "document toevoegen" + leverweek; `DocumenttypeBadge`
  (montage/service/handmatig) op kaart en detail. Ongebruikte PdfUpload + BronBadge verwijderd.
- Build-fix: `allowImportingTsExtensions` in tsconfig, zodat `next build` (Vercel) niet struikelt
  over `scripts/check-env.ts`. Pre-existing probleem, nu opgelost.

## Nog te doen (A10, wacht op Rein)

1. `supabase/schema-2a6-documenten.sql` in Supabase draaien. ZONDER deze migratie crasht de
   opdracht-detailpagina (leest nu de documenten-tabel).
2. Live testen: de drie week 23-orders via de aanmaak-flow inschieten (7407 met PDF + PNG samen),
   controleren dat 7407 twee documenten heeft, service-opdracht de meldingen toont, originelen openen.
3. Daarna Blok B: opleveren-knop -> rapport-pagina -> PDF (pdf-lib) -> Resend-mail (apart plan).

## Conclusie

Het fundament voor "opdracht met meerdere documenten" staat en is op test/build-niveau geverifieerd.
De praktijktest (echte data in de live-app) is de volgende stap zodra de migratie gedraaid is.
