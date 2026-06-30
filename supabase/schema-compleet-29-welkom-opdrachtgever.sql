-- KSV Demo (Kluslus) - blok 29: welkomstap voor de opdrachtgever (eenmalig gegevens bevestigen).
--
-- Een uitgenodigde opdrachtgever krijgt bij de eerste login een welkomscherm met zijn door beheer
-- ingevulde naam (+ optioneel telefoon), dat hij EEN keer kan corrigeren. Daarna nooit meer.
-- Net als bij de monteur-onboarding: de gate gebruikt een vlag, hier welkom_bevestigd.
--
-- Idempotent. Additief (alleen een kolom + functie), raakt geen policies. Draai op test-DB en productie.

-- 1. Vlag: heeft de opdrachtgever zijn welkomscherm al bevestigd? Default false = nog tonen.
alter table public.profielen add column if not exists welkom_bevestigd boolean not null default false;

-- 2. SECURITY DEFINER: de gebruiker zet zijn EIGEN naam + telefoon en bevestigt het welkom. Kan bewust
--    NIET de rol of de zaak raken (die blijven bij beheer). Werkt alleen op de eigen rij (auth.uid()).
create or replace function public.bevestig_welkom(p_naam text, p_telefoon text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profielen
  set naam = coalesce(nullif(trim(p_naam), ''), naam),
      telefoon = nullif(trim(p_telefoon), ''),
      welkom_bevestigd = true
  where id = auth.uid();
$$;

grant execute on function public.bevestig_welkom(text, text) to authenticated;
