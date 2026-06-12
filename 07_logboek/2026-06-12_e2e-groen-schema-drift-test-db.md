# 2026-06-12 E2E groen na schema-drift op de test-DB

## Wat er speelde

Vervolg op de verbouwing van 11 juni (interne notitie + ontkoppelde klant/zaak-verzending).
Vanmorgen de migratie en de browser-e2e afgemaakt. De e2e viel eerst om op twee oplever-tests.

## Stappen

1. Migratie 15 (`schema-compleet-15-interne-notitie-verzending.sql`) op de **productie**-DB (door Rein
   via de Supabase SQL-editor) en op de **test**-DB (via `npm run migrate:test`). Beide voegen alleen
   nullable kolommen toe, idempotent.
2. Volledige e2e gedraaid: 45 groen, 2 rood. Beide rode zaten in de oplever-concept-opslag.

## De bug (root cause)

Niet de nieuwe code. **Schema-drift op de test-database.** De test-DB miste de kolom `controle`
(uit migratie 14, `schema-compleet-14-oplever-controle.sql`). Die migratie was wel op productie
gedraaid maar nooit op de test-DB. Omdat `OpleverFlow` bij elke concept-opslag `controle` meestuurt,
weigerde PostgREST de hele upsert ("Could not find the 'controle' column ... in the schema cache")
en werd er niets opgeslagen. De UI toonde lokale staat alsof het goed ging, de route slikte de 503.

Gevonden door de echte foutmelding uit de Playwright-trace te halen (network-response van de
oplever-POST), niet door te gokken. Twee eerdere hypotheses (cache van de nieuwe kolommen; de losse
selector) waren deels mis.

Daarnaast een losse test-bug: de selector `getByRole("button", { name: "Akkoord" })` matchte ook
"Niet akkoord" (deeltekst). Opgelost met `exact: true`.

## Fixes

- Test-DB: migratie 14 alsnog gedraaid, daarna `notify pgrst, 'reload schema'` om de schema-cache te
  verversen.
- `e2e/opleveren.spec.ts`: Akkoord-selector exact gemaakt.
- `scripts/migrate.mjs`: stuurt voortaan na elke migratie automatisch `notify pgrst, 'reload schema'`,
  zodat een e2e-run vlak na een migratie niet meer op een stale cache valt.
- Commit `e7454a8`, gepusht naar `master`. Pre-push hook draaide de volledige suite groen
  (542 unit + 13 integratie + 47 e2e). Vercel deployt.

## Nieuwe-flow e2e geschreven (zelfde dag)

`e2e/verzending.spec.ts` toegevoegd, drie tests groen tegen de test-DB, zonder echte mail:
- klant-versturen registreert de klant-velden en laat de opdracht-status met rust;
- zaak-versturen zet 'opgeleverd' en registreert de zaak-velden;
- privacy (browser, als opdrachtgever): het oplever-blok én de interne notitie verschijnen pas na de
  zaak-verzending (gate op `zaak_rapport_verzonden_at` in de dashboard-detailpagina).

De zaak-verzending wordt gesimuleerd via dezelfde db-functies als de route (`registreerKlant/ZaakRapport`),
zodat we niet echt mailen. De mailstap zelf blijft in `mail.spec` achter `E2E_MAIL` (tegen productie).
De interne notitie die niet naar de klant-PDF mag lekken, blijft unit-gedekt in `rapport.test.ts`.

Valkuil onderweg: de seed gebruikte eerst nep-foto-URL's (`https://x/...`); zodra het oplever-blok
rendert gooit `next/image` een fout omdat de host niet in `next.config` (`*.supabase.co`) staat. Seed
nu met een toegestane host.

## Nog open (bewust)

- De mailstap zelf (klant- en zaak-mail echt versturen) blijft alleen E2E_MAIL-gedekt tegen productie;
  geen test-DB-variant omdat er geen mail-dry-run is.
- Werkpool-geheugensteun "rapport naar zaak nog versturen" nog niet gebouwd (los vervolgklusje).

## Les

Test-DB en productie kunnen uit elkaar lopen omdat `migrate:test` per los bestand draait; er is geen
migratie-administratie die afdwingt dat alles is toegepast. Bij een rare DB-fout op de test-DB:
eerst de echte kolommen vergelijken (information_schema) voordat je in app- of testcode duikt.
