-- KSV Demo - Sessie 2A.7: melding-flow herontwerp (spoed i.p.v. rood/geel-urgentie)
-- Een melding wordt standaard klaargezet voor oplevering. 'spoed' = uitzondering, los verstuurd.
-- 'urgentie' (rood/geel) blijft als kolom bestaan voor oude rijen maar wordt niet meer gebruikt.
-- Idempotent.

alter table public.meldingen
  add column if not exists spoed              boolean not null default false,
  add column if not exists spoed_verzonden_at timestamptz;

-- Snel filteren op opdrachten/meldingen met spoed (werkbak-markering)
create index if not exists meldingen_spoed_idx
  on public.meldingen (spoed) where spoed = true;

-- Grants dekken nieuwe kolommen via bestaande tabel-grant; belt-and-suspenders:
grant select, insert, update, delete on public.meldingen
  to anon, authenticated, service_role;
