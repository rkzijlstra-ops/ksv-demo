-- Vermoeden "meerdere opdrachten in één mail". Bij inbound-mail bepaalt de app of een mail mogelijk
-- meer dan één afzonderlijke opdracht bevat (twee keukens zonder onderscheidende referentienummers,
-- of meerdere opdrachten beschreven in de mailtekst). De app voegt die nu stilzwijgend samen tot één
-- klus; een monteur die dat niet doorheeft gaat de fout in. In plaats van stil samenvoegen of stil
-- splitsen toont de app één voorstel met een waarschuwing en een knop "Splits in aparte klussen". De
-- door de AI voorgestelde splitsing wordt vast bewaard, zodat die knop in één tik de losse klussen
-- oplevert. Idempotent. Vlag-patroon analoog aan adres_keuze_nodig (schema-compleet-20).

-- Vlag: deze klus/voorstel kwam uit een mail die mogelijk meerdere opdrachten bevat. Waarschuwt
-- alleen (blokkeert niets). Wordt false zodra de monteur "Bevestig als één" kiest of de mail splitst.
alter table public.meldingen
  add column if not exists controleer_splitsing boolean not null default false;

-- Korte, voor-mensen-leesbare reden waarom de app meerdere opdrachten vermoedt (uit de AI-inschatting),
-- voor in de waarschuwingsband. Mag null.
alter table public.meldingen
  add column if not exists controleer_splitsing_reden text;

-- De door de AI voorgestelde splitsing: een lijst van delen, elk met de kop-velden van die klus en de
-- id's van de documenten die erbij horen. Vorm: [{ velden: {...}, document_ids: [...] }, ...]. Null als
-- er geen splitsing is voorgesteld. Wordt gebruikt door POST /api/inbound/[id]/splitsen en daarna
-- leeggemaakt.
alter table public.meldingen
  add column if not exists splits_voorstel jsonb;

-- Snel de klussen vinden die nog een splitsings-controle nodig hebben.
create index if not exists meldingen_controleer_splitsing_idx
  on public.meldingen (controleer_splitsing)
  where controleer_splitsing = true;
