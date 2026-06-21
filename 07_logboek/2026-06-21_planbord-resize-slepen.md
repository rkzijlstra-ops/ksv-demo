# Planbord: duur van een montage slepen (resize aan de rechterrand)

Datum: 2026-06-21
Branch: `planbord-resize`

## Wat

Een montage-balk op het planbord heeft nu een greep aan de rechterrand. Sleep die naar rechts
voor meer dagen, naar links voor minder. Tijdens het slepen groeit/krimpt de balk live en telt de
dagteller mee. Sleep je voorbij vrijdag, dan loopt de klus gewoon door in de volgende week (de balk
kapt visueel op vrijdag, de rest verschijnt in de week erna). Dat laatste was de expliciete wens:
een klus deels in de ene en deels in de volgende week kunnen trekken.

## Beslissingen

- Greep alleen op montage (dagblok), niet op service (tijdstip) en niet op opgeleverd.
- Eén dagkolom = één werkdag. Het bord toont alleen ma t/m vr, dus weekends worden vanzelf
  overgeslagen; `deltaKolommen` is direct het aantal werkdagen erbij/eraf.
- Ondergrens: minstens één kolom van de balk blijft in de huidige week zichtbaar (nooit uit beeld
  slepen); bovengrens 20 werkdagen als veiligheidsklep.
- Conflict mag, kleurt rood (bestaande dubbele-boeking-check rekent mee op de nieuwe duur).
- Een al verstuurde klus die je resizet, wordt opnieuw "gewijzigd, te versturen": de monteur moet de
  nieuwe duur weten. Hiervoor telt de duur-wijziging nu mee in de "opnieuw versturen?"-beslissing
  (gat dat er eerder zat: `opVerzondenPlek` keek alleen naar monteur/dag/tijd, niet naar de duur).

## Bouw (test-first)

- `nieuweDuurNaResize(huidigeDuur, zichtbareSpan, deltaKolommen, maxDuur)` — pure functie, `planbord.ts`.
- `moetOpnieuwVersturenNa(status, plekGelijk, duurGelijk)` — pure functie, `opdracht-status.ts`.
- Server: `wijzigOpdracht` krijgt de vorige duur mee (`verplaatsen`-route geeft `opdracht.duur_dagen`)
  en gebruikt `moetOpnieuwVersturenNa`. Geen nieuw endpoint: resize gaat via `/verplaatsen` met
  dezelfde plek en een andere `duur_dagen`.
- UI: `PlanbordGrid` heeft de greep (eigen `useDraggable`, eigen `pointerdown` met `stopPropagation`
  zodat het niet de hele kaart versleept of naar de detailpagina navigeert) + live-voorbeeld;
  `PlanbordBord` rekent de sleep-afstand om naar kolommen (`onDragMove`, kolombreedte uit het raster)
  en slaat op (`verplaatsMetDuur`).

## Tests

- Unit: 781 groen (incl. nieuwe resize- en resend-tests).
- E2e `planbord.spec`: resize binnen de week (duur 1→3, "3 dagen") en over de weekgrens (doorloop in
  de volgende week) groen. De bestaande test "inplannen door slepen van de pool" faalt lokaal headless
  (faalt ook op master, los van deze wijziging; CI is leidend, was groen bij PR #21 vandaag).

## Losse punt onderweg

De `.env.test` in de hoofdmap wees nog naar de verwijderde oude test-DB (`mydwcsaalahtidzyefsq`).
Bijgewerkt naar de nieuwe (`mslexkwwhhwlxmwbnyff`) in de hoofdmap én deze worktree. `.env.test` is
gitignored, dus dit is geen onderdeel van de commit; wel goed om te weten voor nieuwe worktrees.
