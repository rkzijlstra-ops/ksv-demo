# Design: handleiding-herontwerp (monteur)

Datum: 2026-06-28
Branch: `handleiding-herontwerp`
Vervangt de opzet uit `DESIGN-HANDLEIDING-MONTEUR.md` (de eerste versie, juni 2026).

## Doel

De in-app handleiding voor de monteur is verouderd en niet optimaal vindbaar. Dit herontwerp maakt hem:
1. **Actueel** qua tekst en screenshots (de app is sinds 13/14 juni flink veranderd: oplever-flow, melding-flow, PDF-viewer/documenten, vervolg/opgeleverd, rename).
2. **Snel doorzoekbaar**: een monteur die op de klus vastloopt moet in twee tikken bij het juiste onderwerp zijn, zonder een lange lijst door te scrollen.
3. **Mooi en consistent** met de rest van de app (design-system-tokens en lettertypes).
4. **Meegroeibaar**: nieuwe functies of verse screenshots toevoegen mag nooit een verbouwing van de pagina vragen.

## Huidige situatie (vertrekpunt)

- Pagina: `src/app/handleiding/page.tsx` (server component), sub-pagina `src/app/handleiding/voorbeeldrapport/page.tsx`.
- Databron: `src/lib/handleiding-stappen.ts`, een platte lijst van 6 stappen (`HANDLEIDING_STAPPEN`).
- Screenshots: `public/handleiding/NN-*.png`, automatisch gegenereerd door `e2e-handleiding/genereer-screenshots.spec.ts` (script `npm run screenshots:handleiding`), tegen een geseede demo-klus "Fam. Jansen / DEMO-001".
- Getoond op drie plekken (blijven werken):
  - Altijd via het menu (≡) rechtsboven, alle rollen (`UserMenu.tsx`).
  - Onboarding op de kluspool (`KluspoolOnboarding.tsx`): welkomblok / tip-balk met link naar de handleiding.
  - Welkomstap na het onboarding-formulier (`OnboardingForm.tsx`).
- Problemen: screenshots verouderd; teksten dekken nieuwe functies niet; elke screenshot legt de volledige viewport vast (grote lege witruimte onder elk plaatje); de lange lijst is traag om iets specifieks in te vinden.

## Gekozen ontwerp (variant 1)

Na het vergelijken van drie navigatie-varianten (inhoudsopgave + inklappen / tabbladen / tegelmenu) is gekozen voor de **inklapbare-onderwerpen-opzet zonder los menu**.

### Structuur en inhoud

De platte 6-stappenlijst wordt vier groepen met onderwerpen, allemaal bijgewerkt naar de huidige app:

- **Aan de slag:** Je kluspool · Klus toevoegen (PDF/foto/mail/leeg) · Klus openen
- **Tijdens de klus:** Melding maken (foto/video/spraak/tekst) · Spoedmelding · Documenten / PDF bekijken
- **Afronden:** Snel afsluiten · Afsluiten + rapport · Handtekening · Vervolg / opgeleverd · Niet doorgegaan
- **Versturen:** Naar opdrachtgever · Klant-versie

Nieuw t.o.v. de oude handleiding: klus toevoegen via mail, video bij meldingen, documenten/PDF-viewer, vervolg/opgeleverd. Exacte teksten worden bij het bouwen één voor één tegen de echte app geverifieerd (opleverlat: niet "zou moeten kloppen", maar nagelopen).

### Weergave

- **Geen losse inhoudsopgave.** Ingeklapt staan de onderwerp-balken onder elkaar en die zijn zelf het overzicht (een aparte lijst zou bijna even lang en dubbelop zijn).
- **Onderwerp-balken in de grijze knop-stijl** van de afsluit-knoppen: lichte `surface`-achtergrond, `line`-rand, mono-titel; bij openen kleurt het streepje links `accent`-oranje en wordt de rand `ink`. Chevron `›` draait open.
- **Inklapbaar** per onderwerp (HTML `<details>`/`<summary>` of equivalente toegankelijke toggle).
- **Standaard alles ingeklapt** (rustig, snel scannen). Bovenaan één knop **"Alles openklappen"** (wordt "Alles inklappen"), met subregel **"of tik hieronder een onderwerp aan"**. Bewust géén automatisch-eerste-keer-open met verborgen browser-geheugen: voorspelbaar gedrag is belangrijker dan het effect.
- **Screenshot in een telefoon-frame**, netjes bijgesneden (geen lege viewport-witruimte meer).
- **Per groep een kop** (mono, uppercase, `ink-muted`, met dunne lijn).
- Onderaan blijft de knop **"Bekijk een voorbeeldrapport"** (→ `/handleiding/voorbeeldrapport`).
- Kleuren en letters: uitsluitend bestaande Tailwind-klassen / design-system-tokens (`bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-ink`, `bg-accent`, `bg-primary`, `font-mono`, Lexend/Source Sans via de globale fonts). Zo is consistentie automatisch geborgd. Bron: `design-system.md` + `src/app/globals.css` (`@theme`).

### Datamodel (extensibiliteit, kernpunt)

`handleiding-stappen.ts` gaat van een platte lijst naar groepen met onderwerpen. Velden per onderwerp blijven compatibel met de screenshot-generator.

```ts
export type Interactie = "handtekening-modal" | "scroll-onder" | "interne-notitie" | ...;

export type HandleidingOnderwerp = {
  id: string;            // stabiele sleutel + anker-id (bv. "spoedmelding")
  titel: string;
  intro?: string;
  punten: string[];
  bestand: string;       // public/handleiding/<bestand>; ook de generator-sleutel
  route: string;         // waar de generator naartoe navigeert (":id" → demo-klus)
  interactie?: Interactie;
  nieuw?: boolean;       // toont een "nieuw"-label tot het plaatje/feature er is
};

export type HandleidingGroep = { titel: string; onderwerpen: HandleidingOnderwerp[] };

export const HANDLEIDING_GROEPEN: HandleidingGroep[] = [ ... ];
```

Gevolg: een nieuwe functie of vers plaatje toevoegen =
1. één onderwerp-regel toevoegen/aanpassen in de databron, en
2. `npm run screenshots:handleiding` draaien (maakt het plaatje tegen de echte app).

De pagina rendert puur wat in de databron staat en hoeft nooit verbouwd te worden. **Ontbreekt een screenshot, dan toont de pagina een nette placeholder** (zoals nu al: `existsSync`-check) in plaats van te breken. Dat is de meegroei-garantie.

### Screenshots / generator

- `genereer-screenshots.spec.ts` itereert straks over `HANDLEIDING_GROEPEN` (alle onderwerpen plat) i.p.v. de oude lijst.
- **Bijsnijden:** in plaats van de hele viewport vastleggen, clippen op de inhoud (of `fullPage` met een vaste, smallere viewport), zodat er geen lege witruimte onder de schermafbeelding staat.
- Nieuwe onderwerpen die een eigen route/interactie nodig hebben (documenten/PDF, vervolg/opgeleverd, spoed, klus toevoegen, niet doorgegaan, klant-versie) krijgen de juiste `route` + eventueel een nieuwe `interactie`-stap in de generator. Onderwerpen waarvoor (nog) geen zinnig scherm te seeden is, blijven `nieuw: true` met placeholder tot het kan.
- De generator faalt luid (niet-nul exit) als een gevraagde stap misgaat, zodat plaatjes niet stil verouderen (bestaand gedrag behouden).

### Waar getoond (ongewijzigd)

Menu-link, kluspool-onboarding en onboarding-welkomstap blijven naar `/handleiding` wijzen. Teksten daar die "6 stappen" noemen worden bijgewerkt naar de nieuwe opzet (bv. "in korte stappen" of het juiste aantal onderwerpen, zonder hard getal als dat snel veroudert).

## Testen (TESTDEKKING + TOESTANDEN bijwerken)

- **Unit** (`handleiding-stappen.test.ts`): nieuwe datastructuur valide (unieke `id`/`bestand`, elke groep heeft onderwerpen, routes gevuld).
- **e2e** (`handleiding.spec.ts`): pagina rendert de groepen en onderwerpen; "Alles openklappen" klapt alles open en weer dicht; een los onderwerp aantikken opent dat blok; placeholder verschijnt als een plaatje ontbreekt; voorbeeldrapport-link werkt; bereikbaar voor monteur én (geen redirect) voor de andere rollen.
- **Screenshot-generator** draaien als onderdeel van de oplevering en de plaatjes verversen.
- Toegankelijkheid: toggle bedienbaar met toetsenbord, focus-ring zichtbaar, tap-targets ≥ 56px (design-system).

## Opleverlat (vóór "klaar")

- Hele reis nagelopen op een echt scherm (telefoonformaat), beide standen (ingeklapt/open), placeholder-pad én gevuld-pad.
- Teksten kloppen met de huidige app-flows (mail-invoer, video, PDF, vervolg/opgeleverd, snel vs rapport).
- Screenshots vers en bijgesneden, geen lege witruimte.
- Geen verborgen-geheugen-gedrag; navigatie voorspelbaar.

## Bewust buiten scope (YAGNI)

- Geen zoek-/filterveld (de ingeklapte balken volstaan; kan later als het echt lang wordt).
- Geen ingebedde coachmark-rondleiding over de echte schermen (variant C): mooist maar zwaar en veroudert juist sneller.
- Geen tabbladen of tegel-drilldown (varianten 2/3 afgevallen).

## Mockups

In `C:\Users\rkzij\ksv-mockups\`:
- `handleiding-herontwerp-mockup.html` — gekozen variant 1, definitief (app-kleuren, grijze balken, toggle-knop).
- `handleiding-varianten.html` — de drie vergeleken varianten naast elkaar.
- `handleiding-mobiel-weergave.html` — telefoonformaat-weergave.
