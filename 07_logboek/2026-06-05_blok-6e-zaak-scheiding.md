# Blok 6e: zaak-scheiding (opdrachtgever_id) + verzonden-account

Datum: 2026-06-05
Project: KSV demo-app (Kluslus)
Lost op: bevinding 1 (ad-hoc klussen lekken in het KSV-dashboard) en bevinding 3 (verzonden-plek op
account i.p.v. naam) uit de code-review.

## Wat gebouwd is

- Opdrachten krijgen een **zaak** (`opdrachtgever_id`): kantoor-inschiet (dashboard) hangt de zaak
  eraan (opdrachtgever = eigen zaak, beheerder = de enige zaak als terugval, keuze-veld pas bij 2+
  zaken); werkpool-zelf-inschiet blijft ad-hoc (geen zaak).
- Dashboard en planbord (`getOpdrachtenVoorDashboard`) tonen alleen opdrachten **met** een zaak;
  ad-hoc/KKS-klussen staan alleen in de oplever-werkpool.
- RLS aangescherpt: een opdrachtgever ziet alleen zijn eigen zaak. Nieuwe SECURITY DEFINER-helpers
  `mijn_opdrachtgever`, `opdracht_van_mijn_zaak`, `mag_melding`, `mag_opdracht`; meldingen/documenten/
  opleveringen-policies herzien via die helpers (schoner dan de inline van 6c).
- Bevinding 3: `verzonden_toegewezen_aan` onthouden; `opVerzondenPlek` vergelijkt op account
  (naamgenoten geven nu geen valse "ongewijzigd" meer). Doorgevoerd in versturen, mail-monteur,
  verplaatsen en PlanbordBord.

## Migraties die Reinier moet draaien (bewust, in volgorde)

1. `supabase/schema-compleet-6e-zaak.sql` (kolommen + helpers + herziene RLS).
2. `supabase/schema-compleet-6e-CLEANUP-testdata.sql` (wist test-opdrachten; accounts/zaken blijven).

Noodknop blijft `schema-compleet-6c-RLS-UIT.sql`.

## Verificatie

- 381 tests groen (was 376). Build slaagt.
- Live-verificatie door Reinier na het draaien van de migraties: beheerder ziet alles; een
  opdrachtgever (later Ed) alleen zijn zaak; een KKS-zelf-inschiet verschijnt in de werkpool maar
  niet op het dashboard.

## Open punten (bewust later)

- Keuze-veld "welke zaak" in de inschiet-UI (pas bij 2+ zaken).
- Zaak van een opdracht achteraf wijzigen; filialen als sub-niveau.
- Bevinding 4 (ruime INSERT-policy) en 5 (monteurloze verstuur-markering).
