# Checklist v2 - verbeteringen uit de testronde live krijgen

Branch `feat/oplevering-v2` (alle tests groen, `next build` slaagt).

## 1. Supabase: migratie v2 draaien
- SQL-editor leegmaken, inhoud van `supabase/schema-oplevering-v2.sql` plakken, Run.
- Voegt toe: kolom `opmerking` op `opleveringen`, kolom `verwijderd_at` op `meldingen` (prullenbak).
- "Success. No rows returned" is goed.

## 2. Supabase Pro (voor grote video's)
- Upgrade het project naar Pro in het Supabase-dashboard (billing). Dit is jouw keuze/actie.
- Daarna mag video groter dan 50 MB. Wil je de bucket-limiet expliciet zetten:
  `update storage.buckets set file_size_limit = 524288000 where id = 'oplever-videos';` (500 MB).
- Tot de upgrade blijft de 50 MB-grens gelden (korte clips).

## 3. Deployen
- Branch `feat/oplevering-v2` naar je hoofdbranch mergen en pushen; Vercel deployt automatisch.

## 4. Testen op de telefoon
- [ ] Video-upload toont nu een echte voortgangsbalk (procenten).
- [ ] PDF/opdracht inlezen toont "Informatie inlezen…" i.p.v. "Bezig".
- [ ] Opleveren: geen eindstaat-keuze meer; na versturen een "Opgeleverd!"-animatie.
- [ ] Opmerkingenveld werkt, ook via inspreken; komt in rapport en mail.
- [ ] Verwijderen: opdracht verdwijnt uit de werkpool maar staat in de Prullenbak (menu),
      herstellen en definitief wissen werken.
- [ ] Menu: "Over de app"-pagina, "Prullenbak", en de versie staan erin.
- [ ] WhatsApp-knop naast bellen opent WhatsApp met het klantnummer.

## Later / apart project
- WhatsApp tweeweg (ontvangen in de app): WhatsApp Business Platform, betaald, apart project.
- Eventueel automatisch oude video's opruimen als de opslag vol loopt.
