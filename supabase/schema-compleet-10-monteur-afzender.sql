-- KSV Demo (Kluslus) - Compleet systeem blok 10: afzender-gegevens van de monteur voor het rapport.
--
-- Het opleverrapport moet de gegevens tonen van wie opleverde, niet hardcoded BKM. De monteur vult zijn
-- eigen bedrijfsnaam/telefoon/contact-mail in via de app; het rapport pakt die van de opleverende
-- monteur. Idempotent. Draai op test-DB en productie.

alter table public.profielen add column if not exists bedrijfsnaam text;
alter table public.profielen add column if not exists telefoon text;
alter table public.profielen add column if not exists contact_email text;

-- Een gebruiker mag ALLEEN zijn eigen afzender-velden bijwerken, nooit zijn rol (anders kan een monteur
-- zich tot beheerder promoveren). Daarom via een SECURITY DEFINER functie die alleen deze 3 velden van
-- de eigen rij raakt, in plaats van een brede update-policy op de profielen-tabel.
create or replace function public.update_eigen_gegevens(
  p_bedrijfsnaam text,
  p_telefoon text,
  p_contact_email text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profielen
  set bedrijfsnaam = nullif(btrim(p_bedrijfsnaam), ''),
      telefoon = nullif(btrim(p_telefoon), ''),
      contact_email = nullif(btrim(p_contact_email), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_eigen_gegevens(text, text, text) to authenticated;
