-- KSV Demo - Sessie 2A.5 step 2: RLS activeren
-- Loopt NA step1 + data-cleanup (delete from meldingen + documenten) of na een
-- backfill van user_id op bestaande rijen. Idempotent.
--
-- Vereisten voor deze migratie:
--   - alle bestaande meldingen/documenten zijn weg, of hebben user_id gevuld
--   - F3.2 (anon-key in API-routes) is uitgerold zodat onze API onder RLS werkt
--
-- Wat deze migratie doet:
--   1. user_id wordt NOT NULL op meldingen + documenten
--   2. Foreign keys naar auth.users (on delete restrict zodat verwijderen van een user
--      pas kan als zijn rijen weg zijn)
--   3. RLS aan op beide tabellen (de policies zelf staan al sinds step1)

-- 1. NOT NULL constraints
alter table public.meldingen
  alter column user_id set not null;

alter table public.documenten
  alter column user_id set not null;

-- 2. FK naar auth.users (idempotent via drop-if-exists)
alter table public.meldingen drop constraint if exists meldingen_user_id_fkey;
alter table public.meldingen
  add constraint meldingen_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

alter table public.documenten drop constraint if exists documenten_user_id_fkey;
alter table public.documenten
  add constraint documenten_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

-- 3. RLS aan (policies bestaan sinds step1)
alter table public.meldingen enable row level security;
alter table public.documenten enable row level security;
