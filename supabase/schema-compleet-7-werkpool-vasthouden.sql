-- KSV Demo (Kluslus) - Compleet systeem blok 7: werkpool vasthouden bij wijziging na versturen.
--
-- Gat 5 uit TOESTANDEN.md (monteur-wissel): verplaatst kantoor een al aan een monteur VERSTUURDE klus
-- naar een andere monteur op het planbord, dan mag de oorspronkelijke monteur de klus blijven zien
-- tot kantoor de wijziging opnieuw verstuurt (afspraak vasthouden). Daarvoor moet RLS hem de rij ook
-- tonen als hij de VERZONDEN monteur is van een nog-niet-opnieuw-verstuurde wijziging.
--
-- Bouwt voort op blok 6e (mag_melding/mag_opdracht met zaak-afscherming): we BEHOUDEN die functies en
-- voegen alleen de verzonden-monteur-clause toe. Additief en idempotent (alleen meer toelaten, geen
-- lockout). Draai op test-DB EN productie, en verifieer daarna met de e2e werkpool-zichtbaarheid (gat 5).

-- 1. Hulpfunctie ook true voor de verzonden monteur van een hangende wijziging. Raakt de kind-data
--    (meldingen, documenten, oplevering) die via mag_melding/mag_opdracht deze functie gebruiken.
create or replace function public.opdracht_toegewezen_aan_mij(de_opdracht_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.meldingen
    where id = de_opdracht_id
      and (
        toegewezen_aan = auth.uid()
        or (gewijzigd_te_versturen = true and verzonden_toegewezen_aan = auth.uid())
      )
  );
$$;

-- 2. meldingen_select: behoud de 6e-policy (mag_melding = zaak-afscherming + toewijzing) en voeg de
--    verzonden-monteur-clause toe voor de top-level opdracht-rij (opdracht_id is null, dus niet door
--    opdracht_toegewezen_aan_mij gedekt). Idempotent: drop + create.
drop policy if exists meldingen_select on public.meldingen;
create policy meldingen_select on public.meldingen
  for select
  using (
    public.mag_melding(opdrachtgever_id, opdracht_id, toegewezen_aan)
    or (gewijzigd_te_versturen = true and verzonden_toegewezen_aan = auth.uid())
  );
