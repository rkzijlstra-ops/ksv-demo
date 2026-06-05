# Design blok 6e: zaak-scheiding (opdrachtgever_id op opdrachten)

Datum: 2026-06-05
Lost op: bevinding 1 uit de code-review (ad-hoc klussen lekken in het KSV-dashboard) + bevinding 3
(verzonden-plek op account i.p.v. naam, lift mee op dezelfde schema-wijziging).
Bevestigd door Reinier: model klopt; bestaande testdata mag allemaal weg.

## Kernidee

Een opdracht krijgt een **zaak** (`opdrachtgever_id`): welke kantoor-partij hem op zijn dashboard
mag zien. Leeg = ad-hoc (geen kantoor erachter, bv. KKS die Reinier zelf doet).

- **Kantoor-inschiet (dashboard):** opdracht hangt aan de zaak van de inschieter.
  - Inschieter is opdrachtgever (Ed): zijn eigen zaak (uit zijn profiel).
  - Inschieter is beheerder (Reinier): de gekozen zaak; met één zaak automatisch die, een keuze-veld
    verschijnt pas bij 2+ zaken (model nu al meerdere-zaken-klaar, UI-keuze later).
- **Werkpool-zelf-inschiet (oplever-app):** `opdrachtgever_id` leeg = ad-hoc.

De keukenzaak-naam blijft los op de opdracht (uit de PDF), dus het KKS-rapport klopt gewoon.
`opdrachtgever_id` gaat puur over "wie mag dit op zijn dashboard zien".

## Wie ziet wat

- **Beheerder:** alles.
- **Opdrachtgever (Ed):** alleen opdrachten met `opdrachtgever_id` = zijn zaak.
- **Dashboard en planbord (kantoor-overzicht):** alleen opdrachten MET een zaak; ad-hoc (leeg)
  verschijnt hier nooit.
- **Werkpool (oplever-app):** je eigen toegewezen klussen, ongeacht zaak. Ad-hoc klussen leven hier.
- **Monteur:** zijn toegewezen klussen, ongeacht zaak (hij werkt voor wie dan ook).

## Datamodel

- `meldingen.opdrachtgever_id uuid references opdrachtgevers(id)` (nullable; null = ad-hoc).
- `meldingen.verzonden_toegewezen_aan uuid` (bevinding 3): het monteur-account op het moment van
  versturen, zodat "terug op de verzonden plek" op account vergelijkt, niet op naam.

## Afscherming (RLS, aanscherping van 6c)

- Helper `mijn_opdrachtgever()` (SECURITY DEFINER): de zaak van de ingelogde gebruiker.
- `meldingen` lezen/wijzigen voor een **opdrachtgever** wordt: `opdrachtgever_id = mijn_opdrachtgever()`
  (i.p.v. "alles"). Beheerder en monteur ongewijzigd. Veilig nu te doen: er is nog geen
  opdrachtgever-account live.

## Filtering in de queries

- Dashboard- en planbord-query: `opdrachtgever_id is not null` (ad-hoc eruit; RLS versmalt de
  opdrachtgever daarbinnen tot zijn eigen zaak).
- Werkpool-query: ongewijzigd.

## Tegenhangers (volledigheids-check)

- Zaak zetten bij inschieten: ja (dashboard-route).
- Zaak achteraf corrigeren: een opdracht naar een andere zaak verplaatsen. NU NIET (open punt),
  het model staat het toe; zelden nodig in de demo.
- Filteren/tonen per zaak: ja (dashboard/planbord + RLS).
- Lege staat: opdrachtgever zonder opdrachten ziet een leeg dashboard (bestaande lege-staat-tekst).
- Rechten: opdrachtgever alleen eigen zaak (RLS).

## Schoonmaak

Eenmalige cleanup-SQL wist de bestaande test-opdrachten (meldingen + documenten + opleveringen).
Accounts (profielen) en zaken (opdrachtgevers) blijven staan. Schone lei voor het echte testen.

## Bewust later

- Keuze-veld "welke zaak" in de dashboard-inschiet-UI (pas bij 2+ zaken).
- Filialen: een filiaal is een onderdeel van een zaak, geen aparte inlog. Apart ontwerp later.
- Zaak van een opdracht achteraf wijzigen.
