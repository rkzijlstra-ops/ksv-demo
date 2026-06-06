# Ontplannen vanaf het planbord: bevestiging + mail naar de monteur

Datum: 2026-06-06

## Aanleiding

Reinier vroeg wat er gebeurt als je een geplande én geaccepteerde (status `bevestigd`) afspraak
vanaf het planbord terugsleept naar de pool. Bij het nalopen bleek een gat: ontplannen zette de
klus stil terug naar `binnen` zonder enige melding aan de monteur, terwijl annuleren dat wel netjes
deed (automatische mail). De monteur zag de klus dus zonder bericht uit zijn werkpool verdwijnen, en
er was geen bevestiging vooraf, dus één misslag met de muis haalde een bevestigde klus van het bord.

Waarom de tests dit niet vingen: de bestaande route-test controleerde alleen dat `ontplanOpdracht`
werd aangeroepen en dat een db-fout een 503 gaf. De route deed precies wat hij ontworpen was (stil
ontplannen). Het gat zat in het ontwerp, niet in de uitvoering. Een test toetst tegen de bedoeling;
als de bedoeling zelf onvolledig is, valt de test daar doorheen. Les: bij "compleet maken" de
levenscyclus-tegenhangers naast elkaar leggen (ontplannen vs annuleren), niet alleen elke route op
werkt-en-faalt-netjes testen.

## Wijziging

Twee dingen toegevoegd, alleen voor een al verstuurde/bevestigde klus (`gepland`/`bevestigd`). Een
nog niet verstuurd concept (`concept_gepland`) gaat nog steeds stil terug, dat is een onschuldige
actie.

1. **Bevestigingsdialoog** in `PlanbordBord.tsx`: sleep je een verstuurde/bevestigde klus naar de
   pool, dan eerst een modal ("De monteur krijgt automatisch bericht. Van planning halen?"). Pas bij
   "Ja" gaat de kaart weg. Bij een concept gebeurt het meteen, zonder modal.
2. **Ontplan-mail** naar de monteur in `POST /api/opdrachten/[id]/ontplannen`, analoog aan de
   annuleer-route: opdracht ophalen vóór het wissen, mail best-effort (ontplannen blijft staan ook
   als de mail faalt, met `mailFout` in het antwoord). De route checkt nu ook de rol (alleen kantoor),
   wat hij eerder niet deed.

De mail is een eigen, eerlijke tekst (`ontplan-mail.ts`): de klus is "van je planning gehaald" en
kan later opnieuw ingepland worden, anders dan de annuleer-mail die "geannuleerd" zegt.

## Verschil ontplannen vs annuleren (ter referentie)

- **Ontplannen** (pool): status -> `binnen`, alle planning + `verzonden_*`-velden gewist. Bedoeld om
  opnieuw in te plannen. Verdwijnt van het bord, komt in de pool.
- **Annuleren**: status -> `geannuleerd`, planning blijft als historie staan. Bedoeld als "gaat niet
  door". Verdwijnt van het bord, komt NIET in de pool. Knop staat alleen op de opdracht-detailpagina
  (`/dashboard/opdracht/[id]`), niet op het planbord.

## Tests

- `ontplan-mail.test.ts`: tekst (3 tests).
- `ontplannen/route.test.ts` uitgebreid van 2 naar 8 tests: mailt bij gepland/bevestigd, geen mail
  bij concept, 401/403/404, mail-faalt-maar-200, 503 bij db-fout.
- `mail-flows.spec.ts`: e2e ontplan-mail, echt verstuurd en bevestigd groen (`gemaild: true`).
- Volledige unit-suite groen (416 tests).

## Bekend, los hiervan

`npm run lint` geeft 1 pre-existing error in `NavKnop.tsx` (`react-hooks/set-state-in-effect`, een
strenge nieuwe React-regel op een correct na-mount-patroon). Stond er al, niet door deze wijziging.
Nog te beslissen of we dat met een eslint-disable afdekken of het patroon herschrijven.
