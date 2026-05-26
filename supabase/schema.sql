-- KSV Demo - meldingen tabel
-- Eén tabel voor zowel PDF-klussen als monteur-meldingen (bron-veld onderscheidt)
-- Geen RLS-policies in sessie 1 (demo, geen productie-veiligheid)
-- TODO sessie 4 of later: RLS aanzetten als demo richting echte versie 1 gaat

create table if not exists public.meldingen (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz       not null default now(),

  -- altijd gevuld
  bron                text              not null check (bron in ('pdf', 'monteur')),

  -- alleen voor monteur
  urgentie            text              check (urgentie in ('rood', 'geel')),

  -- meestal gevuld (uit PDF of monteur-input)
  klant_naam          text,
  klant_adres         text,
  referentienummer    text,
  adviseur            text,

  -- altijd gevuld voor PDF (array van meldingen per artikel)
  -- structuur: [{ keller_code: string, omschrijving: string, melding_tekst: string }]
  meldingen           jsonb             not null default '[]'::jsonb,

  -- sessie 2+: monteur-input velden
  foto_url            text,
  spraak_tekst        text,
  ruwe_tekst          text
);

-- Snelste query voor Eds lijst-weergave: nieuwste eerst
create index if not exists meldingen_created_at_idx
  on public.meldingen (created_at desc);

-- Filter op bron komt vaak voor (Ed wil monteur-meldingen apart kunnen zien)
create index if not exists meldingen_bron_idx
  on public.meldingen (bron);
