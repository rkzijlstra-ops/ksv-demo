# Compleet systeem blok 6a: accounts, rollen en uitnodig-scherm

Datum: 2026-06-04
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-6-accounts.md`, `PLAN-COMPLEET-6a-accounts.md`

## Brainstorm-keuzes (Reinier)

Alleen KSV nu; monteur ziet alleen eigen toegewezen klussen; monteurs worden echte accounts;
accounts aanmaken via een in-app uitnodig-scherm (Reinier nodigt iedereen uit). Inloggen blijft
zonder wachtwoord (magic link of Google); de app onthoudt de sessie.

## Wat gebouwd is (6a = fundament, nog geen afscherming/gates)

- Migratie `schema-compleet-6a-accounts.sql`: tabellen `opdrachtgevers` (zaken, één KSV-rij) en
  `profielen` (rol + naam + zaak per account). Commentaar-sjabloon om jezelf als beheerder te zetten.
- `db.ts`: types Rol/Opdrachtgever/Profiel; functies getProfiel, getProfielen,
  getStandaardOpdrachtgever, upsertProfiel (met tests).
- `supabase-admin.ts`: service-role client voor het aanmaken/opzoeken van accounts.
- `uitnodig-mail.ts` (+ test) + `verstuurUitnodiging` in mail.ts (via Resend).
- `POST /api/mensen/uitnodigen` (+ test): alleen beheerder; account aanmaken of opzoeken, profiel
  zetten, uitnodigingsmail sturen.
- Scherm `/mensen`: alleen beheerder; uitnodig-formulier (naam, e-mail, rol) + lijst van accounts.

## Verificatie

- `npm test`: 345 groen (was 334, +11).
- `npm run build`: slaagt, `/mensen` en de uitnodig-route in de routelijst.

## Te doen door Reinier (volgorde)

1. `supabase/schema-compleet-6a-accounts.sql` draaien in Supabase.
2. Jezelf eenmalig als beheerder zetten: het commentaar-sjabloon onderaan die SQL, je eigen
   e-mailadres invullen, los runnen. (Je moet wel al een keer ingelogd zijn, zodat je auth-account
   bestaat.)
3. Daarna kun je op `/mensen` Ed en de monteurs uitnodigen.
4. Zorg dat `RESEND_API_KEY`/`RAPPORT_EMAIL` in Vercel staan voor de uitnodigingsmail.

## Vervolg

- 6b: routing/gates per rol + monteur-dropdown op planbord (echte accounts) + mail naar het echte
  monteur-adres.
- 6c: RLS aanzetten (de echte afscherming).
