-- KSV Demo (Kluslus) - Compleet systeem blok 9: terugmelden aan kantoor.
--
-- Een monteur mag een door kantoor ingeschoten klus niet wissen, maar wel TERUGMELDEN als hij niet
-- doorgaat (klant niet thuis, werk niet af te ronden). De klus verdwijnt dan uit zijn actieve werkpool
-- (komt in zijn history met de reden), blijft bestaan en verschijnt bij kantoor met een markering.
-- Velden voor die terugmelding. Idempotent. Draai op test-DB en productie.

alter table public.meldingen add column if not exists teruggemeld_at timestamptz;
alter table public.meldingen add column if not exists teruggemeld_reden text;
alter table public.meldingen add column if not exists teruggemeld_toelichting text;
