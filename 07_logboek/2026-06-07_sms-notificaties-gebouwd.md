# SMS-notificaties voor monteurs gebouwd

Datum: 2026-06-07

## Wat

Elke mail-melding naar een monteur gaat nu ook als SMS. De monteur kan SMS in "Mijn gegevens"
deels of helemaal uitzetten via twee schakelaars (werk-kritiek en herinneringen/overig). Plus een
nieuwe bevestig-herinnering via een cron-job. Ontwerp in `DESIGN-SMS-NOTIFICATIES.md`, plan in
`PLAN-SMS-NOTIFICATIES.md`.

## Keuzes (in de brainstorm gemaakt)

- Provider: CM.com (NL, EU, pad naar WhatsApp later). WhatsApp en push nu niet, wel voorbereid in de laag.
- Twee categorieen, beide standaard aan, beide uit te zetten. Werk-kritiek = nieuwe/gewijzigde klus,
  annulering, ontplanning. Overig = nieuw-document en bevestig-herinnering.
- Bundelen, gelijk aan de mail (een SMS per monteur per verstuurronde).
- Echt versturen met een CM.com trial-key; dry-run en allowlist als vangnet tegen per ongeluk sturen.

## Architectuur

Dunne notificatie-laag, maakt architectuurregel 5 waar (kanaal als instelling):
- `sms.ts` (CM.com-zender, instelbare gateway voor trial vs productie, dry-run, allowlist).
- `sms-teksten.ts` (pure tekstbouwers, plat en onder 160 tekens).
- `notificaties.ts` (dispatcher: mail altijd, SMS als nummer + voorkeur kloppen; best-effort).
- `telefoon.ts` (normaliseert naar +31).
- Routes (versturen, annuleren, ontplannen, documenten) praten nu met de dispatcher, niet met mail.
- Cron-endpoint `/api/cron/bevestig-herinneringen` + `vercel.json`, idempotent via `herinnering_verzonden_at`.

Datamodel: `profielen.sms_werk_kritiek`, `profielen.sms_overig`, `meldingen.verzonden_at`,
`meldingen.herinnering_verzonden_at`. Migratie `schema-compleet-12-sms-notificaties.sql`, gedraaid op
de test-DB. Productie nog handmatig in de Supabase SQL-editor (bewuste stap).

## Testen

477 unit (was 454), 3 nieuwe integratie (herinnering-selectie + idempotentie), 1 nieuwe e2e
(SMS-schakelaars: uit zonder nummer, instelbaar met nummer, keuze blijft bewaard). Alles groen.

## Valkuil: e2e lijkt vast te lopen maar is het niet

Bij `npx playwright test <spec>` bleef de output 15 minuten leeg en poort 3001 open, wat op een
vastloper leek. In werkelijkheid waren de tests al na ~7 seconden klaar (groen); Playwright buffert de
output tot het eind en houdt de webServer daarna nog open (reuse). De "leegte" is dus geen hang.
Les: kijk niet alleen naar de live-output, een afgeronde run toont pas aan het eind. Server opruimen
kan met `Stop-Process -Id <PID> -Force` (poort 3001), zoals bij de bekende pre-push-valkuil.

## Open / acties voor Reinier

- CM.com: nummer whitelisten (SMS de trial-key naar +3197005159375), dan `SMS_DRY_RUN=0` in `.env.local`
  om echt te versturen. Trial: 10 SMS, 24 uur geldig, afzender is het CM-trial-account.
- Voor productie later: echte CM-productietoken, `CM_GW_URL` op de productie-gateway, `CRON_SECRET`
  zetten, en de migratie handmatig op de productie-DB draaien.
- Open ontwerp-punt: nieuw-document en herinnering gaan nu als SMS met een lege mail-thunk. Mail erbij
  is een kleine uitbreiding (thunk invullen) als dat gewenst is.
- Nog niet gepusht. Pushen draait de pre-push-hook (volledige suite + server op poort 3001).
