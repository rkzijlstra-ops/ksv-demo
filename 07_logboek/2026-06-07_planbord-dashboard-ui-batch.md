# Planbord/dashboard UI-batch

Datum: 2026-06-07

Batch UI-verbeteringen aan het kantoor-gedeelte (monteur-app ongewijzigd):

1. Oranje accent-balk weg uit de header van dashboard en planbord.
2. Witruimte tussen de monteur-blokken op het planbord (spacer-rij in het grid).
3. Meer info in de planbord-blokjes: adres erbij (naast tijd/duur/ref), zoals de dashboard-kaarten.
4. Dikke gekleurde omlijsting rondom het hele planbord-blok (was alleen een dikke linkerbalk).
5. Kartelrand (gestreept oranje) bij "nog te versturen" vervallen; ononderbroken oranje. De gele status
   markeert nu "niet bevestigd", dus de kartel was dubbelop.
6. Navigatie tussen dashboard en planbord: gelijke knop (PaginaNavKnop), op beide pagina's boven én onder.
7. Inplan-tijd: van een lastige tijd-input naar een kies-of-typ-veld (datalist met opties per 5 min,
   06:00-20:00, of zelf typen). Helper `tijdOpties` (unit-getest).

Tests: tijd.test, planbord/terug-navigatie/screenshots e2e's groen. Visueel geverifieerd via screenshots.
Geen DB-migratie nodig (puur frontend).
