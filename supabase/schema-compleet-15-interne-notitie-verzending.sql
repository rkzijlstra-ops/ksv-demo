-- Interne notitie + ontkoppelde verzending (klant-versie los van zaak-versie).
-- Zie DESIGN-INTERNE-NOTITIE-EN-VERSTUREN.md.
--
-- Achtergrond:
-- * De oplevering krijgt naast de openbare `opmerking` (die in het rapport komt) een interne
--   notitie die alleen in de ZAAK-versie van het rapport terechtkomt, nooit in de klant-versie.
-- * Het rapport wordt voortaan apart naar de klant (schone versie) en naar de zaak (volledige
--   versie) gestuurd, los in tijd. Per kant onthouden we adres, url en wanneer het verstuurd is.
-- * `rapport_email` en `rapport_url` blijven de ZAAK-versie (bestaand gedrag).
-- * De opdracht gaat pas op `opgeleverd` zodra de ZAAK-versie verstuurd is (zie app-laag), zodat
--   het kantoor het oplevermoment niet eerder ziet dan de monteur het deelt.

-- ====== opleveringen: interne notitie + klant-/zaak-verzending ======
alter table public.opleveringen
  add column if not exists interne_opmerking        text,
  add column if not exists klant_rapport_email      text,
  add column if not exists klant_rapport_url        text,
  add column if not exists klant_rapport_verzonden_at timestamptz,
  add column if not exists zaak_rapport_verzonden_at  timestamptz;

-- ====== meldingen: klant-mailadres uit de PDF (voorinvulwaarde voor de klant-verzending) ======
alter table public.meldingen
  add column if not exists klant_email text;
