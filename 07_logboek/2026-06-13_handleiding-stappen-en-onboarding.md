# Handleiding-stappen duidelijker + onboarding naar de handleiding

Datum: 2026-06-13

Twee samenhangende verbeteringen na feedback van Rein.

## Handleiding: zichtbare overgang tussen stappen

De handleiding oogde als één doorlopende lijst screenshots; je zag de overgang tussen stappen niet. Nu krijgt elke stap een donkere kopbalk met een oranje stapnummer (en "N/totaal"), een sterke rand, ruime tussenruimte (`space-y-8`) en een stippellijn naar de volgende stap. De screenshot staat als afgekaderd blok binnen de stap. Alleen `src/app/handleiding/page.tsx`, geen nieuwe screenshots nodig.

## Onboarding: nieuwe gebruiker naar de handleiding leiden

Nieuw component `WerkpoolOnboarding` op de werkpool, dat zich aanpast:
- **Geen klussen, niet weggeklikt:** rijke "Welkom bij Kluslus"-uitleg met 3 stappen en een oranje knop naar de handleiding.
- **Wel klussen, niet weggeklikt:** compacte tip-balk "Nieuw hier?" boven de lijst.
- **Weggeklikt:** verdwijnt; bij een lege werkpool valt het terug op de gewone lege-staat ("Geen actieve klussen", die hierheen verhuisd is).

"Niet meer tonen" (of het kruisje) onthoudt per toestel via `localStorage` (`kluslus_welkom_weg`), geen migratie. Het blok vermeldt expliciet dat de handleiding altijd in het menu blijft staan, zodat niemand denkt dat de uitleg na wegklikken voorgoed weg is (de handleiding-link zat al in `UserMenu`).

Keuze: optie 1 (welkomstkaart) + optie 3 (lege-werkpool-gids) gecombineerd, localStorage i.p.v. profiel-vinkje (Rein wilde snel + simpel).

## Verificatie

tsc schoon, 558 unit-tests groen, nieuwe e2e `onboarding.spec.ts` (tonen, wegklikken, wegblijven na herladen), CI volledig groen. UI-only, geen schema-wijziging.
