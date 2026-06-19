-- KSV Demo (Kluslus) - Compleet systeem blok 24: demo-notificatielog.
--
-- In de DEMO-omgeving leggen de SMS/mail-functies elk (bedoeld) bericht hier vast, zodat een paneel kan
-- tonen wat het systeem deed ("Monteur kreeg een SMS: nieuwe klus"), ook als de echte SMS door de
-- allowlist is overgeslagen. Zo is de notificatie-magie zichtbaar zonder dat er een telefoon hoeft te
-- trillen. In PRODUCTIE blijft deze tabel leeg (er wordt alleen in demo-modus naar geschreven), maar hij
-- bestaat in beide databases zodat de schema's gelijk blijven (geen drift). Idempotent.

create table if not exists public.demo_berichten (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  kanaal       text not null check (kanaal in ('sms', 'mail')),
  naar         text not null,
  samenvatting text,
  verstuurd    boolean not null default false,
  reden        text
);

create index if not exists demo_berichten_created_idx on public.demo_berichten (created_at desc);

alter table public.demo_berichten enable row level security;

-- Lezen: elke ingelogde gebruiker (het is nepdata in de demo). Schrijven gebeurt via de service-role
-- (de logger), die RLS omzeilt; daarom geen insert-policy.
drop policy if exists demo_berichten_select on public.demo_berichten;
create policy demo_berichten_select on public.demo_berichten
  for select using (auth.uid() is not null);

notify pgrst, 'reload schema';
