# Opleveringsmail: afzender consistent + nette begeleidende tekst

Datum: 2026-06-10

## Aanleiding

Het opleverrapport (PDF) was af en goed, maar de **begeleidende e-mail** zelf deugde nog niet. In de
echte demo-mail (ref 192920, in mijn rk-Gmail, beland in Promoties) zaten drie problemen:

1. **Afzender inconsistent**: bovenaan stond "Keukenstudio Voorschoten" (From-naam), onderaan
   "Keukensale.com Katwijk" (de zaaknaam uit `opdracht.keukenzaak`). Twee verschillende namen in één mail.
2. **Rauwe videolink** in de lopende tekst (staat al klikbaar in de PDF-bijlagenlijst).
3. **Interne/ruwe opmerking** van de monteur in de mailtekst (staat al in de PDF), plus een verder kale
   tekst zonder aanhef of nette afsluiting.

## Wat

Afzender en ondertekening lopen nu mee met het **monteur-profiel**, via dezelfde terugval-keten als de
PDF (`bedrijfsnaam → naam → "Keukenmontage"`), zodat **From-naam en ondertekening altijd gelijk zijn**.
Videolink en opmerking zijn uit de mailtekst; de mail is een korte, nette begeleidende notitie.

- **`src/lib/afzender.ts`** (nieuw): `RapportAfzender` + `rapportAfzenderWeergave` hierheen verplaatst
  uit `rapport.ts`, zodat de mail de keten kan hergebruiken zonder pdf-lib mee te trekken. `rapport.ts`
  re-exporteert beide, dus bestaande imports (`@/lib/rapport`) blijven werken.
- **`src/lib/oplever-mail.ts`** (nieuw): `opleverMailTekst` (subject + begeleidende tekst + ondertekening,
  video alleen genoemd als die er is) en `afzenderHeader` (From-naam = afzender-kop, e-mailadres blijft uit
  `RESEND_FROM`). Pure functies, los getest.
- **`src/lib/mail.ts`**: `verstuurOpleverRapport` gebruikt die functies. `OpleverMailInput` kreeg
  `afzender`, `opmerking` eruit; `videoUrl` dient nog enkel om te bepalen of de tekst de video noemt.
- **`src/app/api/opdrachten/[id]/opleveren/route.ts`**: geeft `afzender` (al aanwezig uit het profiel) mee,
  `opmerking` eruit.

## Resultaat-mail

> Van: BKM Keukenmontage <…>  ·  Onderwerp: Opleverrapport <klant> (ref <nr>)
>
> Beste,
>
> Hierbij het opleverrapport van de montage bij <klant> (ref <nr>). De foto's en de video van de
> oplevering vindt u in het rapport in de bijlage.
>
> Met vriendelijke groet,
> <bedrijfsnaam/naam>
> <telefoon · e-mail>

Zonder video valt "en de video" weg; zonder profiel wordt het de neutrale "Keukenmontage".

## Toestand-matrix (waar getest op)

- afzender: bedrijfsnaam / alleen naam / leeg (→ "Keukenmontage"); voet leeg → alleen kop.
- video: wel/niet (zin past zich aan).
- RESEND_FROM: kaal adres / "Naam <adres>" / leeg (→ onboarding@resend.dev). From-naam altijd = kop.

## Werkwijze / verificatie

Conform afspraak: logica met unit-tests (`npm test`: 509 groen, +8 nieuw in `oplever-mail.test.ts`,
mail-tests aangepast aan nieuw gedrag). Lint schoon op de geraakte bestanden. Geen los `tsc`-script in dit
project; de gate is lint + vitest, `next build` typecheckt de app-code. De losse `tsc --noEmit`-meldingen
zitten in vooraf bestaande testbestanden, niet in deze wijziging. TESTDEKKING.md bijgewerkt.

E2e (`mail.spec` / browser) en de push doet Rein zelf.

## Open

- Nog niet gepusht/e2e gedraaid (door Rein).
- Productie-migraties schema-compleet-12 en -13 staan nog open op productie-Supabase (los van deze wijziging).
- SMS wacht nog op de CM.com productie-token.
