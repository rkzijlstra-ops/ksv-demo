# Demo-omgeving opzetten — stap voor stap (voor Reinier)

Doel: een aparte demo-versie van Kluslus, los van productie. Jij maakt twee dingen aan (een demo-database
bij Supabase en een demo-deploy bij Vercel) en vult de instellingen in. De rest (schema, vuldata, code)
doet Claude Code. Volg dit met de andere Claude erbij; je kunt screenshots delen.

Belangrijk: dit raakt je productie NIET. Je maakt nieuwe, losse projecten aan. Niets aan je live-app of
je echte database verandert.

---

## Deel A — Supabase: een demo-database aanmaken

1. Ga naar https://supabase.com en log in.
2. Klik op "New project".
3. Kies je organisatie. Naam: `kluslus-demo`. Database-wachtwoord: laat er een genereren en bewaar het
   (kopieer naar een kladblok). Region: Frankfurt (EU). Klik "Create new project". Wachten, ~2 minuten.
4. Zodra het klaar is, verzamel je VIER waarden. Klik linksonder op "Project Settings".
   a. Onder "API": de "Project URL" (begint met https://...supabase.co). Kopieer.
   b. Onder "API": bij "Project API keys" de "anon public" sleutel. Kopieer.
   c. Onder "API": de "service_role" sleutel (klik "Reveal"). Dit is een GEHEIME sleutel. Kopieer.
   d. Onder "Database" -> "Connection string": kies het tabblad **"Session pooler"** (NIET "Direct
      connection" / URI). De directe verbinding is IPv6-only en werkt van buitenaf vaak niet; de Session
      pooler geeft een IPv4-adres dat het wél doet voor migraties. Vervang `[YOUR-PASSWORD]` door het
      wachtwoord van stap 3. Kopieer. (Herken je het: de host bevat `pooler.supabase.com`.)
5. Deze vier waarden heb je zo nodig (Deel B en de terugkoppeling aan Claude Code). Bewaar ze even.

Let op: de geheime sleutels (c en d) hoef je NIET in de chat te plakken. Je kopieert ze straks
rechtstreeks van Supabase naar Vercel. Alleen de database-connectiestring (d) geef je aan Claude Code
(in je hoofdsessie), zodat die het schema en de vuldata kan klaarzetten.

---

## Deel B — Vercel: een demo-deploy aanmaken

1. Ga naar https://vercel.com en log in.
2. Klik "Add New..." -> "Project".
3. Importeer dezelfde repository als je live-app (ksv-demo). Klik "Import".
4. Geef het project een naam, bijv. `kluslus-demo`. NOG NIET op Deploy klikken; eerst de instellingen.
5. Open "Environment Variables" en voeg deze toe (kopieer de meeste van je LIVE-project; je vindt die
   in je live Vercel-project onder Settings -> Environment Variables):

   Wissel deze drie naar je NIEUWE demo-Supabase (uit Deel A):
   - `NEXT_PUBLIC_SUPABASE_URL` = de demo Project URL (4a)
   - `SUPABASE_URL` = dezelfde demo Project URL (4a)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = de demo anon-sleutel (4b)
   - `SUPABASE_PUBLISHABLE_KEY` = dezelfde demo anon-sleutel (4b)
   - `SUPABASE_SECRET_KEY` = de demo service_role-sleutel (4c)

   Nieuw, speciaal voor de demo:
   - `DEMO_MODE` = `1`
   - `SMS_ALLOWLIST` = jouw eigen 06-nummer in internationaal formaat, bijv. `+31612345678` (eventueel
     met een komma een tweede nummer van een collega)
   - `MAIL_ALLOWLIST` = jouw eigen e-mailadres (eventueel met een komma een tweede)
   - `SMS_DRY_RUN` = `0`

   Hergebruik (exact dezelfde waarden als je live-project):
   - `CM_PRODUCT_TOKEN`, `CM_GW_URL`, `SMS_AFZENDER`
   - `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RAPPORT_EMAIL`
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_API_KEY`
   - `CRON_SECRET`

   (`APP_URL` vul je straks in met de demo-URL die Vercel je geeft; mag eerst leeg.)

6. Klik "Deploy". Wachten tot hij klaar is. Je krijgt een adres als `kluslus-demo-xxxx.vercel.app`.
7. Zet dat adres als `APP_URL` bij de Environment Variables, en als de demo-accounts er straks zijn
   redeploy je één keer.
8. Controleer dat dit project op de branch `master` deployt (Settings -> Git -> Production Branch =
   master). Zo draait de demo altijd de nieuwste versie.

---

## Deel C — Terugkoppeling aan Claude Code (de bouwer)

Geef in je hoofdsessie aan Claude Code door:
- De database-connectiestring uit stap 4d (zodat Claude het schema, de migraties en de vuldata klaarzet).
- Je 06-nummer en e-mailadres die je in de allowlist zette (zodat de testdata daarop kan wijzen).

Claude Code zet dan het schema + de vuldata op de demo-database, en zodra dat klaar is en jij hebt
gedeployd, staat de demo klaar: een gevulde, veilige speeltuin met je eigen nummer in de allowlist.

Vragen of een stap loopt anders? Deel een screenshot met de Claude die je hierbij helpt.

---

## Wat NIET in deze demo zit (voorlopig)

- **Inbound mail-naar-app.** Resend stuurt álle inkomende mail van het hele account naar elke webhook en
  routeert op het to-veld, niet per domein. Inbound op de demo werkend krijgen vraagt een tweede
  Resend-webhook naar de demo-endpoint plus een filter in de handler, zodat demo en productie elkaars
  mail niet verwerken (onbekende tokens negeren). Dat is fase 2; het is niet nodig om de kern te tonen
  (invoeren, plannen, annuleren, aanpassen, opleveren, twee kanten, statussen). Geen extra env-vars of
  webhook instellen voor de demo nu. Als we het later doen, lever ik de exacte webhook-URL en env-vars.
- **Eigen domein** (demo.kluslus.nl): het gratis vercel.app-adres volstaat voor nu.
