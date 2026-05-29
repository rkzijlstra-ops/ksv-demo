# DESIGN Sessie 2A.6 - Opdracht met documenten + opleverrapport

Datum: 2026-05-29
Status: design ter goedkeuring (FASE 2/3 discipline)
Basis: BRAINSTORM-2A6.md (keuzes bevestigd) + echte week 23-data van Ed bekeken

## Echte testdata bekeken (week 23-mail, BKM-mailbox)

Eén planningsmail van Ed met DRIE losse orders (geen 1 opdracht):

| Ref | Klant | Type | Document(en) |
|-----|-------|------|--------------|
| 7636 | Heesakkers, Leiden | montage | orderbevestiging, 2 pag (afzuigkap + plasmafilter) |
| 7407 | Dijk, Leiden | montage | orderbevestiging 16 pag (hele keuken) + werkblad-schets (PNG) |
| 7320 | Putman, Noordwijk | service | werkbon service (melding: afdekplaatjes manco, verkeerde ladenbak) |

Bestanden lokaal: `test-pdfs/week23/`.

### Wat de data leert (afwijkingen t.o.v. brainstorm-aanname)

1. **Eén mail kan meerdere opdrachten bevatten.** Documenten horen bij een opdracht op
   **referentienummer**, niet per mail. (Vooral relevant 2B, bevestigt multi-doc nu.)
2. **Documenten zijn niet alleen PDF.** 7407 heeft ook een PNG-werkbladschets. Model moet
   "documenten" zijn (pdf + afbeelding), niet "PDF's".
3. **Twee echte PDF-layouts:**
   - **Orderbevestiging (montage):** kop met Referentienummer / Orderbev.nr / Orderverwerker /
     Datum order / Adviseur / Telefoon klant / Email / Gepl. leverweek; afleveradres; daarna
     keukenmeubelen-specs en/of apparatuur-tabel. GEEN "Uw melding".
   - **Werkbon service:** Gegevens klant / Referentienr / Artikel / "Uw melding" met klachten.
     (Dit is wat de huidige parser al kan.)
4. **Voor het opleverrapport telt de kop + monteur-meldingen + foto's,** niet de 16-pagina
   kastenlijst. Die blijft het origineel dat de monteur opent (brainstorm-keuze 2).

## Bevestigde keuzes deze sessie (door Rein, 2026-05-29)

- Parser-diepte montage: **alleen de kop** uitlezen (klant/adres/ref/telefoon/adviseur/leverweek
  + documenttype). Service houdt ook `meldingen[]`. Kastenlijst blijft origineel PDF.
- Mail-route opleverrapport: **Resend**, afgeschermd achter `lib/mail.ts`. Productie-grade en
  schaalt door (gratis tier 3000/maand); later hooguit eigen verzend-domein verifiëren (DNS, geen
  code-herbouw). Provider-wissel = alleen dat ene bestand.

## Datamodel (lichte uitbreiding, geen grote refactor)

Bewuste keuze: **opdracht blijft een `meldingen`-rij** met `opdracht_id IS NULL` (zoals nu).
We voegen ÉÉN nieuwe tabel toe + een paar kolommen. Reden: de volledige normalisatie naar
aparte `opdrachten`/`klanten`-tabellen staat in PROJECT.md als sessie 4+; nu zou het de 91
bestaande tests en alle routes/UI onnodig omgooien. Het lichte pad levert dezelfde gebruikerswaarde.

### Nieuwe tabel `documenten`

```
documenten
  id               uuid pk
  created_at       timestamptz default now()
  opdracht_id      uuid  -> meldingen(id) on delete cascade   (de opdracht-rij)
  type             text  check (type in ('pdf','afbeelding'))
  bestandsnaam     text                                       (origineel, bijv. 7407-...pdf)
  storage_pad      text                                       (pad in bucket)
  publieke_url     text                                       (direct te openen vanuit app)
  referentienummer text                                       (uit doc, voor latere matching)
  is_primair       boolean default false                      (1 doc waaruit kop is gevuld)
```

### Nieuwe kolommen op `meldingen` (= opdracht-rij)

```
leverweek        text          (bijv. '22/2026', uit orderbevestiging; null bij service/tekst)
documenttype     text          ('orderbevestiging' | 'werkbon_service' | 'tekst' | null)
opdracht_status  text default 'open'  check in ('open','opgeleverd')   (los van melding-status!)
opgeleverd_at    timestamptz
rapport_url      text          (link naar opgeslagen oplever-PDF)
user_id          uuid          (TOEKOMSTVAST: wie maakte de rij; nu altijd null)
toegewezen_aan   uuid          (TOEKOMSTVAST: welke monteur; nu altijd null)
```

Toekomstvast: `user_id`/`toegewezen_aan` als nullable kolommen erbij, db-insert via expliciete
velden, query-functies klaar voor een latere gebruiker-filter. Nu geen auth-logica.

### Nieuwe storage-bucket `opdracht-documenten` (public)

Naast bestaande `meldingen-fotos`. Voor de originele PDF's/afbeeldingen per opdracht.

## Parser-uitbreiding

`ParsedPdfSchema` krijgt erbij (backward-compatible, nullable):
- `documenttype`: 'orderbevestiging' | 'werkbon_service' | 'onbekend'
- `leverweek`: string | null

System-prompt: niet meer "altijd service-melding" aannemen. Eerst type bepalen:
- bevat "Orderbevestiging" + "Gepl. leverweek" -> orderbevestiging, `meldingen` leeg laten
- bevat "WERKBON SERVICE" + "Uw melding" -> werkbon_service, `meldingen[]` vullen
- anders -> onbekend, beste-poging kop

Kop-velden (klant_naam/adres/ref/telefoon/adviseur) blijven; gelden voor beide layouts.
Afbeeldingen (PNG-schets) worden NIET geparsd, alleen als document opgeslagen.

## Aanmaak-flow (3 ingangen, brainstorm-keuze 3)

a) **Meerdere bestanden tegelijk -> 1 opdracht.** Eerste PDF (of gekozen primair doc) wordt
   geparsd voor de kop; ÉÉN opdracht-rij wordt gemaakt; alle bestanden komen als `documenten`-rijen
   + originelen in de bucket. Afbeeldingen tellen mee als document, parsen niet.
b) **Documenten toevoegen aan bestaande opdracht.** Knop op opdracht-detail: upload extra
   doc(s) -> nieuwe `documenten`-rijen bij die opdracht.
c) **Opdracht zonder PDF (alleen tekst).** Formulier: klant/adres/ref/telefoon handmatig ->
   opdracht-rij met `documenttype='tekst'`, geen documenten.

## Opleverflow (brainstorm-keuze 4)

- Monteur verzamelt meldingen tijdens de klus (concept), urgente kan los verstuurd worden (bestaat al).
- Knop "Opdracht opleveren" op opdracht-detail -> bundelt alle meldingen van de opdracht in één
  rapport, zet `opdracht_status='opgeleverd'`, `opgeleverd_at=now()`, slaat rapport-PDF op,
  mailt het (zie mail). Opdracht schuift naar history/opgeleverd.

## Rapport (brainstorm-keuze 5)

- Bron = web-pagina `/opdracht/[id]/rapport` (server-rendered): kop (klant/adres/ref/leverweek) +
  per melding urgentie/tekst/foto's + datum.
- PDF-generatie met **pdf-lib** (al geïnstalleerd) uit dezelfde data, of html->pdf. Voorkeur:
  data -> pdf-lib (geen extra browser-dependency, werkt op Vercel serverless).

## Mail (brainstorm-keuze 6)

- `lib/mail.ts` met `verstuurOpleverRapport({ naar, opdracht, pdfBuffer })`. Implementatie: Resend
  SDK, API-key uit env. Verstuurt naar de monteur (eigen kopie) ÉN de zaak (vast adres in env).
- Bij ontbrekende mail-config: duidelijke fout, opleveren mag niet stil falen.

## Scope: bouwen in blokken (1 sessie is veel; eerlijk opdelen)

- **Blok A - fundament + multi-document.** Schema (`documenten` + kolommen + bucket), parser
  (documenttype/leverweek), db-laag (documenten CRUD, opdracht uit tekst), aanmaak-flow a+b+c,
  opdracht-detail toont documenten + open-origineel. Lost "ik zie maar een deel" op.
- **Blok B - opleveren.** Opleverflow, rapport-pagina, PDF-generatie, `lib/mail.ts` + Resend.

Voorstel: eerst Blok A volledig met TDD, dan Blok B. Per blok een eigen PLAN-sectie.

## Edge cases

- Geen referentienummer in doc -> opdracht-rij met ref=null, attentie-label (PROJECT.md), geen harde fout.
- Parser faalt op een doc -> opdracht toch aanmaken met lege kop + het origineel bewaren (monteur kan openen).
- Opleveren zonder meldingen -> waarschuwing "geen meldingen, toch opleveren?" (leeg rapport mag).
- Groot bestand (7407 = 4.3MB) -> binnen 10MB-limiet; bucket-upload prima. Parser krijgt alleen primair doc.
- Mail mislukt -> opdracht NIET op opgeleverd zetten, fout tonen, opnieuw kunnen proberen.
