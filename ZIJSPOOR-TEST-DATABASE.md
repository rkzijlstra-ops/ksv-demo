# Zijspoor: apart test-Supabase-project

Doel: zodra Ed live gaat, testen we niet meer tegen de echte database (Ed's data), maar tegen een
**apart test-project** met dezelfde structuur en nep-data. Zo raakt testen nooit de echte klantdata
en ziet Ed nooit testklussen op zijn dashboard.

De testopstelling is hier al op voorbereid: alle tests lezen `e2e/test-env.ts`, dat **`.env.test`
voorrang geeft** boven `.env.local`. Bestaat `.env.test` niet, dan verandert er niets (huidige
omgeving). Maak je `.env.test` aan, dan schakelt alles automatisch om naar het zijspoor.

## Eenmalig opzetten (als Ed in zicht komt)

1. **Tweede Supabase-project aanmaken** (gratis kan), los van het productie-project.

2. **Structuur erin zetten.** Plak het kant-en-klare bestand **`supabase/test-schema.sql`** in één
   keer in de SQL-editor van het verse test-project en draai het. Dat is alle migraties in de juiste
   volgorde aan elkaar, dus dezelfde structuur + RLS als productie (de zaak "Keukenstudio Voorschoten"
   wordt meteen aangemaakt). NIET op productie draaien.
   (Het is gegenereerd uit de losse `supabase/schema*.sql`-migraties; de `*-RLS-UIT`- en `*-CLEANUP-*`-
   bestanden horen er bewust niet in.)

3. **Test-accounts aanmaken** in het test-project (Authentication → Users): een test-beheerder en een
   test-monteur. Noteer hun uids. Maak ze beheerder/monteur via de profielen-sjabloon onderaan
   `schema-compleet-6a-accounts.sql`. De zaak "Keukenstudio Voorschoten" wordt door 6a automatisch
   aangemaakt.

4. **Test-deploy** (voor de browser/mail-e2e): een aparte Vercel-deploy van dezelfde repo, met de env
   van het test-project. Noteer de URL.

5. **`.env.test` invullen** (zie `.env.test.example`): de Supabase-gegevens van het test-project, de
   test-account-uids, en `E2E_APP_URL` = de test-deploy.

## Daarna

- `npm run test:all` en `npm run test:mail` draaien dan automatisch tegen het zijspoor.
- De unit-tests (`npm test`) raken sowieso nooit een database.
- Productie blijft onaangeroerd; `.env.test` weghalen schakelt weer terug naar de huidige omgeving.

De keuze van test-data is verzonnen-maar-representatief; nooit een kopie van echte klantgegevens (PII).
