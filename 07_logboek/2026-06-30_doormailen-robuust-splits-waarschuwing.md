# Doormailen robuust: splits-waarschuwing + adres in invoer-venster

Datum: 2026-06-30
PR: #41 (master, commit 037854b). Branch `feature/doormail-invoer`.
Migratie: `schema-compleet-30-controleer-splitsing.sql` (test + demo via `migrate:test`, productie handmatig door Reinier).

## Aanleiding

Reinier merkte in de praktijk: een opdracht invoeren door de mail simpelweg door te sturen naar het
persoonlijke inbound-adres is veruit de eenvoudigste weg. Bijlagen én de beschrijving uit de mailtekst
blijven behouden, terwijl je die bij handmatig downloaden en inschieten kwijtraakt. Twee dingen stonden
die weg in de weg, en die zijn nu opgelost.

## Feature 1: vermoeden meerdere opdrachten (hybride splitsing)

Een mail kan twee keukens bevatten zonder onderscheidende referentienummers, of meerdere opdrachten in
de mailtekst. De app voegde dat eerst stilzwijgend samen tot één klus; een monteur die dat niet doorhad
ging de fout in. Nu:

- De inbound-route detecteert het vermoeden: eerst een gratis klant-heuristiek op de PDF-koppen
  (`detecteerMeerdereKlanten`, twee verschillende `naamKern`-en), anders een lichte Claude-beoordeling
  van de mailtekst (`beoordeelMeerdereOpdrachten`). Bij twijfel: waarschuwen (vals-positief kost één tik,
  een gemiste splitsing kost gezichtsverlies bij de klant).
- Er wordt niet stil gesplitst. Er ontstaat één voorstel met `controleer_splitsing=true`, een reden en een
  bewaarde `splits_voorstel` (delen + document-id's).
- De gebruiker kiest: **Splits in aparte klussen** (één tik: losse voorstellen, documenten meeverhuisd via
  `verplaatsDocument`, origineel soft-deleted) of **Het is er één**. Werkt voor de monteur (inbox +
  klusdetail) en kantoor (dashboard-klusdetail; opdrachtgever van de zaak mag splitsen/bevestigen).

Bewust gekozen met Reinier: optie 2 (alleen waarschuwen) als ingang, met de splits-knop die optie 1
(losse klussen) oplevert. Geen automatisch splitsen, want een verkeerd gesplitste klus is erger dan een
gemarkeerde. De detectie is best-effort: een fout (bv. de Claude-call) laat de al-aangemaakte klus staan.

## Feature 2: inbound-adres in het klus-toevoegen-venster (variant A)

Het mailadres stond verstopt onder menu > Mijn gegevens. Nu staat het kopieerbaar als derde manier in
het klus-toevoegen-venster (`KlusInvoer`), direct onder "Bestand kiezen" / "Order fotograferen", met de
tekst "Of mail de opdracht door, dan staat de klus vanzelf in je kluspool." Blijft ook in Mijn gegevens.
Mockups (drie varianten A/B/C) zijn met Reinier doorgenomen; variant A gekozen.

## Tests (vier lagen)

- Unit: `splits-detectie.test`, `claude-client.test` (beoordeling), `inbound/route.test` (vlag + voorstel),
  `inbound/[id]/splitsen/route.test`. 963 unit groen.
- Integratie: 19 groen.
- E2e: `splits-voorstel.spec` (splitsen, bevestigen als één, adres in venster). 3 groen.
- `TOESTANDEN.md` en `TESTDEKKING.md` bijgewerkt met de nieuwe toestandsmatrix en dekking.

## Les geleerd: niet keuren tijdens een CI-run

De eerste cloud-CI was rood: alleen de twee nieuwe e2e-tests faalden met een 15s-timeout. Lokaal waren ze
in elke configuratie groen (volle suite, los, met CI-vlag, na productie-build). Oorzaak: de CI-e2e en
kluslus-test delen dezelfde test-database, en Reinier keurde op kluslus-test precies tijdens de CI-run.
De testdata liep door elkaar. Een schone re-run (zonder gelijktijdige keuring) was meteen groen. Dit
bevestigt de bestaande regel uit OMGEVINGEN.md: geen CI triggeren / geen keuren terwijl de ander de
gedeelde test-DB gebruikt.

## Werkwijze

Test-first op een eigen worktree, design + plan vooraf (`DESIGN-DOORMAIL-INVOER.md`,
`PLAN-DOORMAIL-INVOER.md`), branch -> CI groen -> omgeving-test -> keuring Reinier -> merge naar master
door Reinier. Productie-migratie 30 door Reinier gedraaid vóór de merge.
