# Agenda: planbord gekozen + schoner invoermodel voor tijd/duur

Datum: 2026-06-02
Project: `01_projecten/keukenstudio-voorschoten-demo`
Aangepast: `DESIGN-COMPLEET-SYSTEEM.md`, mockups `agenda-planbord.html` / `agenda-plankaart.html` / `index.html`

## Beslissingen

**1. Agenda-flow: optie 1 (planbord met te-plannen-strook).** Reinier koos het planbord boven de plan-knop-op-de-kaart (optie 2), vanwege overzicht. Weekraster met rijen per monteur en kolommen per dag; binnen-opdrachten staan in een vaste strook "Nog te plannen" en worden op een dag bij een monteur gesleept. Plannen gebeurt op het planbord, het dashboard blijft overzicht.

**2. Blokken tonen context, niet alleen de naam.** Elk blok krijgt een omschrijvingsregel (wat de klus is); volledige details bij aanklikken. Montage = brede dagbalk zonder tijd, service = compact kaartje met tijd. Meerdere services op één dag bij één monteur stapelen, automatisch gesorteerd op tijd.

**3. Schoner invoermodel voor tijd en duur (belangrijk).** Het oude ontwerp koppelde gedrag hard aan het type (montage = dagen zonder tijd, service = tijd). Dat is vervangen door één invoercontrole voor alles: startdatum, aantal dagen, tijd (optioneel). Tijd leeg = dagblok, tijd ingevuld = kaartje op dat uur. Zo zet je een montage van 2 dagen op met hetzelfde scherm als een service. Datastructuur: `startdatum`, `starttijd` (nullable), `duur_dagen`.

**4. Geen kloktijd-beleid in versie 1.** De oude harde typeregel ("montagetijd nooit naar buiten") is geschrapt, niet vervangen door een zaak-instelling. Reden van Reinier: in v1 niet nodig, want bij montage vul je gewoon geen tijd in, dus er gaat ook niets de deur uit. Simpele regel: geen tijd = dagblok, wel tijd = kaartje op dat uur. Een expliciete bescherming als instelling per zaak kan later zonder herbouw, omdat invoer en beleid al gescheiden zijn. Type bepaalt nu alleen de standaardinstelling.

## Vastgelegd in DESIGN-COMPLEET-SYSTEEM.md

- Sectie "Opdrachttypes" herschreven naar "Opdrachttypes en invoermodel": één invoermodel, standaarden per type, zaak-instelling vervangt de oude harde typeregel.

## Aanvulling: drie verbeteringen na flow-review

Na een controle van de hele flow (bleek strak, geen dubbele functionaliteit) zijn drie kleine verbeteringen verwerkt in ontwerp + mockups, plus twee documentfouten hersteld (kapotte flow-stap 6, oude "intern 07-15"-regel in stap 3):

1. **Verstuur-knop met teller** die concepten én gewijzigde opdrachten telt, zodat een wijziging niet blijft hangen.
2. **Gebundeld "Te doen"-overzicht** bovenaan het dashboard met klikbare tellers (te plannen / te versturen / niet bevestigd / aandacht). Vervangt het losse attentiesignaal.
3. **"Gewijzigd, nog te versturen" als zichtbare staat**: zelfde gestreepte behandeling als concept, label "gewijzigd", telt mee in de verstuur-knop en het Te doen-overzicht.

## Aanvulling: opgeleverd-detail en lijst-scoping

- **Opgeleverd item openen toont het volledige opleverdossier als leesweergave**: opleverpunten + restpunten, foto's, handtekening met datum, monteur, of rapport verstuurd, plus documenten en historie op referentienummer. Bewerken blijft in de monteur-app. Vastgelegd in ontwerp (Terugkoppeling) en mockup `opdracht-opgeleverd.html`.
- **Lijst-scoping/archief:** actief werk altijd zichtbaar; opgeleverd en geannuleerd standaard de laatste **14 dagen** (keuze Reinier), ouder naar archief maar vindbaar. **Zoeken draait om het referentienummer:** ref intikken springt direct naar de opdracht/het klantdossier. Onder de motorkap lazy-load/paginering. Vastgelegd in ontwerp (Dashboard) en archief-affordance in `dashboard.html`.

## Volgende stap

Detail-mockup van een actieve opdracht (binnen/gepland) kan nog: documenten toevoegen, plan-popover in context. Planbord verder aankleden: drag-gedrag, weeknavigatie, meer monteurs.
