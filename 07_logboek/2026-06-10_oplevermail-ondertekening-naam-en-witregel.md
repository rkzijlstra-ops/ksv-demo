# Opleveringsmail: ondertekening met persoonsnaam + witregel (dubbele bedrijfsnaam weg)

Datum: 2026-06-10

## Aanleiding

In de echte demo-mail (ref 192920, Hoek, in mijn rk-Gmail) stond de ondertekening dubbel:

```
Met vriendelijke groet,
BKM Keukenmontage
BKM Keukenmontage  ·  0631665814  ·  R.k.zijlstra@gmail.com
```

De bedrijfsnaam stond zowel als kop als vooraan de contactregel, direct onder elkaar zonder witregel.
Rein wil onder de groet zijn **persoonsnaam** (die in de app staat ingevoerd), daaronder met een
**witregel** de bedrijfs- en contactgegevens.

## Oorzaak

`opleverMailTekst` bouwde de ondertekening als `kop` + `voet` uit de gedeelde `rapportAfzenderWeergave`
(`afzender.ts`). Die voet is `bedrijfsnaam · telefoon · e-mail`, en de kop is ook de bedrijfsnaam, dus de
bedrijfsnaam kwam twee keer onder elkaar. In de PDF is dat prima (kop = grote titel, voet = klein
voettekstje), in de mail plakt het op elkaar en oogt het als fout.

## Wat

Alleen de **mail**-ondertekening aangepast in `src/lib/oplever-mail.ts`. De gedeelde functie, de PDF en
de From-naam zijn niet aangeraakt.

- Ondertekening wordt nu los opgebouwd uit de profielvelden, niet meer uit `voet`:
  - persoonsregel = `naam` (val terug op bedrijfsnaam, dan "Keukenmontage")
  - daaronder, met witregel, de contactregel: bedrijfsnaam (alleen als die niet gelijk is aan de
    persoonsregel) · telefoon · e-mail
- From-naam bovenaan de mail blijft de afzender-kop (het bedrijf); daar klaagde niemand over.

Resultaat met Rein zijn profiel (naam + bedrijfsnaam beide gevuld):

```
Met vriendelijke groet,
Rein

BKM Keukenmontage  ·  0631665814  ·  R.k.zijlstra@gmail.com
```

## Toestand-matrix (waar getest op)

- bedrijf + naam: persoonsregel = naam, contactregel = bedrijf · tel · e-mail. Geen dubbeling.
- alleen bedrijf (naam leeg): persoonsregel = bedrijf, bedrijf valt uit de contactregel (niet herhaald),
  contactregel = tel · e-mail.
- alleen naam (geen bedrijf): persoonsregel = naam, contactregel = tel · e-mail.
- leeg profiel: neutrale "Keukenmontage", geen contactregel.

## Werkwijze / verificatie

Logica met unit-tests. `oplever-mail.test.ts` aangepast/uitgebreid (persoonsnaam + witregel + geen dubbele
bedrijfsnaam, plus de bedrijf-only-toestand). `npx vitest run src/lib/oplever-mail.test.ts
src/lib/mail.test.ts`: 23 groen. Lint schoon op de geraakte bestanden. Docstring bijgewerkt (From-naam en
ondertekening zijn nu bewust niet meer gelijk).

## Let op / open

- Dit raakt alleen **nieuwe** opleveringen. De al verstuurde Hoek-mail in de inbox blijft zoals hij is;
  die valt niet meer te wijzigen.
- Nog niet gepusht; e2e en push doet Rein zelf.
- Controleer dat in het monteur-profiel de naam ("Rein") echt gevuld is; de code toont wat daar staat.
