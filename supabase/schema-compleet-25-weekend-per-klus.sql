-- Weekend-keuze per klus i.p.v. een globale planbord-knop. Vastgelegd op het moment van plannen/duur-
-- wijzigen (= de weekend-knop-stand toen): telt het weekend voor déze klus als werkdag mee (vr+za) of
-- niet (vr+ma)? Zo verschuift het omzetten van de globale knop nooit meer een al-geplande/verstuurde
-- klus. De knop bepaalt voortaan alleen of de lege za/zo-kolommen zichtbaar zijn.
-- Standaard false: bestaande klussen blijven het weekend overslaan (ongewijzigd gedrag). Idempotent.

alter table public.meldingen
  add column if not exists weekend_telt_mee boolean not null default false;
