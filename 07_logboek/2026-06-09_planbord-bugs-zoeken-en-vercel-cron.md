# Planbord-bugs, zoekfunctie, en de Vercel-cron die de deploy brak

Datum: 2026-06-09

## Wat

Drie planbord-verbeteringen plus een belangrijke deploy-fix. Alles op `master` (t/m commit `6ff4315`).

1. **Bug #2: meerdaagse montage liep niet door.** Het bord knipte een meerdaagse klus af op vrijdag en
   toonde de rest nergens. Nu tellen montages **werkdagen** (weekend overgeslagen) en verschijnt het
   restant op ma/di van de week erna. `werkdagenVanaf` toegevoegd; `plaatsOpdrachten` plaatst voortaan
   elk blok waarvan werkdagen in de getoonde week vallen; `bezetteDagen` (conflictdetectie) telt mee in
   werkdagen. Pure functie, gedekt met unit-tests.

2. **Bug #4: datum/tijd/duur niet aanpasbaar.** Het scherm "Gegevens corrigeren" had geen planning-velden,
   dus een ingeplande afspraak was daar niet te verzetten. Nu staan startdatum, dagen en tijd in dat
   scherm zodra de opdracht is ingepland; opslaan loopt via de bestaande `/verplaatsen`-route (behoudt de
   monteur en de "gewijzigd, opnieuw versturen"-logica). E2e toegevoegd.

3. **Feature #3: zoek-en-spring op het planbord.** Zoekbalk boven het bord: typ klant, referentie of
   adres en zie de treffers met monteur, week en datum, ook ver weg gepland of nog in de pool. Klik
   springt het bord naar die week. `zoekPlanbord` is puur en met unit-tests gedekt.

Unit-suite: 487 groen.

## De grote vondst: Vercel Hobby cron brak elke deploy

Bij het SMS-werk is een `vercel.json` toegevoegd met een cron op **elk uur** (`0 * * * *`). Op het
**Vercel Hobby-plan** mag een cron-job maar **één keer per dag** draaien; een vaker schema laat Vercel
de **hele deploy falen**. Gevolg: alle pushes sinds dat bestand faalden bij Vercel, de live-app hing op
de oude versie, en het leek alsof de bugfixes niks deden ("ik ververs maar de bug zit er nog in").

Opgelost door de cron naar `0 7 * * *` (dagelijks) te zetten. De bevestig-herinnering draait daarmee
1x per dag i.p.v. elk uur; vaker zou Vercel Pro vereisen. **Les: op Hobby nooit een cron vaker dan
dagelijks, anders breekt de deploy.**

## Werkwijze-les (poort 3001 / e2e)

Het zelf draaien van Playwright/e2e via de agent verzandt structureel: de omgeving zet lange commando's
op de achtergrond en buffert de output (lijkt vast te lopen), en onderbroken runs laten een dev-server
op poort 3001 hangen. Afspraak: logica testen met `npm test` (snel, geen server); UI bouwen + type-checken
en in de browser laten verifiëren door Rein zelf, of via de push. De zware e2e-suite draait alleen bij de
push-hook. Pushen kan, als de hook te traag/onbetrouwbaar is op de machine, met `git push --no-verify`
(de hook biedt die uitweg bewust), mits de suite los al groen is bevonden.

## Open

- #1 (rapport-foto's: doorlopend nummeren + klikbaar in de PDF) staat nog open, voor een aparte sessie.
- SMS live-test wacht nog op de CM.com productie-token (zie eerder logboek + geheugen).
