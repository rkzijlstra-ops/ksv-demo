# Brainstorm: terugmeld-keten compleet maken

Sessie 2026-06-17. Dirigent: Rein (weg, autonoom afgemaakt). Brainstorm samen gedaan in chat;
beslissingen hieronder vastgelegd zodat ze herleidbaar zijn.

## Probleem (door Rein gevonden bij testen)

De monteur kan een door kantoor ingeschoten klus "terugmelden". De monteur-kant was af (klus naar
zijn geschiedenis), maar de keten daaromheen niet:

1. **Status blijft hangen.** `markeerTeruggemeld` zette alleen `teruggemeld_*`, niet de
   `dashboard_status`. De klus bleef op het planbord staan als "bevestigd" (blauw) in plaats van terug
   naar "te plannen".
2. **Geen filter-tab "Teruggemeld"** op het dashboard; reden niet zichtbaar op kaart/pool (wel al in
   het logboek op de detailpagina).
3. **Herkansing breekt.** Stuurt kantoor de teruggemelde klus opnieuw uit (naar dezelfde of een andere
   monteur), dan werd `teruggemeld_at` nergens gewist. De klus belandde in de GESCHIEDENIS van de
   ontvangende monteur in plaats van zijn actieve werkpool.
4. **Opleveren-na-terugmelden** liet strijdige status achter (`teruggemeld_at` én
   `opdracht_status=opgeleverd`), met dubbel-inplan-risico zodra de status-fix (punt 1) er is.
5. **Flits-bug.** De terugmeld-modal zit als DOM-kind in de klikbare kaart-`<a>`; de bevestig/annuleer-
   knoppen riepen geen `preventDefault`, dus de kaart navigeerde alsnog naar de detailpagina. Plus geen
   bevestiging na terugmelden.

## Beslissingen (door Rein gekozen in chat)

- **Status terug naar bestaande status "binnen"** (geen nieuwe status), met een zichtbare
  "Teruggemeld"-markering + reden. Filter-tab als pseudo-filter op de `teruggemeld_at`-vlag.
- **Robuust: per poging bewaren.** Elke terugmelding blijft als losse regel staan, ook na heruitsturen
  of opleveren. Lost ook het "opeens helemaal weg"-gevoel op: de monteur blijft zijn teruggemelde
  klussen in zijn geschiedenis zien, los van de huidige toewijzing.
- **Opleveren na terugmelden mag** (klant komt toch thuis). Opleveren is het eindstation: het haalt de
  klus uit de pool en ruimt de transiënte terugmeld-vlag op.

## Datamodel-keuze

- `teruggemeld_at/_reden/_toelichting` op `meldingen` worden een TRANSIENTE vlag: "ligt nu teruggemeld
  bij kantoor". Gezet bij terugmelden, gewist bij opnieuw versturen (`markeerVerzonden`) en bij
  opleveren (`registreerZaakRapport`).
- Nieuwe append-only tabel `terugmeld_pogingen` (blok 22) met snapshot (klant_naam/_adres/ref + reden +
  monteur). RLS: monteur ziet zijn eigen pogingen (`monteur_id = auth.uid()`), kantoor alles. Dit is de
  blijvende historie voor zowel de monteur-geschiedenis als het kantoor-dossier.
- `toegewezen_aan` blijft bij terugmelden STAAN (klus blijft in de werkpool-geschiedenis van die monteur
  tot kantoor herplant; bestaande e2e verwacht dat). Bij herplannen naar een ander verdwijnt hij uit
  zijn werkpool, maar de `terugmeld_pogingen`-regel houdt hem in zijn geschiedenis.
- De bestaande `gebeurtenissen`-audit ("teruggemeld") blijft (kantoor-logboek op de detailpagina, en
  bestaande e2e). Bewust licht dubbel: gebeurtenissen = kantoor-audit-trail, terugmeld_pogingen =
  structured, RLS-veilige bron voor de monteur-geschiedenis.

## Toestandsmatrix

Zie TOESTANDEN.md, de toegevoegde rijen "teruggemeld", "opnieuw uitsturen na terugmelden",
"opleveren na terugmelden".

## Wat expliciet NIET in deze sessie

- Geen aparte "opnieuw inplannen"-status (bewust; "binnen" + markering volstaat).
- Geen blokkade op opleveren van een teruggemelde klus (Rein wil het juist toestaan).
- Geen SMS bij terugmelden naar kantoor (bestaand: best-effort mail naar kantoor blijft).
