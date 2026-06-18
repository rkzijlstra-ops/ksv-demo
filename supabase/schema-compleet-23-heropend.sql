-- KSV Demo (Kluslus) - Compleet systeem blok 23: heropenen van een opgeleverde klus.
--
-- Een al opgeleverde klus (rapport naar de zaak verstuurd) kan toch terug moeten: de klant belt, er is
-- nog iets. Kantoor "heropent" hem dan -> de klus gaat terug naar "te plannen" (opdracht_status weer
-- 'open', dashboard_status 'binnen', oplever-tijdstip/rapport-kopie op de melding gewist; de oplevering
-- zelf + de verzendgeschiedenis blijven als historie bewaard). Dit veld markeert dat het een terugkomer
-- is, zodat de UI een "Heropend"-badge kan tonen (plan-kleur, niet groen). Wordt weer gewist zodra de
-- klus opnieuw wordt opgeleverd. Idempotent. Draai op test-DB en productie.

alter table public.meldingen add column if not exists heropend_at timestamptz;

-- PostgREST z'n schema-cache laten herladen, zodat de REST-laag de nieuwe kolom meteen kent.
notify pgrst, 'reload schema';
