-- KSV Demo (Kluslus) - Compleet systeem blok 11: gebruiker mag zijn eigen naam corrigeren.
--
-- Ed nodigt uit met een naam, maar de monteur mag die daarna zelf aanvullen/corrigeren (bijv. "Piet"
-- -> "Piet de Vries") zodat hij goed op het rapport staat. We breiden de bestaande SECURITY DEFINER
-- functie uit met de naam. De naam wordt nooit leeggemaakt (coalesce houdt de oude waarde aan).
-- Idempotent. Draai op test-DB en productie.

drop function if exists public.update_eigen_gegevens(text, text, text);

create or replace function public.update_eigen_gegevens(
  p_naam text,
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
  set naam = coalesce(nullif(btrim(p_naam), ''), naam),
      bedrijfsnaam = nullif(btrim(p_bedrijfsnaam), ''),
      telefoon = nullif(btrim(p_telefoon), ''),
      contact_email = nullif(btrim(p_contact_email), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_eigen_gegevens(text, text, text, text) to authenticated;
