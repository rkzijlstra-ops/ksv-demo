# Plan: Gebruikersbeheer compleet (blok 6, vervolg)

Datum: 2026-06-05
Hoort bij blok 6 (accounts/rollen). Toegepast: de volledigheids-check (levenscyclus).

## Wat we nu bouwen (de ontbrekende tegenhangers)

1. **Verwijderen** van een account, met beveiligingen + afmeld-mail.
2. **Rol wijzigen** (monteur <-> opdrachtgever).
3. **Opnieuw inlogmail** sturen (gebruiker is de link kwijt).
4. **Afmeld-mail** naar de gebruiker bij verwijderen ("je bent afgemeld").

## Beveiligingen (guards)

- Je kunt jezelf niet verwijderen.
- De laatste beheerder is beschermd (niet verwijderen, niet degraderen).
- Een beheerder degraderen via rol-wijzigen wordt geweigerd (consistent met de uitnodig-route).
- Een monteur met nog toegewezen klussen: verwijderen geblokkeerd met duidelijke melding.
- Alle acties: alleen beheerder.

## Taken (TDD, commit per stap)

### DB-laag
- T1. `db.telBeheerders()` - aantal beheerders (voor laatste-beheerder-guard). Test eerst.
- T2. `db.telToegewezenOpdrachten(monteurId)` - aantal niet-afgeronde klussen van een monteur. Test eerst.
- T3. `db.updateProfielRol(id, rol)` - rol bijwerken. Test eerst.
  (Account verwijderen = `supabaseAdmin.auth.admin.deleteUser` in de route; het profiel verdwijnt mee via de bestaande cascade.)

### Mail-laag
- T4. `afmeld-mail.ts` met pure `afmeldingTekst(naam, organisatie)`. Test eerst.
- T5. `mail.ts` -> `verstuurAfmelding(input)` (zelfde from/reply-to als de rest). Test eerst.

### API-laag (nieuwe map /api/gebruikers/[id], raakt de bestaande /api/mensen niet aan)
- T6. `DELETE /api/gebruikers/[id]` - beheerder-check, guards, deleteUser, afmeld-mail.
- T7. `PATCH /api/gebruikers/[id]` - rol wijzigen, guards.
- T8. `POST /api/gebruikers/[id]/inlogmail` - opnieuw de uitnodigings/inlogmail sturen.

### UI-laag
- T9. Client-component `GebruikerRij`: rol-dropdown (wijzig), knoppen Inlogmail + Verwijderen (met bevestiging), roept de routes aan + `router.refresh()`.
- T10. Gebruikers-pagina: statische lijst vervangen door `GebruikerRij`; ingelogde-beheerder-id meegeven (voor jezelf-niet-verwijderen).

### Afronding
- T11. Hele suite groen + build. Commit per stap met specifieke git add. Logboek-entry.

## Bekende open punten (bewust nu NIET)

- Ed/opdrachtgever toegang tot gebruikersbeheer (nu alleen beheerder).
- Monteur met klussen: nu blokkeren bij verwijderen, geen automatisch herverdelen van die klussen.
- Bestaand los eindje: `/api/mensen` vs `/api/gebruikers` staan straks naast elkaar (folder-rename apart).
- Andere mailteksten (monteur-mail, spoed) nog hardcoded "Keukenstudio Voorschoten"; multi-tenant-opruiming later.
