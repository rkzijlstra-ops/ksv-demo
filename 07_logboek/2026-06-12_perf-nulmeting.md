# 2026-06-12 Performance: nulmeting + verbouwing

Aanleiding: de app voelt soms traag, vooral bij eerste gebruik, en bij navigeren zie je geen voortgang.
Doel: (1) sneller, (2) op meer punten tonen dat er gewerkt wordt. Vercel-plan wordt apart geüpgraded.

## Bevindingen

- **Geen laadschermen.** 16 pagina's, 0 `loading.tsx`. Bij navigeren bevriest het oude scherm tot het
  nieuwe klaar is, geen voortgang zichtbaar. Grootste gevoelswinst hier.
- **Data laadt serieel.** Server-pagina's doen hun database-vragen ná elkaar. Opdracht-detail: 7 vragen
  op een rij; oplever-scherm: 4. Parallel kan dat fors korter.
- **Eerste-keer-traag** is grotendeels Vercel-koudestart (Hobby-plan), zit in de hosting, niet de code.

## Nulmeting (vóór de verbouwing)

`npm run perf` — mediaan van 5, alleen lezen, vanaf werkstation naar productie-Supabase.
Absolute getallen zijn vanaf hier hoger dan op Vercel (verder van Supabase); de verhouding telt.

| Actie | serieel (nu) | parallel (na #2) | winst |
|---|---|---|---|
| Opdracht openen (7 reads) | 310 ms | 62 ms | ~80% |
| Oplevering openen (3 reads) | 127 ms | 55 ms | ~56% |

Herhaal met `npm run perf` na de Vercel-update om opnieuw te meten.

## Verbouwing
1. Laadskeletten (`loading.tsx`) op de hoofd-schermen, voor directe voortgang bij navigeren.
2. Database-vragen parallel (`Promise.all`) op de zwaarste pagina's.

(Status / resultaat na de bouw onderaan aanvullen.)
