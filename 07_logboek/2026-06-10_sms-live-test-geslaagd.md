# SMS live-test geslaagd met CM.com productie-token

Datum: 2026-06-10

## Wat

De CM.com productie-token was binnen. Ingeregeld en de eerste echte SMS verstuurd én ontvangen.

- `.env.local` (gitignored, token blijft buiten git): `CM_PRODUCT_TOKEN` = productie-token,
  `CM_GW_URL=https://gw.cmtelecom.com/v1.0/message`, `SMS_DRY_RUN=0`, `SMS_ALLOWLIST=+31631665814`
  als vangnet zodat er tijdens het inregelen niets naar klanten kan.
- `scripts/test-sms.ts` (nieuw): eenmalige rooktest die één SMS naar een meegegeven nummer stuurt via
  `verstuurSms`. Commando `npm run test:sms -- +31612345678` toegevoegd aan package.json.
- Test gedraaid naar +31631665814: gateway gaf geen fout en de SMS kwam echt aan op de telefoon,
  afzender "KSV".

## Let op

- De gateway-URL is `gw.cmtelecom.com`, niet het eerder verwachte `gw.cm.com`.
- "Gateway gaf geen fout" = geaccepteerd, niet automatisch afgeleverd. De aflevering is hier visueel
  bevestigd op het toestel.
- De `MODULE_TYPELESS_PACKAGE_JSON`-waarschuwing bij het script is cosmetisch (geen `"type": "module"`
  in package.json); bewust niet aangeraakt om de Next.js-build niet te beïnvloeden.

## Openstaand: Vercel

De live app op Vercel smst nog niet; die heeft een eigen omgeving. In Vercel (Environment Variables)
moeten `CM_PRODUCT_TOKEN`, `CM_GW_URL`, `SMS_AFZENDER=KSV`, `SMS_DRY_RUN=0` gezet worden. `SMS_ALLOWLIST`
daar leeg laten zodra echte monteur-nummers SMS mogen ontvangen (een gevulde allowlist blokkeert de rest).
Daarna redeployen. Token nooit in git.
