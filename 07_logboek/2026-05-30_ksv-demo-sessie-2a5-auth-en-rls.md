# KSV Demo - Sessie 2A.5 (Authenticatie + RLS)

Datum: 2026-05-30 (na 2A.7 en 2A.8 dezelfde dag)
Project: `01_projecten/keukenstudio-voorschoten-demo`
Live: <https://ksv-demo.vercel.app>

## Aanleiding

Tot deze sessie was de KSV-demo publiek toegankelijk: iedereen met de URL kon opdrachten
zien en aanmaken. Voor een echte demo aan een keukenstudio en voor de volgende stap (Ed
als tweede monteur) moest dat dicht. Doel: alleen ingelogde monteurs hebben toegang, elke
rij is gekoppeld aan een user, en Postgres dwingt via RLS af dat je alleen je eigen
data ziet.

## Gebouwd

### F0 - Google Cloud + Supabase Auth (handmatig)
- Nieuw Google Cloud project `ksv-app`, OAuth consent screen op "External" met scopes
  `email + profile + openid` (non-sensitive, geen Google-audit nodig).
- OAuth 2.0 client ID met redirect URI naar Supabase callback.
- Supabase Auth providers: Email + Google aangezet. URL Configuration met Site URL =
  vercel-url + Redirect URLs voor zowel productie als localhost.
- `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` aan `.env.local`
  en Vercel toegevoegd.

### F1 - Schema (`supabase/schema-2a5-auth-step1.sql` + `step2.sql`)
- Step1: `user_id` kolom op `documenten` (op `meldingen` bestond hij al), RLS-policies
  `auth.uid() = user_id or auth.uid() = toegewezen_aan` voor meldingen, en de documenten-
  policy met subselect op meldingen. RLS nog uit zodat bestaande rijen niet stuk gaan.
- Step2 (na data-cleanup): `user_id` op NOT NULL, FK naar `auth.users` met `on delete
  restrict`, en `enable row level security` op beide tabellen.

### F2 - Frontend auth-laag
- `/login` met twee knoppen: Google OAuth (industrieel-D-stijl met de echte Google-G) en
  magic link via email-veld.
- `/auth/callback` route ondersteunt drie scenarios: PKCE-code (OAuth + same-device
  magic link), `token_hash + type` (cross-device-safe magic link via `verifyOtp`),
  en doorgestuurde Supabase-errors. Echte fout-tekst wordt nu via `?fout=` op
  `/login` getoond, geen generieke "inlog-mislukt" meer.
- `src/middleware.ts` + `supabase-middleware.ts`: alle routes vereisen sessie behalve
  `/login`, `/auth/`, `/mockups`.
- `UserMenu` in werkbak-header: initiaal-tegel rechtsboven, dropdown met email +
  rood-omlijnd "Uitloggen".

### F3 - Backend user_id propageren
- `src/lib/auth.ts`: `getAuthenticatedUserId()` voor API-routes.
- `db.ts` interfaces (`DocumentInput`, `MonteurMeldingInput`) vereisen `user_id`. Alle
  POST-routes lezen de user en geven 401 zonder sessie, anders propageren ze user_id
  naar de insert.
- Grote refactor van `db.ts`: `db()` is nu `Promise<Db>` en gebruikt de Supabase-server-
  client (per-request, cookie-based, RLS-respecterend). `dbAdmin()` blijft sync en
  service-role voor migrate-scripts. Alle 14 API-routes en 5 server-components zijn
  geflipt naar `(await db()).X()` of `const dbi = await db(); dbi.X();`.

### Magic link fix
Default Supabase-template gebruikte `{{ .ConfirmationURL }}` (PKCE via `/auth/v1/verify`)
wat cross-device sneuvelt op de code-verifier-cookie. Email-template aangepast naar
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` zodat onze
callback `verifyOtp` doet -- werkt op elk device zonder cookie-afhankelijkheid.

### F4 - RLS aan + isolatie bewezen
- Data-cleanup: `delete from meldingen + documenten` + de twee storage-buckets leeg
  gemaakt (`opleverrapporten` bleek niet te bestaan, rapport-PDFs zitten samen met
  originele documenten in `opdracht-documenten`).
- Step2.sql gedraaid in Supabase Studio: NOT NULL + FK + RLS aan.
- `scripts/test-rls.ts` schrijft geautomatiseerd via service-role twee rijen (één voor
  Rein, één voor een test-user `bkmkeukenmontage+rls-test@gmail.com`), opent voor
  beide users een echte JWT-sessie via `admin.auth.admin.generateLink` + `verifyOtp`,
  en valideert drie checks:

  | Check | Resultaat |
  |---|---|
  | Rein-JWT select ziet alleen Reins rij | JA |
  | Ed-JWT select ziet alleen Eds rij | JA |
  | Cross-read op andermans rij-id geeft null | JA |

  **RLS isoleert volledig.** Test-rijen worden na afloop opgeruimd. Test-user blijft
  staan zodat het script morgen direct opnieuw draaibaar is.

## Bijwerkingen onderweg
- PID-strijd op localhost:3001 (oude dev-server hield poort vast) + autostart-taak
  `GoogleWorkspaceMCP` uitgezet, omdat een andere terminal-sessie die heimelijk had
  aangezet en Rein volledige controle wou over background-processes.
- Tests-aantal van 91 -> 161 door auth-mocks en user_id-asserties in bestaande route-
  tests. Alles groen, TypeScript schoon (op een paar bestaande env.test.ts-warnings
  na die niet aan deze sessie raken).

## Stand
- Sessie 2A.5 volledig afgerond. Productie heeft auth + RLS, Vercel-deploy groen.
- Commits: `978fbbb` (F2), `e62bd00` (F3 inserts), `0425d1d` (magic link), `d0d8652`
  (F3.2 + step2.sql), plus de RLS-test als losse commit.
- `scripts/test-rls.ts` is hergebruikbaar: `node --env-file=.env.local
  --experimental-strip-types scripts/test-rls.ts`.

## Open punten (voor later)
- Storage-policies: buckets zijn nu publiek (URL-geheim, niet RLS-beschermd). Voor demo
  acceptabel, voor productie willen we waarschijnlijk geauthenticeerd lezen.
- Rapport-PDFs delen `opdracht-documenten` met originele documenten -- prima voor nu,
  splitsen naar eigen `opleverrapporten`-bucket kan later als nodig.
- Toegewezen-aan-UI (Rein wijst een opdracht aan Ed toe) komt later, RLS ondersteunt
  het al.
- Account-management binnen de app: Supabase Studio is voldoende zolang het team klein
  is.

## Na 2A.5
Sessie 2B (Gmail-koppeling aan Ed) -- start vandaag of morgen, afhankelijk van tijd.
