-- Schoonmaak vóór het echte testen: wist alle test-opdrachten en wat eraan hangt.
-- Accounts (profielen) en zaken (opdrachtgevers) blijven staan.
-- Draai dit BEWUST, eenmalig. Hierna begin je met een lege opdrachten-lijst.
--
-- LET OP: dit verwijdert ALLE rijen uit meldingen/documenten/opleveringen. Alleen doen zolang er
-- nog geen echte klantdata in zit (nu het geval: alles is test).

delete from public.opleveringen;
delete from public.documenten;
delete from public.meldingen;
