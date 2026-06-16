-- Inbound-idempotentie: voorkom dubbele klussen als Resend dezelfde mail opnieuw aflevert. De
-- webhook parseert de PDF synchroon (10-30s) en geeft pas daarna 200 terug; Resend wacht niet zo
-- lang en levert opnieuw af. Zonder dedup wordt dezelfde mail dan tweemaal verwerkt. We onthouden
-- per verwerkte mail het email_id en slaan een herhaling over. Idempotent.

create table if not exists public.inbound_verwerkt (
  email_id text primary key,
  verwerkt_at timestamptz not null default now()
);

-- Alleen de service-role (inbound-webhook) raakt deze tabel; RLS aan zonder policy weert de rest.
alter table public.inbound_verwerkt enable row level security;
