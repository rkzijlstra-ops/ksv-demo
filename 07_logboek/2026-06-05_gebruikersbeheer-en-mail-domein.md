# Gebruikersbeheer compleet + mail op eigen domein

Datum: 2026-06-05
Project: KSV demo-app (Kluslus)

## Mail op eigen domein (kluslus.nl)

- Productnaam gekozen: **Kluslus**. Domeinen kluslus.nl en kluslus.com geregistreerd (kaal:
  geen hosting/Premium DNS/iubenda; app draait op Vercel).
- Resend-domein kluslus.nl geverifieerd, afzender `Keukenstudio Voorschoten <planning@kluslus.nl>`.
  Vanaf nu mailt de app naar echte (externe) adressen, niet meer alleen het eigen account.
- Reply-to ingebouwd (`RESEND_REPLY_TO`, instelbaar): antwoorden komen op
  `bkmkeukenmontage+kluslus@gmail.com`. Gmail-labelstructuur aangemaakt: Kluslus > Klanten/
  Keukenstudio Voorschoten, Systeem, Sales. Filter zet Reinier zelf (MCP heeft geen filter-tool).
- Uitnodig-mail sloot per ongeluk af met "BKM Keukenmontage"; nu de keukenzaak (uit de database).

## Gebruikersbeheer (blok 6 vervolg)

Aanleiding: Reinier vroeg of hij een testmonteur kon verwijderen. Dat kon niet, en het bracht een
breder patroon aan het licht: tegenhangers (vooral verwijderen/wijzigen) vallen stelselmatig weg
uit de initiele bouw. Structurele fix: een **volledigheids-check (levenscyclus)** toegevoegd aan de
skill projectstart-discipline en als feedback-memory vastgelegd. Toegepast op dit scherm.

Gebouwd (TDD, commit per laag):
- db: `telBeheerders`, `telToegewezenOpdrachten`, `updateProfielRol`.
- mail: `verstuurAfmelding` + pure `afmeldingTekst`.
- API `/api/gebruikers/[id]`: DELETE (guards: niet jezelf, laatste beheerder beschermd, monteur met
  openstaande klussen geblokkeerd; account weg via admin.deleteUser, profiel cascadeert; afmeld-mail),
  PATCH (rol wijzigen, geen beheerder degraderen), POST `/inlogmail` (opnieuw inlogmail).
- UI: `GebruikerRij` met rol-dropdown, knoppen Inlogmail en Verwijderen (met bevestiging).

Verificatie: 375 tests groen (was 359), build slaagt.

## Bekende open punten (bewust later)

- Ed/opdrachtgever toegang tot gebruikersbeheer (nu alleen beheerder).
- Monteur met klussen: nu blokkeren bij verwijderen, geen automatisch herverdelen.
- `/api/mensen` (uitnodigen) en `/api/gebruikers` staan naast elkaar; folder-rename los eindje.
- Monteur-mail en spoedmail nog hardcoded "Keukenstudio Voorschoten"; multi-tenant-opruiming later.
- Blok 6c (RLS) staat nog open.
