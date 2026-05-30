# PLAN Sessie 2A.5 - Authenticatie (Google OAuth + Magic Link) + RLS

Doel: alleen ingelogde monteurs hebben toegang, elke rij is gekoppeld aan een user, RLS forceert
"alleen je eigen rijen tenzij toegewezen". Rein als eerste user + plek voor een collega-account.

## Volgorde
Schema -> Supabase Auth-config -> Google Cloud OAuth -> code (login + middleware + user_id) ->
RLS activeren -> live test op Vercel.

---

## F0 - Voorbereiding (handmatig door Rein, geen code)

### F0.1 Nieuw Google Cloud project voor de app
- Console.cloud.google.com -> nieuw project "ksv-app" (los van mainframe-bkm).
- APIs & Services -> OAuth consent screen -> User Type **External**, App name
  "Keukenstudio Voorschoten", scopes: alleen `email` + `profile` + `openid` (non-sensitive,
  dus geen Google-audit nodig).
- Publish app -> direct "In production" beschikbaar (non-sensitive scopes = geen verificatie).
- Credentials -> OAuth 2.0 Client ID -> Web application
  - Authorized redirect URI: `https://qbynjfscdxhwdkzfqjjg.supabase.co/auth/v1/callback`
- Client ID + Client Secret bewaren -> straks in Supabase Auth.

Status: open. Tijd: 20 min.

### F0.2 Supabase Auth providers aanzetten
- Studio -> Authentication -> Providers
- **Email**: Enable, Confirm email = uit (Magic Link is genoeg). Optioneel later: SMTP via
  Resend koppelen, voor nu Supabase's default werkt.
- **Google**: Enable, plak Client ID + Secret uit F0.1.
- Authentication -> URL Configuration:
  - Site URL: `https://ksv-demo.vercel.app`
  - Redirect URLs: `https://ksv-demo.vercel.app/auth/callback`, `http://localhost:3001/auth/callback`

Status: open. Tijd: 10 min.

---

## F1 - Schema-migratie

### F1.1 user_id-kolommen + bestaande data
Bestand: `supabase/schema-2a5-auth.sql`
- `alter table public.meldingen add column if not exists user_id_v2 uuid` (we hebben al
  `user_id` als TOEKOMSTVAST-veld, vullen die nu echt).
- `alter table public.documenten add column if not exists user_id uuid`.
- `update meldingen set user_id = '<rein-user-uuid>' where user_id is null` (Reins
  Supabase Auth-uuid die hij na eerste login uit Studio kan plakken).
- `update documenten set user_id = '<rein-user-uuid>' where user_id is null`.
- Daarna constraints: `alter table ... alter column user_id set not null`.
- Foreign key naar `auth.users(id)` met `on delete restrict`.
- Indexen: `create index meldingen_user_id_idx on meldingen(user_id);` idem documenten.

Status: open. Tijd: 25 min.

### F1.2 RLS-policies (nog niet activeren)
Bestand: `supabase/schema-2a5-rls.sql`
- `meldingen`: alleen `auth.uid() = user_id` mag select/insert/update/delete. Voor monteur die
  ook toegewezen krijgt: `auth.uid() = toegewezen_aan` toevoegen aan select.
- `documenten`: alleen `auth.uid() = user_id` mag select/insert/delete (geen update nodig).
- `storage.objects` in buckets `meldingen-fotos` en `opdracht-documenten`: alleen geauthenticeerd
  user mag insert/select; pad-prefix-policy desgewenst later.

Status: open. Tijd: 30 min.

---

## F2 - Frontend - auth-laag

### F2.1 Supabase client client-side variant
Bestand: `src/lib/supabase-client.ts`
- Browser-client met `createBrowserClient` van `@supabase/ssr` (we hebben nu alleen server).
- Hook `useUser()` voor componenten.

Status: open. Tijd: 15 min.

### F2.2 Middleware voor route-beveiliging
Bestand: `src/middleware.ts` + `src/lib/supabase-middleware.ts`
- Bij elke request: check sessie. Zonder sessie + niet op /login of /auth/callback -> redirect /login.
- Cookie-flow met `@supabase/ssr` zodat server-rendered pages (werkbak, opdracht-detail) de user kennen.

Status: open. Tijd: 25 min.

### F2.3 Login-pagina
Bestand: `src/app/login/page.tsx` + `src/app/auth/callback/route.ts`
- Twee knoppen: "Login met Google" en "Stuur magic link". Email-veld bij magic-link.
- Bij Magic Link: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
- Bij Google: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
- Callback-route ruilt code in voor sessie en redirect naar `/`.

Status: open. Tijd: 35 min.

### F2.4 Logout-knop + user-info in werkbak-kop
Bestand: `src/app/page.tsx` + `src/components/UserMenu.tsx`
- In de KSV/WERKBAK-balk een klein avatar + email rechtsboven, klik = uitklap met "Uitloggen".

Status: open. Tijd: 15 min.

---

## F3 - Backend - user_id propageren

### F3.1 db.ts inputs vullen vanuit sessie
Bestand: `src/lib/db.ts` + alle API-routes
- `OpdrachtInput`, `MonteurMeldingInput`, `DocumentInput` krijgen `user_id` als verplicht veld.
- API-routes lezen de user uit `getUser()` van de server-client en zetten user_id automatisch.
- 401 als geen user (middleware vangt al maar API-routes belt-and-suspenders).

Status: AFGEROND.

### F3.2 Service-role-key alleen voor specifieke admin-acties
- Standaard de **anon-key** (per-request, via session-cookies) gebruiken in API-routes zodat
  RLS van toepassing is.
- Service-role (nu `dbAdmin()`) alleen voor migrate-scripts.
- Storage (rapport-PDF) blijft service-role; storage-policies komen later als nodig.

Status: AFGEROND.

---

## F4 - RLS activeren + test

### F4.1 RLS aan
- Bestand: `supabase/schema-2a5-auth-step2.sql` draaien in Supabase Studio na data-cleanup.
- Doet NOT NULL + FK + `enable row level security` op meldingen + documenten.

Status: open. Tijd: 5 min.

### F4.2 Live test lokaal + Vercel
- Lokaal: log in via Magic Link (mail in console). Check werkbak. Maak melding. Log uit, log in
  als testuser, check dat je Reins meldingen NIET ziet.
- Push naar Vercel, idem op de live URL op je telefoon over 5G.

Status: open. Tijd: 20 min.

### F4.3 Tweede user voor je collega
- Studio -> Authentication -> Users -> Invite user (email).
- Hij krijgt magic link, logt in, krijgt eigen account.
- Optioneel: testen dat je opdracht aan hem kunt toewijzen via `toegewezen_aan` (UI komt later).

Status: open. Tijd: 10 min.

---

## Total schatting
~3.5 uur bouwsessie. Inclusief Google Cloud + Supabase studio handmatige stappen aan Reins kant.

## Wat we **niet** doen in 2A.5
- Wachtwoord-login (overslaan, magic link is genoeg)
- Apple OAuth (vereist €99/jaar developer-account)
- SMS-OTP (kosten + extra provider-account)
- Eigen activiteiten-log ("wie deed wat wanneer") - Supabase Auth-dashboard heeft sign-in events,
  voor opdracht-acties is een activiteiten-tabel een aparte sessie (2A.5.1 of later) als nodig
- Account-management UI binnen de app (Supabase Studio is genoeg voor 2-5 monteurs)

## Na 2A.5
Pas dan naar **2B (Gmail-koppeling aan Ed)** zoals oorspronkelijk geplant. Spraak/foto-polish
uit 2A.8 is al doorgevoerd.
