# Handoff: vers ontwerp van het opleverrapport (mock-ups)

Datum: 2026-06-11

Deze sessie liep vol. Dit is de overdracht voor een nieuwe sessie die het opleverrapport opnieuw ontwerpt.

## Wat Rein wil

Een **frisse blik** op het opleverrapport (de PDF). Expliciet: **geen afgeleide** van het huidige ontwerp.
Eerst een **paar mock-ups** met alle ingrediënten, dan kiezen, dan bouwen. Via de **UI/UX-skill**
(`ui-ux-pro-max`). Ingetogen/professioneel; het is het visitekaartje van de keukenzaak naar de eindklant.

## Belangrijke context / constraints

- Het rapport is **één PDF**, gegenereerd met **pdf-lib** in `src/lib/rapport.ts` (handmatige x/y-layout,
  geen HTML/CSS, geen flexbox). Er is GEEN online/HTML-weergave.
- Aanpak-suggestie: maak de mock-ups als **HTML** (browser, snel itereren, de UI/UX-skill is web-gericht)
  om de richting te kiezen; **vertaal** de gekozen richting daarna naar pdf-lib. Houd er rekening mee dat
  pdf-lib geen word-wrap/auto-layout doet (zie de `wikkel`-helper en de handmatige `y`-cursor).
- **Python ontbreekt op deze machine**, dus de `ui-ux-pro-max` Python-CLI werkt niet. Gebruik de
  skill-principes uit de skilltekst zelf (contrast 4.5:1, ingetogen kleuren, kleur niet als enige
  indicator, consistent ritme/witruimte, niets "goedkoops").
- **A4 portret**, marges 48pt. Kleurpalet nu: INK donker, MUTED grijs, ACCENT oranje, SUCCESS groen,
  ROOD. Rein vond fel roodbruin "goedkoop"; hou kleuraccenten spaarzaam.

## Alle ingrediënten die in het rapport moeten (volgorde vrij te herzien)

1. **Briefhoofd**: bedrijfsnaam (= afzender uit monteur-profiel, niet hardcoded), label "OPLEVERRAPPORT",
   opgeleverd-datum.
2. **Klantblok**: klantnaam, adres, en chips: referentienummer, leverweek, keukenzaak.
3. **Oplevering/rapportage**: statusbadges (ondertekend ja/nee, video ja/nee, aantal eindstaat-foto's),
   de opmerking (klant/monteur), en de **eindstaat-foto's** (genummerd, klikbaar = link-annotatie opent
   de foto groot in de browser; hint erbij). Foto-tegels 2 per rij vond Rein goed qua formaat.
4. **Meldingen**: per melding een kop (Spoed/Melding), datum, tekst, en genummerde foto's. Doorlopende
   foto-nummering over het hele rapport.
5. **Controle bij oplevering** (NIEUW, net gebouwd): per punt Akkoord/Niet akkoord + de tekst. Nu één
   vast punt: "Buiten de evt. meldingen geen beschadigingen aan: keuken, keukenblad, vloer, plafond en
   muren." Bron: `src/lib/oplever-controle.ts` (`CONTROLE_PUNTEN`). Data op `oplevering.controle`.
6. **Handtekening klant**: Rein wil deze **helemaal onderaan** (staat daar nu al).
7. **Bijlagen/links**: genummerde foto-links (nu 4-koloms grid) + videolink. Omdat de foto's nu zelf
   klikbaar zijn, kan dit compacter of anders.
8. **Voettekst**: afzender-contact (bedrijf · telefoon · e-mail), gecentreerd onderaan.

## Preview-gereedschap (om een PDF te zien)

De `Read`-tool kan een PDF visueel lezen (paginas renderen). Genereer een test-PDF zo (tijdelijk
`src/lib/_preview-rapport.test.ts`, NIET committen), draai met netwerk
(`dangerouslyDisableSandbox`, foto's via `https://picsum.photos/seed/x/1000/750`), en `Read` daarna
`test-pdfs/preview.pdf`:

```ts
import { it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { genereerRapportPdf } from "./rapport";
import { CONTROLE_PUNTEN } from "./oplever-controle";
import type { Melding, Oplevering } from "./db";
it("preview -> test-pdfs/preview.pdf", async () => {
  const fotos = Array.from({ length: 7 }, (_, i) => `https://picsum.photos/seed/k${i}/1000/750`);
  const opdracht = { klant_naam: "De heer en mevrouw H Hoek", klant_adres: "Voorbeeldlaan 12, 2211 AB Noordwijkerhout", referentienummer: "192920", leverweek: "24/2026", keukenzaak: "Keukenstudio Voorschoten", opgeleverd_at: "2026-06-10T16:00:00Z" } as unknown as Melding;
  const oplevering = { eindstaat_foto_urls: fotos, video_url: "https://youtu.be/x", handtekening_url: "https://picsum.photos/seed/sign/320/120", opmerking: "Klant tevreden, belt nog voor smetplinten.", controle: [{ punt: CONTROLE_PUNTEN[0], akkoord: true }] } as unknown as Oplevering;
  const melding = { id: "m1", created_at: "2026-06-10T10:00:00Z", spoed: false, spoed_verzonden_at: null, ruwe_tekst: "Lade rechtsonder liep stroef, bijgesteld.", foto_urls: [`https://picsum.photos/seed/m1/1000/750`, `https://picsum.photos/seed/m2/1000/750`] } as unknown as Melding;
  const afzender = { naam: "Rein", bedrijfsnaam: "BKM Keukenmontage", telefoon: "0631665814", email: "R.k.zijlstra@gmail.com" };
  const pdf = await genereerRapportPdf(opdracht, [melding], oplevering, afzender);
  mkdirSync("test-pdfs", { recursive: true });
  writeFileSync("test-pdfs/preview.pdf", Buffer.from(pdf));
}, 60000);
```
Draaien: `npx vitest run src/lib/_preview-rapport.test.ts` (met sandbox uit voor netwerk). Verwijder het
bestand voor een commit (anders draait het mee in de suite).

## Stand van zaken (gepusht, commit `71d418c`)

- Controle-checklist gebouwd (datamodel migratie `schema-compleet-14` is door Rein gedraaid op test +
  productie), opleverscherm + rapport + tests. 526 units groen, tsc 0.
- Rapport kreeg tussentijdse opmaak-verbeteringen (header, klikbare foto's, bijlagen-grid, handtekening
  onderaan). Dit is wat Rein "nog niet echt mooi / afgeleide" noemt — het verse ontwerp mag hier los van.
- Pre-existing lint-error in `OpleverFlow.tsx` (setState-in-effect, regel ~107) staat los en valt buiten
  de push-poort (`npm run test:all`, geen lint).

## Werkwijze-afspraken (geheugen)

Testen in alle passende lagen meeleveren in dezelfde commit (ook e2e/M-laag, niet uitstellen). E2e draait
Rein samen. Voorkauwen = kant-en-klare prompt met pad, kort. Nederlands, direct, geen em-dashes.
