# Plan: betrouwbare oplever-mail + monteur-onboarding

Hoort bij `BRAINSTORM-MAIL-AFLEVERING.md`. Test-first. Werk op een eigen worktree/branch.
Volgorde project: branch -> test-first bouwen -> registers bij -> omgeving-test -> keuring Rein -> master.

Legenda status: [ ] open, [x] klaar (met datum/tijd).

## Setup

### T1: Worktree + branch
- Bestand: n.v.t. (git)
- Doen: `git worktree add C:/Users/rkzij/ksv-worktrees/mail-aflevering -b mail-aflevering`,
  `.env.local/.env.test/.env.demo-vercel/.env.preview` kopieren, `npm ci`.
- Verifieren: `git status` schoon, `npm run typecheck` groen.
- Tijd: 5 min — Status: [ ]

## Deel A: Reply-To per monteur

### T2: Helper bepaalReplyTo
- Bestand: `src/lib/reply-to.ts` (+ `src/lib/reply-to.test.ts`)
- Test eerst: `bepaalReplyTo("piet@bedrijf.nl", "antwoord@kluslus.nl")` -> monteur-mail;
  leeg/null -> fallback; ongeldig formaat -> fallback.
- Code: pure functie, geen DB.
- Verifieren: `npm run test:unit` groen.
- Tijd: 4 min — Status: [ ]

### T3: Reply-To toepassen in de oplever-mail
- Bestand: `src/lib/mail.ts`, `src/app/api/opdrachten/[id]/rapport/route.ts` (+ route-test)
- Test eerst: route-test bevestigt dat `resend.emails.send` wordt aangeroepen met
  `replyTo` = `afzender.email` als die er is, anders de globale fallback.
- Code: `verstuurOpleverRapport` neemt replyTo per verzending (afzender.email via bepaalReplyTo).
- Verifieren: route-test groen; bestaande mailtests blijven groen.
- Tijd: 5 min — Status: [ ]

## Deel B: Eerste-verzending-waarschuwing per domein

### T4: Helper isEersteVerzendingNaarDomein
- Bestand: `src/lib/verzend-domein.ts` (+ test)
- Test eerst: domein uit adres halen; geen eerdere verzendingen -> true; eerdere naar
  ander domein -> true; eerdere naar zelfde domein -> false; hoofdletters/spaties tolereren.
- Code: pure functie.
- Verifieren: `npm run test:unit` groen.
- Tijd: 4 min — Status: [ ]

### T5: DB-functie eerdere verzendingen naar domein
- Bestand: `src/lib/db.ts` (+ integratietest tegen test-DB)
- Test eerst: na een verzending naar `a@x.nl` geeft `eerdereVerzendingenNaarDomein("x.nl")`
  die rij; voor een vers domein leeg.
- Code: query op `rapport_verzendingen` met domein-filter (ilike op `naar`).
- Verifieren: integratietest groen tegen `.env.test`.
- Tijd: 5 min — Status: [ ]

### T6: Helper bouwWhatsappTekst
- Bestand: `src/lib/oplever-mail.ts` (+ test)
- Test eerst: tekst bevat klantnaam, referentie, `planning@kluslus.nl` en het verzoek om
  spam te checken; zonder contactnaam begint hij neutraal.
- Code: pure functie die de korte WhatsApp-tekst opbouwt.
- Verifieren: `npm run test:unit` groen.
- Tijd: 4 min — Status: [ ]

### T7: Component VerzendInfoBlok (inklapbaar)
- Bestand: `src/components/VerzendInfoBlok.tsx`
- Test eerst: (e2e dekt gedrag) — hier minimaal: rendert compacte regel; uitklappen toont
  waarschuwing + knoppen; eerste-keer-vlag toont de waarschuwingstekst, anders niet.
- Code: compacte regel (naar + datum) + pijltje; uitgeklapt waarschuwing, Kopieer bericht
  (hergebruik `KopieerKnop`), Opnieuw versturen. Prop `standaardOpen` (na versturen true).
- Verifieren: component rendert in app; e2e in T16.
- Tijd: 5 min — Status: [ ]

### T8: Blok tonen op monteur-kluspagina
- Bestand: `src/app/opdracht/[id]/page.tsx`
- Test eerst: e2e (T16).
- Code: laatste zaak-verzending van de klus ophalen + eerste-keer-vlag bepalen (T4+T5),
  `VerzendInfoBlok` tonen als er een verzending is.
- Verifieren: handmatig in dev + e2e T16.
- Tijd: 5 min — Status: [ ]

### T9: Blok tonen op kantoor-kluspagina
- Bestand: `src/app/dashboard/opdracht/[id]/page.tsx`
- Test eerst: e2e (T16).
- Code: zelfde blok, kantoor-variant.
- Verifieren: e2e T16.
- Tijd: 5 min — Status: [ ]

## Deel C: Opnieuw versturen (met adres-correctie)

### T10: Rapport-route accepteert adres-override
- Bestand: `src/app/api/opdrachten/[id]/rapport/route.ts` (+ route-test)
- Test eerst: POST met optioneel `naar` verstuurt naar dat adres i.p.v. het opgeslagen adres;
  zonder `naar` ongewijzigd gedrag.
- Code: optionele body `naar`, gevalideerd; valt terug op bestaande logica.
- Verifieren: route-test groen.
- Tijd: 5 min — Status: [ ]

### T11: Opnieuw versturen in het blok
- Bestand: `src/components/VerzendInfoBlok.tsx`
- Test eerst: e2e (T16).
- Code: adres-input voorgevuld met huidig adres + knop Opnieuw versturen -> POST naar route
  met `naar`; succes/fout-melding.
- Verifieren: e2e T16.
- Tijd: 5 min — Status: [ ]

## Deel D: Onboarding + afzendergegevens verplicht

### T12: Helper profielVolledig
- Bestand: `src/lib/profiel.ts` (+ test)
- Test eerst: profiel met naam+bedrijfsnaam+telefoon+contact_email -> volledig; mist er een
  -> onvolledig.
- Code: pure functie.
- Verifieren: `npm run test:unit` groen.
- Tijd: 3 min — Status: [ ]

### T13: Onboarding-pagina
- Bestand: `src/app/welkom/page.tsx` + `src/components/OnboardingForm.tsx`
- Test eerst: e2e (T14).
- Code: vier verplichte velden, formaat-validatie (mail + nl-mobiel), opslaan via
  `PATCH /api/mijn-gegevens`; pas door als alles geldig.
- Verifieren: handmatig in dev + e2e T14.
- Tijd: 5 min — Status: [ ]

### T14: Gate: onvolledig profiel -> onboarding
- Bestand: layout/wrapper voor monteur-routes (bv. `src/app/(monteur)/layout.tsx` of bestaande gate)
- Test eerst: e2e — nieuw monteur-account met leeg profiel wordt naar `/welkom` gestuurd;
  na invullen door naar de werkpool; `/welkom` zelf niet in de loop.
- Code: server-side check `profielVolledig`, redirect indien onvolledig.
- Verifieren: e2e groen.
- Tijd: 5 min — Status: [ ]

### T15: Welkom-stap met handleiding-knop
- Bestand: `src/app/welkom/page.tsx`
- Test eerst: e2e (T14) uitgebreid: na opslaan verschijnt knop naar `/handleiding`, overslaan mag.
- Code: tweede stap na opslaan, knop "Bekijk de handleiding" + "Naar de werkpool".
- Verifieren: e2e groen.
- Tijd: 4 min — Status: [ ]

## Afronding

### T16: E2e blok-gedrag (monteur + kantoor)
- Bestand: `e2e/...verzend-blok.spec.ts`
- Test: eerste verzending naar nieuw domein toont waarschuwing-blok (beide rollen); Opnieuw
  versturen met gecorrigeerd adres; tweede verzending naar zelfde domein zonder waarschuwing.
- Verifieren: `npm run test:e2e` groen.
- Tijd: 5 min — Status: [ ]

### T17: E2e-mail Reply-To (achter vlag)
- Bestand: bestaande e2e-mail-suite
- Test: echte mail, Reply-To = monteur-mail; met leeg profiel -> fallback.
- Verifieren: groen achter de mail-vlag.
- Tijd: 5 min — Status: [ ]

### T18: Registers bijwerken
- Bestand: `TESTDEKKING.md`, `TOESTANDEN.md`
- Doen: regels toevoegen voor Reply-To, eerste-verzending-blok, Opnieuw versturen, onboarding.
- Verifieren: registers kloppen met de tests.
- Tijd: 4 min — Status: [ ]

### T19: Volledige suite + naar omgeving-test, STOP voor keuring
- Doen: `rm -rf .next`, volledige suite, push branch, merge in `omgeving-test`, kluslus-test
  laten deployen. Daarna STOP en Rein vragen te keuren. Niet zelf naar master mergen.
- Verifieren: CI groen + kluslus-test draait; Rein keurt beide rollen.
- Tijd: 10 min — Status: [ ]
