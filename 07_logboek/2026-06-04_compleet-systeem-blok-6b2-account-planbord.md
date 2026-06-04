# Compleet systeem blok 6b-2: account-planbord + mail naar echt monteur-adres

Datum: 2026-06-04
Project: KSV demo-app

## Wat gebouwd is

Het planbord werkt nu met echte monteur-accounts in plaats van een vrij ingetypte naam.

- De **rijen van het planbord** zijn de monteur-accounts (uit `getMonteurs`). Inplannen kiest een
  monteur uit een **dropdown**; slepen naar een cel wijst die monteur toe.
- Bij plannen/verplaatsen wordt nu zowel `toegewezen_aan` (het account-uuid, voor afscherming en
  mail) als `monteur_naam` (weergave) gezet.
- **Mail naar de monteur** gaat naar zijn eigen e-mailadres (opgezocht via `getGebruikerEmail` op
  het account), met RAPPORT_EMAIL als terugval. Gebundeld per monteur.

Bouwstenen: `db.getMonteurs`, `PlanningInput.toegewezen_aan`, `MonteurOptie`-type,
`supabase-admin.getGebruikerEmail`, aangepaste PlanbordGrid/PlanbordBord/PlanbordPool en de
endpoints plannen/verplaatsen/mail-monteur/versturen.

## Belangrijk gevolg

Het planbord heeft nu **minstens één monteur-account** nodig. Zonder accounts toont het "Voeg
eerst monteurs toe via Mensen". Opdrachten die eerder met een vrij ingetypte naam waren gepland
(zonder account-koppeling) verschijnen niet meer op het bord; die plan je opnieuw zodra er een
monteur-account is.

## Verificatie

- `npm test`: 353 groen (was 345, +8).
- `npm run build`: slaagt. Geen SQL nodig (gebruikt toegewezen_aan + profielen uit 6a).

## Te doen door Reinier om te testen

1. Voeg via `/mensen` één testmonteur toe (account wordt aangemaakt; mail komt pas als Resend
   in Vercel staat, maar dat is niet nodig om te plannen).
2. Plan op het planbord een opdracht op die monteur (dropdown of slepen).
3. Eventueel: log als die monteur in (magic link) om te zien dat hij zijn werk ziet.
   (Afscherming staat nog uit tot 6c, dus hij ziet voorlopig alles.)

## Vervolg

6c: RLS aanzetten met de rol-regels (de echte afscherming). Als laatste, zorgvuldig.
