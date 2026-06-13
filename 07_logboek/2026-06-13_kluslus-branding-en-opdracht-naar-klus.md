# Branding "Kluslus" en hernoeming opdracht -> klus

Datum: 2026-06-13

## Wat en waarom

De app heet vanaf nu "Kluslus" als product. Twee samenhangende dingen doorgevoerd in alle zichtbare tekst:

1. **Productnaam zichtbaar.** "Kluslus" staat nu op de login, in de paginatitel/manifest (PWA-naam) en als kruimel boven dashboard, agenda en klusdetail.
2. **"Opdracht" -> "klus" in alles wat de gebruiker leest.** Passend bij de naam Kluslus is "klus" de term geworden, overal: pagina's, componenten, mails, SMS, het PDF-rapport en de handleiding.
3. **BKM is geen merk meer.** "BKM" wordt nergens meer als merknaam getoond. Het is gewoon een gebruikersaccount, net als elke andere: je ziet "BKM" alleen als je als BKM bent ingelogd (via de profielgegevens), niet als label in de app. Eerdere "KSV"-resten in zichtbare tekst zijn ook weg.

## Grenzen die bewust zijn aangehouden

Alleen zichtbare tekst is aangepast. Niet aangeraakt (dat is code, hernoemen zou breken):
- routes en URL-segmenten (`/opdracht/:id`, `/api/opdrachten/...`)
- variabelen, functies, props, kolomnamen, typenamen, bestandsnamen (`OpdrachtCard`, `opdracht_id`, `createOpdracht`, ...)
- het woord "opdrachtgever": dat is een rol in het model, geen taak/klus, en blijft staan.

## Losse details

- Lege-klantnaam-fallback in mails/SMS was inconsistent ("opdracht" / "de opdracht"), las krom ("klus de opdracht is geannuleerd"). Overal gelijkgetrokken naar "klant", de bestaande conventie uit `sms-teksten.ts`.
- Handleiding-databron (`src/lib/handleiding-stappen.ts`) en de stap-4-flow ("Klus voltooien") meegenomen; screenshots waren al ververst.
- Vijf e2e-assertions matchten op de oude tekst (knoplabels, headings "Opdrachten", aria-label verwijderen). Bijgewerkt naar de nieuwe tekst.

## Verificatie

- `tsc --noEmit` schoon (alleen de bekende `.next/dev/types` corruptie; map verwijderd voor de push).
- Vitest: 72 bestanden, 558 tests groen.
- Pre-push hook (vitest + typecheck) groen, gepusht naar master. Volledige e2e draait in de cloud-CI.

## Productie

Tekst-only wijziging, geen schema- of logica-verandering. Geen migratie nodig.
