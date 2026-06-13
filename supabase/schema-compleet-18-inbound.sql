-- Inbound: mail-naar-app (stap 2). Elke monteur krijgt een eigen ontvangstadres via een token in zijn
-- profiel. Binnengekomen mail landt als "te verwerken"-klus die NOG NIET in de werkpool staat, tot de
-- monteur het voorstel bevestigt. Idempotent.

-- 1. Per-monteur ontvangsttoken (klus-<token>@<inbound-domein>). Uniek als het gezet is.
alter table public.meldingen
  add column if not exists te_verwerken boolean not null default false;

alter table public.profielen
  add column if not exists inbound_token text;

create unique index if not exists profielen_inbound_token_idx
  on public.profielen (inbound_token)
  where inbound_token is not null;

-- 2. Snel de inbox/werkpool filteren op de vlag.
create index if not exists meldingen_te_verwerken_idx
  on public.meldingen (te_verwerken)
  where te_verwerken = true;
