# SMS bij versturen miste soms: race tussen inplannen-opslag en versturen

Datum: 2026-06-10

## Symptoom

Na het live zetten van SMS (zie `2026-06-10_sms-live-test-geslaagd.md`): annuleren/ontplannen smste
betrouwbaar, maar een **nieuwe opdracht versturen** gaf grillig geen SMS. De mail kwam wél. Soms kwam de
SMS de eerste keer "alsnog", daarna niet.

## Onderzoek (geen gok, bewijs verzameld)

- Profiel van de testmonteur "Mind" gecontroleerd in de productie-DB (met toestemming): telefoon
  `0631665814` (= op de Vercel-allowlist), `sms_werk_kritiek = true`. Dus nummer/toggle/allowlist goed —
  anders zou annuleren ook niet smsen.
- "Mail wel, SMS niet" wees richting de dispatcher `vuurAf`: de mail valt terug op `RAPPORT_EMAIL` als er
  geen monteur-koppeling is, de SMS-tak draait alleen als `toegewezen_aan` gezet is.
- Schone reproductie (slepen → versturen, niet terugslepen) + DB-snapshot op het juiste moment: opdracht
  6203 had toen `toegewezen_aan` = Mind's id en `verzonden_toegewezen_aan` = Mind's id, en de **SMS kwam
  wél binnen**. Daarmee was de oorzaak rond.

## Oorzaak

Bij inslepen (pool → cel) zet de planbord-client de kaart optimistisch op `concept_gepland` en slaat de
koppeling **op de achtergrond** op: `void fetch('/plannen')` (fire-and-forget). De verstuur-lijst
(`teVersturen`) en de knop "Verstuur naar monteurs" worden meteen actief. Verstuur je vóór die opslag klaar
is, dan leest de verstuur-route de opdracht nog zonder `toegewezen_aan`: de mail valt terug op het
standaardadres (komt aan), de SMS wordt overgeslagen. Een klassieke race; vandaar het grillige beeld.

## Fix

`src/components/PlanbordBord.tsx`: een set `opslaanBezig` houdt bij welke opdrachten nog een lopende
planning-opslag hebben. `teVersturen` sluit die uit, dus een opdracht is pas verstuurbaar als zijn
koppeling echt in de database staat. Toegepast op beide achtergrond-opslagen: `/plannen` (inslepen) en
`/verplaatsen` (verslepen). Elke fetch markeert de id bij start en haalt 'm weg in `finally`.

## Verificatie

- `tsc --noEmit`: 0. Lint op het bestand: 0. Unit-suite: 510 groen.
- UI-race niet los unit-getest (frontend-state); live bevestiging gebeurt in de app na deploy: snel slepen
  en direct versturen moet nu wél de SMS geven.

## Open

- Moet naar Vercel (deploy via push naar master) om in de live app te werken.
- Optionele hardening (later): de verstuur-route zou een opdracht zonder `toegewezen_aan` niet stil als
  "verstuurd naar monteur" moeten doorlaten; dat maakt zo'n geval zichtbaar i.p.v. een gemiste SMS.
