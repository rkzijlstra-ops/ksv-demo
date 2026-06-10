# Envelop-knop op de kaart stuurde geen SMS (alleen mail) — echte oorzaak

Datum: 2026-06-10

## Correctie op de eerdere diagnose

Eerder die dag een race tussen inplannen-opslag en versturen vermoed en gefixt
(`2026-06-10_sms-bij-versturen-race-fix.md`). Dat was **niet** de oorzaak van het gemiste-SMS-probleem.
Die fix is op zichzelf geen kwaad (maakt de bulk-knop iets robuuster), maar de echte oorzaak lag elders.
Les: in de "schone test" die toen wél smste gebruikte Rein de bulk-knop; de mislukkingen liepen via het
envelopje. Ik had moeten vragen welke knop precies.

## Echte oorzaak

Er zijn twee verstuur-paden op het planbord:
- **Envelop-knop op de kaart** (`MailMonteurKnop` → `POST /api/opdrachten/[id]/mail-monteur`): riep alleen
  `verstuurMonteurMail` aan + status op 'gepland'. **Geen SMS.**
- **Bulk-knop "Verstuur naar monteurs"** (`POST /api/dashboard/versturen`): roept `notificeerNieuweOpdrachten`
  aan = mail **én** SMS.

Toen SMS werd toegevoegd, is alleen de bulk-poort (en annuleren/ontplannen) op de dispatcher gezet; de
per-kaart envelop-route is achtergebleven met alleen mail. Vandaar: envelopje → mail wel, SMS niet;
bulk-knop → beide; annuleren → SMS (eigen route met dispatcher).

## Fix

`src/app/api/opdrachten/[id]/mail-monteur/route.ts` gebruikt nu dezelfde dispatcher
`notificeerNieuweOpdrachten` als de bulk-poort: mail + SMS, status eerst, notificatie best-effort, met
klus-historie in de mail. Zo doen de twee paden gegarandeerd hetzelfde en kunnen ze niet meer uiteenlopen.

`route.test.ts` herschreven: mockt nu de dispatcher i.p.v. de losse mail; dekt notificatie-aanroep,
400 (geen monteur), 404, en best-effort (200 met fout in de body). De vervallen email-fallback/500-gevallen
zitten nu in de dispatcher zelf en zijn daar gedekt.

## Verificatie

- `npx vitest run`: 509 groen. tsc 0, lint 0.
- Live bevestiging na deploy: envelopje op de kaart moet nu naast de mail ook de SMS geven.

## Open

- Naar Vercel (push → deploy) en live hertesten via het envelopje.
- De `MailMonteurKnop` toont "Verstuurd" (groen) zodra de status gezet is, ook als de SMS/mail best-effort
  faalt. Net als bij de bulk-knop. Eventueel later de notificatie-fout in de UI tonen.
