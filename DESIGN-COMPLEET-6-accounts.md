# Design blok 6: accounts, rollen en afscherming

Datum: 2026-06-04
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (architectuurregel 6, Fundament)
Keuzes (Reinier, 2026-06-04): alleen KSV nu; monteur ziet alleen eigen toegewezen klussen;
monteurs worden echte accounts.

## Rollen (drie)

- **Beheerder** (Reinier): ziet en beheert alles. Maakt accounts aan.
- **Opdrachtgever** (Ed): ziet het dashboard en planbord van zijn zaak (alle opdrachten van KSV).
- **Monteur**: ziet alleen de opdrachten die aan hem zijn toegewezen (werkpool, opdracht-detail,
  opleveren). Geen dashboard/planbord.

## Wie ziet wat (afscherming)

- Beheerder: alles.
- Opdrachtgever: alle opdrachten van zijn zaak (nu alleen KSV).
- Monteur: alleen opdrachten met `toegewezen_aan = zijn account`.

## Datamodel

- Tabel `opdrachtgevers` (zaken): `id`, `naam`. Voor nu één rij: Keukenstudio Voorschoten.
- Tabel `profielen` (1-op-1 met auth-gebruiker): `id` (= auth uid), `rol`
  (beheerder|opdrachtgever|monteur), `naam`, `opdrachtgever_id` (welke zaak; bij beheerder leeg).
- `meldingen.opdrachtgever_id`: bij welke zaak hoort de opdracht. Inschieten zet dit
  (nu standaard KSV). Maakt afscherming per zaak later mogelijk zonder herbouw.
- `toegewezen_aan` (bestaande uuid-kolom) wordt weer echt gebruikt: bij inplannen kies je een
  monteur-account; we zetten `toegewezen_aan` = zijn uuid én `monteur_naam` = zijn naam (voor de
  weergave). Zo werkt de bestaande RLS-koppeling én de mail naar de juiste monteur.

## Afscherming (RLS)

RLS aan op `meldingen` en `documenten`. Een opdracht is zichtbaar als:
- je profiel rol = beheerder, OF
- rol = opdrachtgever én `opdrachtgever_id` = jouw zaak, OF
- `toegewezen_aan` = jouw uid (monteur).
Schrijven (plannen, versturen, opleveren) volgt dezelfde regels per rol.

## Planbord en mail

- De monteur-keuze op het planbord wordt een **lijst van je monteur-accounts** (dropdown), geen
  vrije tekst meer. Waarde = account, weergave = naam.
- Mail naar de monteur gaat naar **zijn eigen e-mailadres** (uit zijn account), niet meer naar
  RAPPORT_EMAIL. Reinier levert de monteur-namen en e-mailadressen aan.

## Routing per rol

Na inloggen kom je op je eigen startpagina: opdrachtgever -> `/dashboard`, monteur -> `/` (werkpool),
beheerder -> keuze of dashboard. Een rol kan niet bij schermen van een andere rol.

## Account-aanmaak: uitnodig-scherm (beheerder)

Reinier meldt mensen aan via een scherm "Mensen" in de app (alleen beheerder):
- Per persoon: naam, e-mailadres, rol (monteur of opdrachtgever).
- Klik "Uitnodigen": het systeem maakt het account aan (Supabase admin), zet het profiel
  (rol + zaak), en stuurt via Resend een korte mail: "Je bent toegevoegd, log in op <app>/login
  met dit e-mailadres." Bewust via Resend (zit al in het project), zodat we niet afhankelijk zijn
  van Supabase-mailconfig.
- Bestaat het e-mailadres al, dan alleen het profiel (rol) zetten/bijwerken.

## Inloggen (geen wachtwoord)

- Inloggen gaat met een magic link (e-mail) of met Google; nooit een wachtwoord (bestaat al).
- Eerste keer: via de uitnodiging of door op /login het e-mailadres in te vullen.
- Daarna: de app onthoudt de sessie (weken), dus normaal gewoon de app openen. Moet hij toch
  opnieuw inloggen, dan e-mail-link of Google. Een verlopen link los je op door op /login een
  nieuwe aan te vragen (het account bestaat dan al).

## Wat Reinier moet doen

- SQL-migraties draaien (tabellen, RLS).
- Accounts aanmaken voor Ed en de monteurs; rollen/zaak invullen.
- Monteur-namen + e-mailadressen aanleveren.
- Testen: inloggen als Ed en als monteur, controleren dat ieder alleen ziet wat mag.

## Bouwen in sub-blokken

- **6a**: tabellen `opdrachtgevers` + `profielen`, rol-helpers, en het uitnodig-scherm "Mensen"
  (account aanmaken + profiel + Resend-uitnodiging). Nog geen RLS, nog geen routing-gates: de app
  blijft werken zoals nu, dit voegt alleen toe. Veilig te testen.
- **6b**: routing/gates per rol (login -> juiste startpagina; monteur niet bij dashboard/planbord),
  monteur-dropdown op het planbord (kies uit monteur-accounts, zet `toegewezen_aan` + `monteur_naam`),
  en mail naar het echte monteur-adres.
- **6c**: RLS aanzetten met de rol-regels (de echte afscherming), als laatste en zorgvuldig.

## Bewust later (fase 2)

Meerdere zaken tegelijk, branding per zaak, zelf-aanmelden/uitnodigingen, facturatie van het
abonnement. De structuur (opdrachtgever_id, profielen) laat dit later toe zonder herbouw.
