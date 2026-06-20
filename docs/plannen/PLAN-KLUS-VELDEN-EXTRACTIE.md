# Plan: gedeelde veldenset voor aanmaken én aanpassen (KlusVelden)

Doel: één bron van waarheid voor de klant-/kop-velden, zodat een veldwijziging niet meer op twee
plekken hoeft. GEEN samenvoeging van de twee flows: aanmaken (`KlusInvoer`) en aanpassen
(`OpdrachtBewerken`) blijven aparte componenten met hun eigen logica; alleen de gedeelde
veld-rendering wordt eruit getrokken.

## Wat NIET verandert (bewuste afbakening)
- Geen wijziging aan API-routes (`POST /api/opdrachten`, `PATCH /api/opdrachten/[id]`, `/verplaatsen`).
- Geen samenvoeging van de flows. Create houdt: document-upload, PDF-parser-passthrough, adres-keuze
  (AdresKeuze), spraak, offline, datum/tijd, rol-bestemming. Edit houdt: planning-fieldset
  (datum/tijd/dagen via /verplaatsen, alleen als ingepland), Type-select, het slot op
  opgeleverd/geannuleerd, en de "gewijzigd, opnieuw versturen"-markering.
- Geen wijziging aan labels/placeholders (zie veiligheidsnet).

## Wat WEL verandert
Nieuw component **`src/components/KlusVelden.tsx`**: presentational + controlled. Rendert de gedeelde
klant-/kop-velden vanuit één definitie. Beide formulieren gebruiken het.

- Gedeelde velden (identiek in beide nu): **Klantnaam, Adres, Referentie, Telefoon, E-mail,
  Keukenzaak, "Wat moet er gebeuren?" (werkomschrijving)**.
- Per-formulier verschillen worden props/flags, geen aparte kopie:
  - `toonAdres` (create zet 'm uit als de adres-keuze actief is en rendert daar AdresKeuze).
  - `toonAdviseurLeverweek` (alleen edit toont die nu).
  - `toonType` (alleen edit toont de Type-select).
  - `werkExtra?: ReactNode` (create hangt hier de spraak-knop onder).
- API: `waarden` (één object) + `onWijzig(veld, waarde)`. Vervangt de losse useState-velden in beide
  ouders door één waarden-object. Gedeelde veld-styling (de `veld`-class) verhuist mee.

## Stappen
1. `KlusVelden.tsx` schrijven (alleen rendering + de gedeelde veld-class). Labels/placeholders
   1-op-1 overnemen van de huidige twee formulieren.
2. `OpdrachtBewerken` ombouwen: kop-velden via `KlusVelden`; planning-fieldset, Type, submit/PATCH
   en het slot blijven staan.
3. `KlusInvoer` ombouwen: kop-velden via `KlusVelden`; upload, AdresKeuze, datum/tijd, spraak,
   passthrough en submit/POST blijven staan.
4. tsc + unit-suite groen houden.
5. Push → CI draait de e2e die deze formulieren via labels aansturen.

## Veiligheidsnet (waarom dit laag-risico is)
De bestaande e2e sturen deze formulieren aan via de **labelteksten** (`getByLabel("Klantnaam")`,
"Adres", "Referentie", "Telefoon", "E-mail", "Keukenzaak", "Wat moet er gebeuren?", "Startdatum",
"Dagen", "E-mail"): `zelf-invoer.spec`, `dashboard-nieuwe-klus.spec`, `verplaatsen-detail.spec`,
`levenscyclus.spec`, `adres-keuze.spec`. Zolang de labels/placeholders identiek blijven, bewijzen die
e2e dat aanmaken én aanpassen ongewijzigd werken. De labels zijn dus het contract; daar raak ik niets
aan. Er is geen component-testlaag (jsdom), dus de e2e + tsc zijn het vangnet, net als altijd.

## Inschatting
Geïsoleerd, klein-middel. Geen gedragsverandering voor de gebruiker (pure opschoning). Risico laag
mits de labels intact blijven en CI groen is. Test-first/branch/CI zoals altijd.
