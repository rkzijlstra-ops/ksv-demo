# Zijspoor: apart test-Supabase-project

Doel: zodra Ed live gaat, testen we niet meer tegen de echte database (Ed's data), maar tegen een
**apart test-project** met dezelfde structuur en nep-data. Zo raakt testen nooit de echte klantdata
en ziet Ed nooit testklussen op zijn dashboard.

De testopstelling is hier al op voorbereid: alle tests lezen `e2e/test-env.ts`, dat **`.env.test`
voorrang geeft** boven `.env.local`. Bestaat `.env.test` niet, dan verandert er niets (huidige
omgeving). Maak je `.env.test` aan, dan schakelt alles automatisch om naar het zijspoor.

## Eenmalig opzetten (als Ed in zicht komt)

1. **Tweede Supabase-project aanmaken** (gratis kan), los van het productie-project.

2. **Structuur erin zetten.** Draai de migraties in `supabase/` in volgorde in de SQL-editor van het
   test-project (de `*-RLS-UIT`- en `*-CLEANUP-*`-bestanden zijn GEEN migraties, die overslaan):
   schema.sql → schema-2a.sql → schema-2a-datums.sql → schema-2a-versie.sql →
   schema-2a-opdracht-koppeling.sql → schema-2a5-auth-step1.sql → schema-2a5-auth-step2.sql →
   schema-2a6-documenten.sql → schema-2a7-spoed.sql → schema-oplevering.sql → schema-oplevering-v2.sql →
   schema-oplevering-v3.sql → schema-compleet-0.sql → schema-compleet-3-monteur.sql →
   schema-compleet-4-verzonden.sql → schema-compleet-6a-accounts.sql → schema-compleet-6c-rls.sql →
   schema-compleet-6e-zaak.sql.
   (Vraag Claude om er één samengevoegd `test-schema.sql` van te maken als je niet 18 keer wilt plakken.)

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
