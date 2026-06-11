# Controle-checklist bij oplevering + rapport-opmaak verbeterd

Datum: 2026-06-11

## Controle-checklist (nieuwe feature)

Op verzoek van Rein: de klant tekent bij de oplevering, samen met de monteur, een korte controle af, net
boven de handtekening, en dat komt in het rapport. Het gaat om aanwezigheid/aantoonbaarheid, niet om
juridische hardheid ("tonen is vaak afdoende bij conflict").

Brainstorm-uitkomst: één samenvattend punt i.p.v. meerdere, met **Akkoord / Niet akkoord**-knoppen.
Tekst (vast): "Buiten de evt. meldingen geen beschadigingen aan: keuken, keukenblad, vloer, plafond en
muren." Voor uitzonderingen het bestaande opmerking-veld (typen of inspreken), nu vlak bij de controle.

- **`src/lib/oplever-controle.ts`** (nieuw): `CONTROLE_PUNTEN` (één bron voor scherm én rapport) + type
  `ControlePunt { punt, akkoord }`.
- **Datamodel**: migratie `schema-compleet-14-oplever-controle.sql` voegt `opleveringen.controle jsonb`
  toe (`[{punt, akkoord}]`, default `[]`). De punt-tekst wordt meeopgeslagen, zodat het rapport later
  precies toont wat er die dag is afgevinkt. `db.ts`: `Oplevering.controle`, `OpleveringConceptInput.controle`,
  upsert schrijft het mee (alleen als meegegeven, net als de handtekening).
- **Route** `oplevering`: leest/valideert `controle` (alleen `{punt:string, akkoord:boolean}`), ongemoeid
  als niet in de body.
- **Opleverscherm** (`OpleverFlow.tsx`): nieuw blok "2. Controle bij oplevering" met de twee knoppen +
  het opmerking/inspreek-veld; handtekening werd stap 3. Slaat mee in de bestaande concept-opslag.
- **Rapport** (`rapport.ts`): sectie "Controle bij oplevering" met groen "Akkoord" / rood "Niet akkoord"
  + de tekst, net boven de handtekening. De **handtekening staat nu helemaal onderaan** (na de bijlagen),
  zoals gevraagd.

## Rapport-opmaak (visueel verbeterd)

Op Reins punten, gecheckt door de PDF echt te genereren en te bekijken:
- Header ruimer/strakker (naam links, titel + datum rechts uitgelijnd, dunnere accentlijn).
- De foto's zijn nu **zelf klikbaar** (hele tegel opent op groot formaat), met een opvallende hint bovenaan
  (accent-blokje + donkere tekst) i.p.v. het weggevallen lichtgrijs.
- De bijlagen-linklijst (de "rode letters onder elkaar"): nu een nette **4-koloms grid** in donkere,
  ingetogen tekst i.p.v. fel roodbruin; scheelt ruimte. Videolink in dezelfde rustige stijl.
- Foto-tegels bleven 2 per rij (Rein vond formaat/nummering goed).

## Verificatie

- `tsc --noEmit`: 0. Unit-suite: 526 groen (+3 controle-tests). Lint van de geraakte bestanden schoon
  (één pre-existing setState-in-effect-error in OpleverFlow staat los hiervan en valt buiten de push-poort).
- Visueel geverifieerd via een PDF-preview (tijdelijk gereedschap, niet gecommit).

## Open

- **Migratie draaien**: `schema-compleet-14` moet op de test- en productie-Supabase (`controle`-kolom),
  anders faalt het opslaan van de oplevering. Net als eerdere migraties.
- E2e voor de controle (aanvinken op het scherm + terug in het rapport): samen met Rein.
- **Vers rapport-ontwerp**: Rein wil een paar mock-ups met een frisse blik (geen afgeleide van nu) via de
  UI/UX-skill. Volgende stap; de huidige opmaak is een tussenverbetering.
