# Plan blok 6a: tabellen, rollen en uitnodig-scherm

Datum: 2026-06-04
Hoort bij: `DESIGN-COMPLEET-6-accounts.md`
Scope 6a: fundament voor accounts. Nog GEEN RLS en GEEN routing-gates (komt in 6b/6c), zodat de
app blijft werken zoals nu; dit voegt alleen toe.

## Taken

### 6a-1: datamodel + db-functies (TDD)
- Migratie `supabase/schema-compleet-6a-accounts.sql`: tabellen `opdrachtgevers` (id, naam) en
  `profielen` (id = auth uid, rol, naam, opdrachtgever_id). Eén KSV-rij invoegen. Commentaar-sjabloon
  om Reinier zelf als beheerder te zetten. Idempotent.
- `db.ts` (+ tests): types Rol/Opdrachtgever/Profiel; functies `getProfiel`, `getProfielen`,
  `getStandaardOpdrachtgever`, `upsertProfiel`.

### 6a-2: admin-client + uitnodig-endpoint + mail (TDD waar mogelijk)
- `src/lib/supabase-admin.ts`: service-role client voor auth-admin.
- `src/lib/uitnodig-mail.ts` (+ test): pure tekstbouwer voor de uitnodiging.
- `mail.ts`: `verstuurUitnodiging` (Resend).
- `POST /api/mensen/uitnodigen` (+ test): alleen beheerder; account aanmaken of opzoeken
  (admin API), profiel zetten, uitnodigingsmail sturen.

### 6a-3: scherm /mensen (beheerder)
- `src/app/mensen/page.tsx`: lijst van profielen + formulier (naam, e-mail, rol) -> uitnodigen.
- Client-component voor het formulier.

### 6a-4: afronden
- `npm test` + `next build` groen. Logboek. Reinier draait SQL (incl. zichzelf als beheerder).

## Keuzes
- Eén zaak (KSV) als enige opdrachtgever-rij; helper pakt die ene rij. Multi-zaak later.
- Uitnodiging via Resend (niet Supabase-mail), zodat we niet van Supabase-mailconfig afhangen.
- Eerste beheerder (Reinier) wordt eenmalig via SQL gezet; daarna nodigt hij de rest in de app uit.

## Niet in 6a (bewust)
- RLS/afscherming (6c), routing-gates per rol en monteur-dropdown op planbord (6b).
