# Opleverrapport: meldingen bovenaan + foto's downloaden

Datum: 2026-07-01
PR: #45 (gemerged naar master, merge-commit 86c8d02)

## Aanleiding

Opbouwende kritiek van de opdrachtgever (Ed) op de oplever-rapportjes:
1. Meldingen graag bovenaan en duidelijker aangegeven.
2. Het overzicht (sectie 1) in dezelfde volgorde als het rapport zelf.
3. Sommige foto's uit de PDF kunnen slepen naar zijn eigen programma.

## Wat er is gebouwd

Verwerkt in de PDF (`src/lib/rapport.ts`) én de in-app weergave (`RapportWeergave.tsx`),
die elkaar spiegelen en samen ook de app-preview en het handleiding-voorbeeld voeden. Ook de
snel-opleveren-variant (`verkorting`) meegenomen.

- **Meldingen bovenaan.** Meldingen is nu sectie 1, Oplevering sectie 2, Controle sectie 3. Boven de
  secties een meldingen-balk (kleur + icoon + tekst): **rood** bij spoed, **oranje** bij gewone
  meldingen, **groen** als er geen zijn. Elke melding is een kaart met een volledige gekleurde
  linkerbalk (rood/oranje) en klein label, zoals de mockup.
- **Overzicht** als los blok bovenaan, in dezelfde volgorde als de secties.
- **Foto-nummering** loopt meldingen-eerst; interne foto's/video (zaak) staan bewust ná de eindstaat
  zodat de doorlopende nummering meldingen+eindstaat gelijk blijft aan de downloadpagina.
- **Foto's downloaden (alleen zaak-versie).** Knop in het rapport (tussen overzicht en meldingen) →
  publieke pagina `/klus/[id]/fotos` (in rapport-stijl, meldingen met tekst bovenaan). Vinkjes +
  "Download alles"/"Download selectie" → zip via `/api/klus/[id]/fotos/zip` (`fflate`; alleen indexen
  uit de eigen fotolijst, geen losse URL's → geen SSRF). Toegang via het niet-raadbare opdracht-id
  (UUID), toegevoegd aan de PUBLIEK-lijst in `supabase-middleware.ts`.
- Interne-notitie-blok gelijkgetrokken met de app: geel kader (urgent-geel) met zwarte letters.

### Waarom download i.p.v. bijlagen in de PDF

Foto's als PDF-bijlage sleep je alleen in Adobe en het maakt de gemailde PDF zwaar (bounce-risico bij
strenge DMARC). De downloadpagina houdt de PDF licht, werkt in elke viewer en op de telefoon, en laat
gericht kiezen.

## Nieuwe/gewijzigde bestanden

- Nieuw: `src/lib/rapport-indeling.ts` (pdf-lib-vrije, gedeelde pure helpers), `.../klus/[id]/fotos/page.tsx`
  + `FotoDownloadClient.tsx`, `.../api/klus/[id]/fotos/zip/route.ts`. Dependency `fflate` toegevoegd.
- Gewijzigd: `rapport.ts`, `RapportWeergave.tsx`, `opdracht/[id]/rapport/page.tsx`, `supabase-middleware.ts`.
- Design: `DESIGN-RAPPORT-MELDINGEN-BOVENAAN.md`.

## Tests

- `rapport-indeling.test.ts` (meldingen-balk-status/tekst, foto-groepen/nummering, download-namen/index).
- `rapport.test.ts` uitgebreid (foto-downloadlink zaak-wel/klant-niet, `fotoDownloadLink`, geldige PDF's).
- `api/klus/[id]/fotos/zip/route.test.ts` (statuscodes 404/400/502, zip-magic, selectie).
- 986 unit-tests + typecheck + lint + productie-build groen. Cloud-CI (e2e) groen.
- PDF-opmaak zelf visueel gecontroleerd door de PDF naar beeld te renderen (3 pagina's).

## Geen DB-migratie

Deze feature raakt het schema niet; geen productie-migratie nodig.

## Omgevingen

Na de merge: hoofdmap op master gezet, `omgeving-test` bijgetrokken naar master (test niet achter prod).
Feature-worktree opgeruimd.
