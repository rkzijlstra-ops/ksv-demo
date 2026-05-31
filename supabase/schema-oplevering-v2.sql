-- KSV Demo - Oplevering v2: notitieveld op de oplevering + soft-delete (prullenbak).
-- Idempotent. Draaien na schema-oplevering.sql.

-- Notitie/bijzonderheden op de oplevering (geen melding, vrije tekst).
alter table public.opleveringen
  add column if not exists opmerking text;

-- Soft-delete: opdrachten markeren als verwijderd i.p.v. echt wissen (prullenbak + herstel).
alter table public.meldingen
  add column if not exists verwijderd_at timestamptz;

create index if not exists meldingen_verwijderd_at_idx
  on public.meldingen (verwijderd_at);
