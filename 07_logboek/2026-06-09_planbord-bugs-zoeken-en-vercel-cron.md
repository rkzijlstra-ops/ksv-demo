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

## Aanvulling (late avond): dashboard-zoeker gelijkgetrokken

De dashboard-zoeker filterde al live, maar Rein vond de planbord-zoeker (compacte trefferlijst die je
aanklikt) prettiger. Gelijkgetrokken: onder het dashboard-zoekveld komt nu dezelfde dropdown-trefferlijst
(klant, referentie, status, monteur, datum); een klik opent direct de opdracht. De bestaande lijst en de
statusfilters blijven werken (optie "dropdown erbij, lijst blijft"). `zoekTreffers` puur + unit-tests.
490 unit-tests groen. Gepusht (`5280e1e`).

## Rapport-foto's (#1): strategie vastgelegd, bouw volgt

Voor de bouw eerst de strategie helder gemaakt (Rein wilde dat). Kerninzicht: de online-versie en de PDF
zijn geen concurrenten maar bedienen twee publieken, en allebei werken ze voor de klant (de keukenzaak):
- **Online rapport** = premium-gereedschap van de zaak zelf (login, grote klikbare foto's, video). Zit
  achter inloggen + RLS, dus alleen bruikbaar voor wie een account heeft (de zaak), niet de eind-klant.
- **PDF** = wat de zaak doorstuurt naar de eind-klant; draagt het briefhoofd van de zaak, dus het
  visitekaartje van de zaak richting háár klant. Daarom is de PDF goed maken óók waardevol.

Account-dilemma (zzp'er zonder account): conclusie = accounts voor wie het werk doet (monteur/zzp'er) en
voor de zaak; alleen de eind-klant blijft account-loos met de PDF.

Besloten: doorlopende nummering (1,2,3...) op foto's in PDF én web, plus een genummerde klikbare linklijst
onderaan de PDF (robuust; de "foto zelf klikbaar in PDF" is fijngevoelig in pdf-lib en blind lastig te
verifiëren). Nog te beslissen met Rein (morgen): (a) PDF-foto's groter maken? (b) een link naar het online
rapport in de mail zetten (verkooppunt, werkt alleen voor ingelogde zaken)?

## Open

- #1 rapport-foto's: bouwen zodra (a) en (b) hierboven beslist zijn.
- SMS live-test wacht nog op de CM.com productie-token (zie eerder logboek + geheugen).
