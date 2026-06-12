-- KSV Demo (Kluslus) - Compleet systeem blok 17: privacy-waarschuwing klant-verzending.
--
-- Per monteur een voorkeur of hij bij "Stuur naar klant" gewaarschuwd wil worden dat de klant ALLE
-- foto's en meldingen ziet (niet alleen zijn losse opmerking). Standaard aan. Loopt via de bestaande
-- SECURITY DEFINER functie, zodat de monteur het zelf zet zonder zijn rol te kunnen raken.
--
-- Deploy-veilig: we DROPPEN de oude 6-arg functie niet, maar voegen een 7-arg overload toe. Zo blijft
-- de nu-live app (die 6 args stuurt) werken tot de nieuwe deploy live is. Idempotent. Test-DB + prod.

alter table public.profielen
  add column if not exists waarschuw_klant_zicht boolean not null default true;

create or replace function public.update_eigen_gegevens(
  p_naam text,
  p_bedrijfsnaam text,
  p_telefoon text,
  p_contact_email text,
  p_sms_werk_kritiek boolean,
  p_sms_overig boolean,
  p_waarschuw_klant_zicht boolean
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
      sms_overig = coalesce(p_sms_overig, sms_overig),
      waarschuw_klant_zicht = coalesce(p_waarschuw_klant_zicht, waarschuw_klant_zicht)
  where id = auth.uid();
end;
$$;

grant execute on function public.update_eigen_gegevens(text, text, text, text, boolean, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
