-- KSV Demo (Kluslus) - Compleet systeem blok 12: SMS-notificatie-voorkeuren + herinnering-velden.
--
-- Twee SMS-voorkeuren per monteur (werk-kritiek, overig), beide standaard aan. Plus twee timestamps op
-- de opdracht: verzonden_at (wanneer naar de monteur verstuurd) en herinnering_verzonden_at (idempotentie
-- van de bevestig-herinnering). De SECURITY DEFINER functie krijgt de twee booleans erbij, zodat de
-- monteur ze via mijn-gegevens kan zetten zonder zijn rol te kunnen raken. Idempotent. Draai op test-DB
-- en productie.

alter table public.profielen add column if not exists sms_werk_kritiek boolean not null default true;
alter table public.profielen add column if not exists sms_overig boolean not null default true;

alter table public.meldingen add column if not exists verzonden_at timestamptz;
alter table public.meldingen add column if not exists herinnering_verzonden_at timestamptz;

drop function if exists public.update_eigen_gegevens(text, text, text, text);

create or replace function public.update_eigen_gegevens(
  p_naam text,
  p_bedrijfsnaam text,
  p_telefoon text,
  p_contact_email text,
  p_sms_werk_kritiek boolean,
  p_sms_overig boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profielen
  set naam = coalesce(nullif(btrim(p_naam), ''), naam),
      bedrijfsnaam = nullif(btrim(p_bedrijfsnaam), ''),
      telefoon = nullif(btrim(p_telefoon), ''),
      contact_email = nullif(btrim(p_contact_email), ''),
      sms_werk_kritiek = coalesce(p_sms_werk_kritiek, sms_werk_kritiek),
      sms_overig = coalesce(p_sms_overig, sms_overig)
  where id = auth.uid();
end;
$$;

grant execute on function public.update_eigen_gegevens(text, text, text, text, boolean, boolean) to authenticated;
