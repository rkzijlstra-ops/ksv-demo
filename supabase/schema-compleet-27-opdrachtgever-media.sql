-- schema-compleet-27-opdrachtgever-media.sql
-- Het "voor de opdrachtgever"-blok in de oplever-flow (voorheen de tekst-only interne notitie)
-- krijgt volledige functionaliteit: naast tekst (interne_opmerking, bestaat al) ook foto's en video.
-- Deze media gaan ALLEEN in de zaak-versie van het rapport, nooit in de klant-versie.
alter table public.opleveringen
  add column if not exists interne_foto_urls text[] not null default '{}',
  add column if not exists interne_video_url text;
